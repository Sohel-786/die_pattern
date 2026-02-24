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
                Name = c.Name,
                IsActive = c.IsActive ? "Yes" : "No",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Companies");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "companies.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<MasterImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MasterImportDto>(stream);
                var validation = await ValidateCompanies(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = ex.Message }); }
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
                    var result = _excelService.ImportExcel<MasterImportDto>(stream);
                    var validation = await ValidateCompanies(result.Data);
                    var newCompanies = new List<Company>();

                    foreach (var validRow in validation.Valid)
                    {
                        newCompanies.Add(new Company
                        {
                            Name = validRow.Data.Name.Trim(),
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

        private async Task<ValidationResultDto<MasterImportDto>> ValidateCompanies(List<ExcelRow<MasterImportDto>> rows)
        {
            var validation = new ValidationResultDto<MasterImportDto>();
            var existingNames = await _context.Companies
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = item, Message = "Duplicate Name in file" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = item, Message = "Already exists in database" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetAll()
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var companies = await _context.Companies
                .OrderBy(c => c.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetActive()
        {
            var companies = await _context.Companies
                .Where(c => c.IsActive)
                .OrderBy(c => c.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Company>> { Data = companies });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> GetById(int id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound(new ApiResponse<Company> { Success = false, Message = "Company not found" });
            return Ok(new ApiResponse<Company> { Data = company });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Company>>> Create([FromBody] Company company)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            if (await _context.Companies.AnyAsync(c => c.Name.ToLower() == company.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });

            company.CreatedAt = DateTime.Now;
            company.UpdatedAt = DateTime.Now;
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Company> { Data = company });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> Update(int id, [FromBody] UpdateCompanyRequest request)
        {
            if (!await HasPermission("ManageCompany")) return Forbidden();

            var existing = await _context.Companies.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Company> { Success = false, Message = "Company not found" });

            if (request.Name != null)
            {
                if (await _context.Companies.AnyAsync(c => c.Id != id && c.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });
                existing.Name = request.Name.Trim();
            }
            if (request.Address != null) existing.Address = request.Address;
            if (request.LogoUrl != null) existing.LogoUrl = request.LogoUrl;
            if (request.GstNo != null) existing.GstNo = request.GstNo;
            if (request.GstDate.HasValue) existing.GstDate = request.GstDate;
            existing.IsActive = request.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Company> { Data = existing });
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
