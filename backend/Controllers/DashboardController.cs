using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("dashboard")]
    [ApiController]
    public class DashboardController : BaseController
    {
        public DashboardController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<object>>> GetMetrics()
        {
            var totalItems = await _context.Items.CountAsync(p => p.IsActive);
            var itemsAtVendor = await _context.Items.CountAsync(p => p.CurrentHolderType == HolderType.Vendor && p.IsActive);
            var itemsAtLocation = await _context.Items.CountAsync(p => p.CurrentHolderType == HolderType.Location && p.IsActive);
            
            var pendingPI = await _context.PurchaseIndents.CountAsync(pi => pi.Status == PurchaseIndentStatus.Pending);
            var pendingPO = await _context.PurchaseOrders.CountAsync(po => po.Status == PoStatus.Pending);

            var locationWiseCount = await _context.Locations
                .Select(l => new
                {
                    LocationName = l.Name,
                    Count = _context.Items.Count(p => p.CurrentLocationId == l.Id && p.IsActive)
                })
                .ToListAsync();

            var recentChanges = await _context.ItemChangeLogs
                .Include(l => l.Item)
                .OrderByDescending(l => l.CreatedAt)
                .Take(5)
                .Select(l => new {
                    l.Item!.MainPartName,
                    l.OldName,
                    l.NewName,
                    l.ChangeType,
                    l.CreatedAt
                })
                .ToListAsync();

            var recentSystemAdjustments = await _context.Movements
                .Include(m => m.Item)
                .Where(m => m.Type == MovementType.SystemReturn)
                .OrderByDescending(m => m.CreatedAt)
                .Take(5)
                .Select(m => new {
                    m.Item!.MainPartName,
                    m.Reason,
                    m.CreatedAt
                })
                .ToListAsync();

            var result = new
            {
                summary = new { 
                    total = totalItems, 
                    atVendor = itemsAtVendor, 
                    atLocation = itemsAtLocation,
                    pendingPI,
                    pendingPO
                },
                locationWiseCount,
                recentChanges,
                recentSystemAdjustments
            };

            return Ok(new ApiResponse<object> { Data = result });
        }
    }
}
