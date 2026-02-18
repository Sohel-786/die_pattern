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

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Company>>>> GetAll()
        {
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
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (await _context.Companies.AnyAsync(c => c.Name.ToLower() == company.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });

            company.CreatedAt = DateTime.Now;
            company.UpdatedAt = DateTime.Now;
            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Company> { Data = company });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Company>>> Update(int id, [FromBody] Company company)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var existing = await _context.Companies.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Company> { Success = false, Message = "Company not found" });

            if (await _context.Companies.AnyAsync(c => c.Id != id && c.Name.ToLower() == company.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Company> { Success = false, Message = "Company name already exists" });

            existing.Name = company.Name.Trim();
            existing.IsActive = company.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Company> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Company not found" });

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
