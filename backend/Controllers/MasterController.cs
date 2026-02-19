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

        // Item Types
        [HttpGet("item-types")]
        public async Task<IActionResult> GetItemTypes() => Ok(new { data = await _context.ItemTypes.ToListAsync() });

        [HttpPost("item-types")]
        public async Task<IActionResult> CreateItemType([FromBody] ItemType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.ItemTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("item-types/{id}")]
        public async Task<IActionResult> UpdateItemType(int id, [FromBody] ItemType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.ItemTypes.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("item-types/{id}")]
        public async Task<IActionResult> DeleteItemType(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.ItemTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Item Statuses
        [HttpGet("item-statuses")]
        public async Task<IActionResult> GetItemStatuses() => Ok(new { data = await _context.ItemStatuses.ToListAsync() });

        [HttpPost("item-statuses")]
        public async Task<IActionResult> CreateItemStatus([FromBody] ItemStatus item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            _context.ItemStatuses.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("item-statuses/{id}")]
        public async Task<IActionResult> UpdateItemStatus(int id, [FromBody] ItemStatus item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.ItemStatuses.FindAsync(id);
            if (existing == null) return NotFound();
            existing.Name = item.Name;
            existing.IsActive = item.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("item-statuses/{id}")]
        public async Task<IActionResult> DeleteItemStatus(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.ItemStatuses.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemStatuses.Remove(item);
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
