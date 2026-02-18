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
            var totalPatterns = await _context.PatternDies.CountAsync(p => p.IsActive);
            var patternsAtVendor = await _context.PatternDies.CountAsync(p => p.CurrentHolderType == HolderType.Vendor && p.IsActive);
            var patternsAtLocation = await _context.PatternDies.CountAsync(p => p.CurrentHolderType == HolderType.Location && p.IsActive);
            
            var pendingPI = await _context.PurchaseIndents.CountAsync(pi => pi.Status == PiStatus.Pending);
            var pendingPO = await _context.PurchaseOrders.CountAsync(po => po.Status == PoStatus.Pending);

            var locationWiseCount = await _context.Locations
                .Select(l => new
                {
                    LocationName = l.Name,
                    Count = _context.PatternDies.Count(p => p.CurrentLocationId == l.Id && p.IsActive)
                })
                .ToListAsync();

            var recentChanges = await _context.PatternChangeLogs
                .Include(l => l.PatternDie)
                .OrderByDescending(l => l.CreatedAt)
                .Take(5)
                .Select(l => new {
                    l.PatternDie!.MainPartName,
                    l.OldName,
                    l.NewName,
                    l.ChangeType,
                    l.CreatedAt
                })
                .ToListAsync();

            var recentSystemAdjustments = await _context.Movements
                .Include(m => m.PatternDie)
                .Where(m => m.Type == MovementType.SystemReturn)
                .OrderByDescending(m => m.CreatedAt)
                .Take(5)
                .Select(m => new {
                    m.PatternDie!.MainPartName,
                    m.Reason,
                    m.CreatedAt
                })
                .ToListAsync();

            var result = new
            {
                summary = new { 
                    total = totalPatterns, 
                    atVendor = patternsAtVendor, 
                    atLocation = patternsAtLocation,
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
