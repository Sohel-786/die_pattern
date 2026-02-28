using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
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
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var totalItems = await _context.Items.CountAsync(p => p.LocationId == locationId && p.IsActive);
            var itemsAtVendor = await _context.Items.CountAsync(p => p.LocationId == locationId && p.CurrentProcess == ItemProcessState.Outward && p.IsActive);
            var itemsAtLocation = await _context.Items.CountAsync(p => p.LocationId == locationId && p.CurrentProcess == ItemProcessState.InStock && p.IsActive);
            var itemsNotInStock = await _context.Items.CountAsync(p => p.LocationId == locationId && p.CurrentProcess == ItemProcessState.NotInStock && p.IsActive);

            var pendingPI = await _context.PurchaseIndents.CountAsync(pi => pi.Status == PurchaseIndentStatus.Pending);
            var pendingPO = await _context.PurchaseOrders.CountAsync(po => po.LocationId == locationId && po.Status == PoStatus.Pending);

            var loc = await _context.Locations.FindAsync(locationId);
            var locationWiseCount = loc == null ? new List<object>() : new List<object> { new { LocationName = loc.Name, Count = await _context.Items.CountAsync(p => p.LocationId == locationId && p.CurrentLocationId == locationId && p.IsActive) } };

            var recentChanges = await _context.ItemChangeLogs
                .Include(l => l.Item)
                .Where(l => l.Item != null && l.Item.LocationId == locationId)
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

            var recentSystemAdjustments = new List<object>();

            var result = new
            {
                summary = new { 
                    total = totalItems, 
                    atVendor = itemsAtVendor, 
                    atLocation = itemsAtLocation,
                    notInStock = itemsNotInStock,
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
