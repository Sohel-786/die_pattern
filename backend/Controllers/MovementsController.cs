using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("movements")]
    [ApiController]
    public class MovementsController : BaseController
    {
        public MovementsController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetMovements(
            [FromQuery] int? itemId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var result = new List<MovementDto>();

            // 1. Initial Registrations (Birth of Item)
            var birthsQuery = _context.Items
                .Where(i => i.LocationId == locationId)
                .Include(i => i.Location)
                .Include(i => i.CurrentParty)
                .AsQueryable();

            var births = await birthsQuery.ToListAsync();
            foreach (var i in births)
            {
                result.Add(new MovementDto
                {
                    Id = -i.Id, // Use negative ID to distinguish from database movements if they existed
                    Type = "SystemReturn", 
                    ItemId = i.Id,
                    ItemName = i.CurrentName,
                    MainPartName = i.MainPartName,
                    TransactionNo = "INITIAL",
                    FromName = "N/A (System)",
                    ToName = i.CurrentProcess switch {
                        ItemProcessState.InStock => i.Location?.Name ?? "Primary Location",
                        ItemProcessState.Outward => i.CurrentParty?.Name ?? "Vendor",
                        _ => "Unallocated"
                    },
                    Remarks = "Initial master registration",
                    CreatedAt = i.CreatedAt,
                    IsQCPending = false,
                    IsQCApproved = true
                });
            }

            // 2. Inwards (Receipt from Vendor/Jobwork)
            var inwards = await _context.InwardLines
                .Include(l => l.Inward!)
                    .ThenInclude(i => i.Vendor)
                .Include(l => l.Inward!)
                    .ThenInclude(i => i.Location)
                .Include(l => l.Item)
                .Where(l => l.Inward!.LocationId == locationId && l.Inward.IsActive)
                .ToListAsync();

            foreach (var l in inwards)
            {
                result.Add(new MovementDto
                {
                    Id = 1000000 + l.Id, // Distinction
                    Type = "Inward",
                    ItemId = l.ItemId,
                    ItemName = l.Item?.CurrentName,
                    MainPartName = l.Item?.MainPartName,
                    TransactionNo = l.Inward?.InwardNo,
                    FromName = l.Inward?.Vendor?.Name ?? "External",
                    ToName = l.Inward?.Location?.Name ?? "Our Location",
                    Remarks = l.Remarks,
                    CreatedAt = l.Inward!.CreatedAt,
                    IsQCPending = l.IsQCPending,
                    IsQCApproved = l.IsQCApproved
                });
            }

            // 3. Outwards (Dispatch to Vendor/Jobwork)
            var outwards = await _context.OutwardLines
                .Include(l => l.Outward!)
                    .ThenInclude(o => o.Party)
                .Include(l => l.Outward!)
                    .ThenInclude(o => o.Location)
                .Include(l => l.Item)
                .Where(l => l.Outward!.LocationId == locationId && l.Outward.IsActive)
                .ToListAsync();

            foreach (var l in outwards)
            {
                result.Add(new MovementDto
                {
                    Id = 2000000 + l.Id,
                    Type = "Outward",
                    ItemId = l.ItemId,
                    ItemName = l.Item?.CurrentName,
                    MainPartName = l.Item?.MainPartName,
                    TransactionNo = l.Outward?.OutwardNo,
                    FromName = l.Outward?.Location?.Name ?? "Our Location",
                    ToName = l.Outward?.Party?.Name ?? "Vendor",
                    Remarks = l.Remarks,
                    CreatedAt = l.Outward!.CreatedAt,
                    IsQCPending = false,
                    IsQCApproved = true
                });
            }

            // Filtering
            var filtered = result.AsQueryable();
            if (itemId.HasValue) filtered = filtered.Where(m => m.ItemId == itemId.Value);
            if (startDate.HasValue) filtered = filtered.Where(m => m.CreatedAt >= startDate.Value.Date);
            if (endDate.HasValue) filtered = filtered.Where(m => m.CreatedAt < endDate.Value.Date.AddDays(1));

            var finalData = filtered.OrderByDescending(m => m.CreatedAt).ToList();
            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = finalData });
        }
    }
}
