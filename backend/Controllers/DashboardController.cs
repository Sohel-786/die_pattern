using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var totalPatterns = await _context.PatternDies.CountAsync();
            var atVendor = await _context.PatternDies.CountAsync(p => p.CurrentVendorId != null);
            var inHouse = await _context.PatternDies.CountAsync(p => p.CurrentLocationId != null);
            
            var pendingPI = await _context.PurchaseIndents.CountAsync(p => p.Status == PIStatus.PENDING);
            var pendingPO = await _context.PurchaseOrders.CountAsync(p => p.Status == POStatus.PENDING);

            var locationWiseCount = await _context.Locations
                .Select(l => new
                {
                    LocationName = l.Name,
                    Count = l.PatternDies.Count()
                })
                .ToListAsync();

            var recentChanges = await _context.ChangeHistories
                .Include(c => c.PatternDie)
                .OrderByDescending(c => c.ChangedAt)
                .Take(5)
                .ToListAsync();

            var recentMovements = await _context.Movements
                .Include(m => m.PatternDie)
                .OrderByDescending(m => m.CreatedAt)
                .Take(5)
                .ToListAsync();

            return Ok(new
            {
                totalPatterns,
                atVendor,
                inHouse,
                pendingPI,
                pendingPO,
                locationWiseCount,
                recentChanges,
                recentMovements
            });
        }
    }
}
