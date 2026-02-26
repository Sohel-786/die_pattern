using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("companies")]
    [ApiController]
    public class CompaniesController : BaseController
    {
        private readonly IExcelService _excelService;

        public CompaniesController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var companies = await _context.Companies
                .OrderBy(c => c.Name)
                .ToListAsync();
            var data = companies.Select(c => new {
                c.Name,
                c.Address,
                c.GstNo,
                c.Pan,
                c.State,
                c.City,
                c.Pincode,
                c.Phone,
                c.Email,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Companies");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "companies.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<CompanyImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<CompanyImportDto>(stream);
                var validation = await ValidateCompanies(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<CompanyImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            if (file == null || file.Length == 0)
                return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var result = _excelService.ImportExcel<CompanyImportDto>(stream);
                    var validation = await ValidateCompanies(result.Data);
                    var newCompanies = new List<Company>();

                    foreach (var validRow in validation.Valid)
                    {
                        var d = validRow.Data;
                        newCompanies.Add(new Company
                        {
                            Name = d.Name.Trim(),
                            Address = d.Address?.Trim(),
                            GstNo = d.GstNo?.Trim(),
                            Pan = d.Pan?.Trim(),
                            State = d.State?.Trim(),
                            City = d.City?.Trim(),
                            Pincode = d.Pincode?.Trim(),
                            Phone = d.Phone?.Trim(),
                            Email = d.Email?.Trim(),
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }

                    if (newCompanies.Any())
                    {
                        _context.Companies.AddRange(newCompanies);
                        await _context.SaveChangesAsync();
                    }

                    var finalResult = new
                    {
                        imported = newCompanies.Count,
                        totalRows = result.TotalRows,
                        errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList()
                    };

                    return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newCompanies.Count} companies imported successfully" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" });
            }
        }

        private async Task<ValidationResultDto<CompanyImportDto>> ValidateCompanies(List<ExcelRow<CompanyImportDto>> rows)
        {
            var validation = new ValidationResultDto<CompanyImportDto>();
            var existingNames = await _context.Companies
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }
                if (string.IsNullOrWhiteSpace(item.Address))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Address is mandatory" });
                    continue;
                }
                if (string.IsNullOrWhiteSpace(item.GstNo))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "GST number is mandatory" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Duplicate Name in file" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Already exists in database" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpPost("upload-logo")]
        public async Task<ActionResult<ApiResponse<object>>> UploadLogo([FromForm] IFormFile? file)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var uploadFile = file ?? Request.Form.Files?.FirstOrDefault(f => f.Name == "file" || f.Name == "logo" || f.Length > 0);
            if (uploadFile == null || uploadFile.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file uploaded." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var ext = Path.GetExtension(uploadFile.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only image files (jpg, png, gif, webp) are allowed." });

            const long maxBytes = 5 * 1024 * 1024; // 5 MB
            if (uploadFile.Length > maxBytes)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "File size must be under 5 MB." });

            try
            {
                var root = Directory.GetCurrentDirectory();
                var dir = Path.Combine(root, "wwwroot", "storage", "company-logos");
                Directory.CreateDirectory(dir);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.Combine(dir, fileName);
                await using (var stream = new FileStream(filePath, FileMode.Create))
                    await uploadFile.CopyToAsync(stream);
                var url = $"/storage/company-logos/{fileName}";
                return Ok(new ApiResponse<object> { Data = new { logoUrl = url }, Message = "Logo uploaded." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<CompanyDto>>>> GetAll()
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var companyIds = allowed.Select(x => x.companyId).ToHashSet();
            var companies = await _context.Companies
                .Where(c => companyIds.Contains(c.Id))
                .OrderBy(c => c.Name)
                .Select(c => new CompanyDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    Pan = c.Pan,
                    State = c.State,
                    City = c.City,
                    Pincode = c.Pincode,
                    Phone = c.Phone,
                    Email = c.Email,
                    LogoUrl = c.LogoUrl,
                    GstNo = c.GstNo,
                    GstDate = c.GstDate,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<CompanyDto>> { Data = companies });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<CompanyDto>>>> GetActive()
        {
            var allowed = await GetAllowedLocationIdsAsync();
            var companyIds = allowed.Select(x => x.companyId).ToHashSet();
            var companies = await _context.Companies
                .Where(c => companyIds.Contains(c.Id) && c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new CompanyDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    Pan = c.Pan,
                    State = c.State,
                    City = c.City,
                    Pincode = c.Pincode,
                    Phone = c.Phone,
                    Email = c.Email,
                    LogoUrl = c.LogoUrl,
                    GstNo = c.GstNo,
                    GstDate = c.GstDate,
                    IsActive = c.IsActive,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<CompanyDto>> { Data = companies });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<CompanyDto>>> GetById(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound(new ApiResponse<CompanyDto> { Success = false, Message = "Company not found" });
            var dto = new CompanyDto
            {
                Id = company.Id,
                Name = company.Name,
                Address = company.Address,
                Pan = company.Pan,
                State = company.State,
                City = company.City,
                Pincode = company.Pincode,
                Phone = company.Phone,
                Email = company.Email,
                LogoUrl = company.LogoUrl,
                GstNo = company.GstNo,
                GstDate = company.GstDate,
                IsActive = company.IsActive,
                CreatedAt = company.CreatedAt,
                UpdatedAt = company.UpdatedAt
            };
            return Ok(new ApiResponse<CompanyDto> { Data = dto });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<CompanyDto>>> Create([FromBody] CreateCompanyRequest request)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Company name is required" });
            if (string.IsNullOrWhiteSpace(request.Address))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Address is required" });
            if (string.IsNullOrWhiteSpace(request.GstNo))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "GST number is required" });

            if (await _context.Companies.AnyAsync(c => c.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Company name already exists" });

            var company = new Company
            {
                Name = request.Name.Trim(),
                Address = request.Address.Trim(),
                GstNo = request.GstNo.Trim(),
                Pan = request.Pan?.Trim(),
                State = request.State?.Trim(),
                City = request.City?.Trim(),
                Pincode = request.Pincode?.Trim(),
                Phone = request.Phone?.Trim(),
                Email = request.Email?.Trim(),
                LogoUrl = request.LogoUrl?.Trim(),
                GstDate = request.GstDate,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            var dto = new CompanyDto
            {
                Id = company.Id,
                Name = company.Name,
                Address = company.Address,
                Pan = company.Pan,
                State = company.State,
                City = company.City,
                Pincode = company.Pincode,
                Phone = company.Phone,
                Email = company.Email,
                LogoUrl = company.LogoUrl,
                GstNo = company.GstNo,
                GstDate = company.GstDate,
                IsActive = company.IsActive,
                CreatedAt = company.CreatedAt,
                UpdatedAt = company.UpdatedAt
            };
            return StatusCode(201, new ApiResponse<CompanyDto> { Data = dto });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<CompanyDto>>> Update(int id, [FromBody] UpdateCompanyRequest request)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var existing = await _context.Companies.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<CompanyDto> { Success = false, Message = "Company not found" });

            if (request.Name != null)
            {
                if (await _context.Companies.AnyAsync(c => c.Id != id && c.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Company name already exists" });
                existing.Name = request.Name.Trim();
            }
            if (request.Address != null) existing.Address = request.Address.Trim();
            if (request.GstNo != null) existing.GstNo = request.GstNo.Trim();
            if (request.Pan != null) existing.Pan = request.Pan.Trim();
            if (request.State != null) existing.State = request.State.Trim();
            if (request.City != null) existing.City = request.City.Trim();
            if (request.Pincode != null) existing.Pincode = request.Pincode.Trim();
            if (request.Phone != null) existing.Phone = request.Phone.Trim();
            if (request.Email != null) existing.Email = request.Email.Trim();
            if (request.LogoUrl != null) existing.LogoUrl = request.LogoUrl;
            if (request.GstDate.HasValue) existing.GstDate = request.GstDate;
            existing.IsActive = request.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            var dto = new CompanyDto
            {
                Id = existing.Id,
                Name = existing.Name,
                Address = existing.Address,
                Pan = existing.Pan,
                State = existing.State,
                City = existing.City,
                Pincode = existing.Pincode,
                Phone = existing.Phone,
                Email = existing.Email,
                LogoUrl = existing.LogoUrl,
                GstNo = existing.GstNo,
                GstDate = existing.GstDate,
                IsActive = existing.IsActive,
                CreatedAt = existing.CreatedAt,
                UpdatedAt = existing.UpdatedAt
            };
            return Ok(new ApiResponse<CompanyDto> { Data = dto });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Company not found" });

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
