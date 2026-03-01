using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using System.Text.RegularExpressions;

namespace net_backend.Controllers
{
    [Route("companies")]
    [ApiController]
    public class CompaniesController : BaseController
    {
        private readonly IExcelService _excelService;
        private readonly IWebHostEnvironment _env;

        public CompaniesController(ApplicationDbContext context, IExcelService excelService, IWebHostEnvironment env) : base(context)
        {
            _excelService = excelService;
            _env = env;
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
                GstDate = c.GstDate.HasValue ? c.GstDate.Value.ToString("yyyy-MM-dd") : "",
                c.State,
                c.City,
                c.Pincode,
                c.ContactPerson,
                c.ContactNumber,
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
                            GstNo = d.GstNo?.Trim().ToUpper(),
                            State = d.State?.Trim(),
                            City = d.City?.Trim(),
                            Pincode = d.Pincode?.Trim(),
                            ContactPerson = d.ContactPerson?.Trim(),
                            ContactNumber = d.ContactNumber?.Trim(),
                            GstDate = d.GstDate,
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
            var gstRegex = new Regex(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");

            // Load all existing company names and GST numbers for dedup checks
            var existingNames = await _context.Companies
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var existingGstMap = await _context.Companies
                .Where(c => c.GstNo != null)
                .Select(c => new { GstNo = c.GstNo!.ToUpper(), c.Name })
                .ToDictionaryAsync(c => c.GstNo, c => c.Name);

            var processedNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var processedGsts  = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var phoneRegex = new Regex(@"^[6-9]\d{9}$");

            foreach (var row in rows)
            {
                var item = row.Data;

                // ── Mandatory field checks ────────────────────────────────────
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Company Name is mandatory." });
                    continue;
                }
                if (string.IsNullOrWhiteSpace(item.Address))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Address is mandatory." });
                    continue;
                }
                if (string.IsNullOrWhiteSpace(item.GstNo))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "GST No. is mandatory." });
                    continue;
                }
                if (!item.GstDate.HasValue)
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "GST Date is mandatory." });
                    continue;
                }

                // ── Contact Number validation (Indian 10-digit) ──────────────
                if (!string.IsNullOrWhiteSpace(item.ContactNumber) && !phoneRegex.IsMatch(item.ContactNumber.Trim()))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Invalid Contact Number. Must be a valid 10-digit Indian number." });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();
                var gstNorm   = item.GstNo.Trim().ToUpper();

                // ── GST format validation ───────────────────────────────────
                if (!gstRegex.IsMatch(gstNorm))
                {
                    validation.Invalid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"Invalid GST format '{gstNorm}'. Must be a valid 15-character Indian GSTIN (e.g. 24AABCU9603R1ZA)." });
                    continue;
                }

                // ── Duplicate company name in file ───────────────────────────
                if (processedNames.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = "Duplicate company name in file." });
                    continue;
                }

                // ── Duplicate GST in file ──────────────────────────────────
                if (processedGsts.Contains(gstNorm))
                {
                    validation.Duplicates.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"Duplicate GST No. '{gstNorm}' in file." });
                    continue;
                }

                // ── Company name already exists in DB ──────────────────────────
                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"Company '{item.Name.Trim()}' already exists." });
                    processedNames.Add(nameLower);
                    continue;
                }

                // ── GST already exists in DB ─────────────────────────────────
                if (existingGstMap.TryGetValue(gstNorm, out var existingOwner))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item, Message = $"GST No. '{gstNorm}' is already registered under company '{existingOwner}'." });
                    processedGsts.Add(gstNorm);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<CompanyImportDto> { Row = row.RowNumber, Data = item });
                processedNames.Add(nameLower);
                processedGsts.Add(gstNorm);
            }

            return validation;
        }

        [HttpPost("upload-logo")]
        public async Task<ActionResult<ApiResponse<object>>> UploadLogo([FromForm] IFormFile? file, [FromQuery] string? companyName)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var uploadFile = file ?? Request.Form.Files?.FirstOrDefault(f => f.Name == "file" || f.Name == "logo" || f.Length > 0);
            if (uploadFile == null || uploadFile.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file uploaded." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var ext = Path.GetExtension(uploadFile.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only image files (jpg, png, gif, webp) are allowed." });

            const long maxBytes = 5 * 1024 * 1024;
            if (uploadFile.Length > maxBytes)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "File size must be under 5 MB." });

            try
            {
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                // Structured path: wwwroot/storage/company-logos/{companyName}/
                var safeName = string.IsNullOrWhiteSpace(companyName)
                    ? "unknown"
                    : string.Concat(companyName.Trim().Split(Path.GetInvalidFileNameChars())).Trim();
                var dir = Path.Combine(root, "wwwroot", "storage", "company-logos", safeName);
                Directory.CreateDirectory(dir);
                var fileName = $"logo{ext}";
                var filePath = Path.GetFullPath(Path.Combine(dir, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid file path." });
                await using (var stream = new FileStream(filePath, FileMode.Create))
                    await uploadFile.CopyToAsync(stream);
                // Append cache-buster timestamp so the browser doesn't show stale image
                var url = $"/storage/company-logos/{safeName}/{fileName}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
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
            var companies = await _context.Companies
                .OrderBy(c => c.Name)
                .Select(c => new CompanyDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    State = c.State,
                    City = c.City,
                    Pincode = c.Pincode,
                    ContactPerson = c.ContactPerson,
                    ContactNumber = c.ContactNumber,
                    LogoUrl = c.LogoUrl,
                    GstNo = c.GstNo,
                    GstDate = c.GstDate,
                    UseAsParty = c.UseAsParty,
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
            var companies = await _context.Companies
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .Select(c => new CompanyDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    Address = c.Address,
                    State = c.State,
                    City = c.City,
                    Pincode = c.Pincode,
                    ContactPerson = c.ContactPerson,
                    ContactNumber = c.ContactNumber,
                    LogoUrl = c.LogoUrl,
                    GstNo = c.GstNo,
                    GstDate = c.GstDate,
                    UseAsParty = c.UseAsParty,
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
                State = company.State,
                City = company.City,
                Pincode = company.Pincode,
                ContactPerson = company.ContactPerson,
                ContactNumber = company.ContactNumber,
                LogoUrl = company.LogoUrl,
                GstNo = company.GstNo,
                GstDate = company.GstDate,
                UseAsParty = company.UseAsParty,
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
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"Company name '{request.Name}' already exists in Company Master." });

            if (await _context.Parties.AnyAsync(p => p.Name.ToLower() == request.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"A Party with the name '{request.Name}' already exists in Party Master. Please use a unique name." });

            // ── GST format + cross-master uniqueness ──────────────────────────
            var gstNorm = request.GstNo.Trim().ToUpper();
            var gstRegex = new Regex(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");
            if (!gstRegex.IsMatch(gstNorm))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"Invalid GST number format '{gstNorm}'. A valid Indian GSTIN is exactly 15 alphanumeric characters." });

            // Check in Companies
            if (await _context.Companies.AnyAsync(c => c.GstNo != null && c.GstNo.ToUpper() == gstNorm))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"GST No. '{gstNorm}' is already registered with another company." });

            // Check in Parties
            var existingPartyGst = await _context.Parties.FirstOrDefaultAsync(p => p.GstNo != null && p.GstNo.ToUpper() == gstNorm);
            if (existingPartyGst != null)
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"GST No. '{gstNorm}' is already assigned to party '{existingPartyGst.Name}' in Party Master." });

            if (request.UseAsParty)
            {
                if (string.IsNullOrWhiteSpace(request.ContactPerson))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Contact Person is mandatory when 'Use as Party' is enabled." });
                if (string.IsNullOrWhiteSpace(request.ContactNumber))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Contact Number is mandatory when 'Use as Party' is enabled." });
            }

            // ── Phone number validation ───────────────────────────────────
            var phoneRegex = new Regex(@"^[6-9]\d{9}$");
            if (!string.IsNullOrWhiteSpace(request.ContactNumber) && !phoneRegex.IsMatch(request.ContactNumber.Trim()))
                return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Invalid Contact Number format. Must be a 10-digit numeric value starting with 6-9." });

            var company = new Company
            {
                Name = request.Name.Trim(),
                Address = request.Address.Trim(),
                GstNo = gstNorm,
                State = request.State?.Trim(),
                City = request.City?.Trim(),
                Pincode = request.Pincode?.Trim(),
                ContactPerson = request.ContactPerson?.Trim(),
                ContactNumber = request.ContactNumber?.Trim(),
                LogoUrl = request.LogoUrl?.Trim(),
                GstDate = request.GstDate,
                UseAsParty = request.UseAsParty,
                IsActive = request.IsActive,
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
                State = company.State,
                City = company.City,
                Pincode = company.Pincode,
                ContactPerson = company.ContactPerson,
                ContactNumber = company.ContactNumber,
                LogoUrl = company.LogoUrl,
                GstNo = company.GstNo,
                GstDate = company.GstDate,
                UseAsParty = company.UseAsParty,
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
                var nameTrimmed = request.Name.Trim();
                if (await _context.Companies.AnyAsync(c => c.Id != id && c.Name.ToLower() == nameTrimmed.ToLower()))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"Company name '{nameTrimmed}' already exists in Company Master." });
                
                if (await _context.Parties.AnyAsync(p => p.Name.ToLower() == nameTrimmed.ToLower()))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"A Party with the name '{nameTrimmed}' already exists in Party Master." });

                existing.Name = nameTrimmed;
            }
            if (request.Address != null) existing.Address = request.Address.Trim();
            
            // ── GST format + global uniqueness ──────────────────────────────
            if (request.GstNo != null)
            {
                var gstNorm = request.GstNo.Trim().ToUpper();
                var gstRegex = new Regex(@"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$");
                if (!gstRegex.IsMatch(gstNorm))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"Invalid GST number format '{gstNorm}'. A valid Indian GSTIN is 15 alphanumeric characters." });

                // Check in Companies
                if (await _context.Companies.AnyAsync(c => c.Id != id && c.GstNo != null && c.GstNo.ToUpper() == gstNorm))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"GST No. '{gstNorm}' is already registered with another company." });
                
                // Check in Parties
                var existingPartyGst = await _context.Parties.FirstOrDefaultAsync(p => p.GstNo != null && p.GstNo.ToUpper() == gstNorm);
                if (existingPartyGst != null)
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = $"GST No. '{gstNorm}' is already assigned to party '{existingPartyGst.Name}' in Party Master." });

                existing.GstNo = gstNorm;
            }

            if (request.State != null) existing.State = request.State.Trim();
            if (request.City != null) existing.City = request.City.Trim();
            if (request.Pincode != null) existing.Pincode = request.Pincode.Trim();
            if (request.ContactPerson != null) existing.ContactPerson = request.ContactPerson.Trim();
            if (request.GstDate.HasValue) existing.GstDate = request.GstDate;
            if (request.LogoUrl != null) existing.LogoUrl = request.LogoUrl;

            // ── Phone number validation ───────────────────────────────────
            if (request.ContactNumber != null)
            {
                var phoneNorm = request.ContactNumber.Trim();
                var phoneRegex = new Regex(@"^[6-9]\d{9}$");
                if (!string.IsNullOrWhiteSpace(phoneNorm) && !phoneRegex.IsMatch(phoneNorm))
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Invalid Contact Number format. Must be a 10-digit numeric value starting with 6-9." });
                
                existing.ContactNumber = phoneNorm;
            }

            // ── UseAsParty validation + logic ──────────────────────────────
            if (request.UseAsParty.HasValue || existing.UseAsParty)
            {
                var effectiveUseAsParty = request.UseAsParty ?? existing.UseAsParty;

                if (existing.UseAsParty && request.UseAsParty.HasValue && !request.UseAsParty.Value)
                    return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Existing 'Use as Party' status cannot be disabled once enabled." });

                if (effectiveUseAsParty)
                {
                    if (string.IsNullOrWhiteSpace(existing.ContactPerson))
                        return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Contact Person is mandatory when 'Use as Party' is enabled." });
                    if (string.IsNullOrWhiteSpace(existing.ContactNumber))
                        return BadRequest(new ApiResponse<CompanyDto> { Success = false, Message = "Contact Number is mandatory when 'Use as Party' is enabled." });
                }
                
                if (request.UseAsParty.HasValue)
                    existing.UseAsParty = request.UseAsParty.Value;
            }

            existing.IsActive = request.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            var dto = new CompanyDto
            {
                Id = existing.Id,
                Name = existing.Name,
                Address = existing.Address,
                State = existing.State,
                City = existing.City,
                Pincode = existing.Pincode,
                ContactPerson = existing.ContactPerson,
                ContactNumber = existing.ContactNumber,
                LogoUrl = existing.LogoUrl,
                GstNo = existing.GstNo,
                GstDate = existing.GstDate,
                UseAsParty = existing.UseAsParty,
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
