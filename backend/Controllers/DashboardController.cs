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
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var totalItems = await _context.Items.CountAsync(p => allowedLocationIds.Contains(p.LocationId ?? 0) && p.IsActive);
            var itemsAtVendor = await _context.Items.CountAsync(p => allowedLocationIds.Contains(p.LocationId ?? 0) && (p.CurrentProcess == ItemProcessState.InJobwork || p.CurrentProcess == ItemProcessState.AtVendor) && p.IsActive);
            var itemsAtLocation = await _context.Items.CountAsync(p => allowedLocationIds.Contains(p.LocationId ?? 0) && p.CurrentProcess == ItemProcessState.InStock && p.IsActive);
            var itemsNotInStock = await _context.Items.CountAsync(p => allowedLocationIds.Contains(p.LocationId ?? 0) && p.CurrentProcess == ItemProcessState.NotInStock && p.IsActive);

            var pendingPI = await _context.PurchaseIndents.CountAsync(pi => pi.Status == PurchaseIndentStatus.Pending && pi.IsActive);
            var pendingPO = await _context.PurchaseOrders.CountAsync(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value) && po.Status == PoStatus.Pending && po.IsActive);

            var locations = await _context.Locations
                .Where(l => allowedLocationIds.Contains(l.Id) && l.IsActive)
                .OrderBy(l => l.Name)
                .Select(l => new { l.Id, l.Name })
                .ToListAsync();

            var locationWiseCount = new List<object>();
            foreach (var loc in locations)
            {
                var count = await _context.Items.CountAsync(p => p.LocationId == loc.Id && p.IsActive);
                locationWiseCount.Add(new { locationName = loc.Name, count });
            }

            var recentChanges = await _context.ItemChangeLogs
                .Include(l => l.Item)
                .Where(l => l.Item != null && l.Item.LocationId != null && allowedLocationIds.Contains(l.Item.LocationId.Value))
                .OrderByDescending(l => l.CreatedAt)
                .Take(10)
                .Select(l => new
                {
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
                summary = new
                {
                    total = totalItems,
                    atVendor = itemsAtVendor,
                    atLocation = itemsAtLocation,
                    notInStock = itemsNotInStock,
                    pendingPI,
                    pendingPO
                },
                locationWiseCount,
                recentChanges,
                recentChangesCount = recentChanges.Count,
                recentSystemAdjustments
            };

            return Ok(new ApiResponse<object> { Data = result });
        }

        /// <summary>Items currently at vendor (InJobwork or AtVendor) for dashboard drill-down.</summary>
        [HttpGet("items-at-vendor")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemsAtVendor([FromQuery] string? search)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.Items
                .AsNoTracking()
                .Where(p => p.LocationId != null && allowedLocationIds.Contains(p.LocationId.Value)
                    && (p.CurrentProcess == ItemProcessState.InJobwork || p.CurrentProcess == ItemProcessState.AtVendor)
                    && p.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    (p.MainPartName != null && p.MainPartName.ToLower().Contains(term)) ||
                    (p.CurrentName != null && p.CurrentName.ToLower().Contains(term)) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(term)));
            }

            var list = await query
                .OrderBy(p => p.MainPartName)
                .Select(p => new
                {
                    p.Id,
                    p.MainPartName,
                    p.CurrentName,
                    p.DrawingNo,
                    p.CurrentProcess,
                    locationName = p.Location != null ? p.Location.Name : (string?)null
                })
                .Take(200)
                .ToListAsync();

            return Ok(new ApiResponse<object> { Data = list });
        }

        /// <summary>Pending PIs and POs for dashboard drill-down.</summary>
        [HttpGet("pending-pi-po")]
        public async Task<ActionResult<ApiResponse<object>>> GetPendingPiPo()
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var pendingPIs = await _context.PurchaseIndents
                .AsNoTracking()
                .Where(pi => pi.Status == PurchaseIndentStatus.Pending && pi.IsActive)
                .OrderByDescending(pi => pi.CreatedAt)
                .Take(50)
                .Select(pi => new { pi.Id, pi.PiNo, pi.Type, pi.Status, pi.CreatedAt })
                .ToListAsync();

            var pendingPOs = await _context.PurchaseOrders
                .AsNoTracking()
                .Where(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value) && po.Status == PoStatus.Pending && po.IsActive)
                .OrderByDescending(po => po.CreatedAt)
                .Take(50)
                .Select(po => new { po.Id, po.PoNo, po.Status, po.CreatedAt })
                .ToListAsync();

            return Ok(new ApiResponse<object> { Data = new { pendingIndents = pendingPIs, pendingOrders = pendingPOs } });
        }
    }
}
