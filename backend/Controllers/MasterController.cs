using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

namespace net_backend.Controllers
{
    [ApiController]
    [Route("masters")]
    public class MasterController : BaseController
    {
        public MasterController(ApplicationDbContext context) : base(context) { }

        // Pattern Types
        [HttpGet("pattern-types")]
        public async Task<IActionResult> GetPatternTypes() => Ok(new { data = await _context.PatternTypes.ToListAsync() });

        [HttpPost("pattern-types")]
        public async Task<IActionResult> CreatePatternType([FromBody] PatternType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.PatternTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("pattern-types/{id}")]
        public async Task<IActionResult> UpdatePatternType(int id, [FromBody] PatternType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.PatternTypes.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("pattern-types/{id}")]
        public async Task<IActionResult> DeletePatternType(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.PatternTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.PatternTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Pattern Statuses
        [HttpGet("pattern-statuses")]
        public async Task<IActionResult> GetPatternStatuses() => Ok(new { data = await _context.PatternStatuses.ToListAsync() });

        [HttpPost("pattern-statuses")]
        public async Task<IActionResult> CreatePatternStatus([FromBody] PatternStatus item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.PatternStatuses.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("pattern-statuses/{id}")]
        public async Task<IActionResult> UpdatePatternStatus(int id, [FromBody] PatternStatus item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.PatternStatuses.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("pattern-statuses/{id}")]
        public async Task<IActionResult> DeletePatternStatus(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.PatternStatuses.FindAsync(id);
            if (item == null) return NotFound();
            _context.PatternStatuses.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Materials
        [HttpGet("materials")]
        public async Task<IActionResult> GetMaterials() => Ok(new { data = await _context.Materials.ToListAsync() });

        [HttpPost("materials")]
        public async Task<IActionResult> CreateMaterial([FromBody] Material item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.Materials.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("materials/{id}")]
        public async Task<IActionResult> UpdateMaterial(int id, [FromBody] Material item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.Materials.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("materials/{id}")]
        public async Task<IActionResult> DeleteMaterial(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.Materials.FindAsync(id);
            if (item == null) return NotFound();
            _context.Materials.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Owner Types
        [HttpGet("owner-types")]
        public async Task<IActionResult> GetOwnerTypes() => Ok(new { data = await _context.OwnerTypes.ToListAsync() });

        [HttpPost("owner-types")]
        public async Task<IActionResult> CreateOwnerType([FromBody] OwnerType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.OwnerTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("owner-types/{id}")]
        public async Task<IActionResult> UpdateOwnerType(int id, [FromBody] OwnerType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.OwnerTypes.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("owner-types/{id}")]
        public async Task<IActionResult> DeleteOwnerType(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.OwnerTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.OwnerTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }
    }
}
