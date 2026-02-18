using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("locations")]
    [ApiController]
    public class LocationsController : BaseController
    {
        public LocationsController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll()
        {
            var locations = await _context.Locations
                .Include(l => l.Company)
                .Select(l => new {
                    l.Id,
                    l.Name,
                    l.CompanyId,
                    CompanyName = l.Company != null ? l.Company.Name : "",
                    l.IsActive,
                    l.CreatedAt
                })
                .OrderBy(l => l.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = locations });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Location>>>> GetActive()
        {
            var locations = await _context.Locations
                .Where(l => l.IsActive)
                .OrderBy(l => l.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Location>> { Data = locations });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Location>>> Create([FromBody] Location location)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            location.CreatedAt = DateTime.Now;
            location.UpdatedAt = DateTime.Now;
            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Location> { Data = location });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> Update(int id, [FromBody] Location location)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var existing = await _context.Locations.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Location> { Success = false, Message = "Location not found" });

            existing.Name = location.Name.Trim();
            existing.CompanyId = location.CompanyId;
            existing.IsActive = location.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Location> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var location = await _context.Locations.FindAsync(id);
            if (location == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Location not found" });

            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
