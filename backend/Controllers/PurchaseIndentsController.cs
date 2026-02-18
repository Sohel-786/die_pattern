using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PurchaseIndentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGen;

        public PurchaseIndentsController(ApplicationDbContext context, ICodeGeneratorService codeGen)
        {
            _context = context;
            _codeGen = codeGen;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseIndent>>> GetIndents()
        {
            return await _context.PurchaseIndents
                .Include(pi => pi.Creator)
                .Include(pi => pi.Approver)
                .Include(pi => pi.Items)
                    .ThenInclude(i => i.PatternDie)
                .OrderByDescending(pi => pi.CreatedAt)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseIndent>> GetIndent(int id)
        {
            var pi = await _context.PurchaseIndents
                .Include(pi => pi.Creator)
                .Include(pi => pi.Approver)
                .Include(pi => pi.Items)
                    .ThenInclude(i => i.PatternDie)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pi == null) return NotFound();
            return pi;
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseIndent>> PostIndent(PurchaseIndent pi)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            pi.PINo = await _codeGen.GenerateCodeAsync("PI", "purchase_indents", "PINo");
            pi.CreatedBy = userId;
            pi.Status = PIStatus.PENDING;
            pi.CreatedAt = DateTime.Now;

            foreach (var item in pi.Items)
            {
                item.IsOrdered = false;
            }

            _context.PurchaseIndents.Add(pi);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetIndent), new { id = pi.Id }, pi);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveIndent(int id)
        {
            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            pi.Status = PIStatus.APPROVED;
            pi.ApprovedBy = userId;
            pi.ApprovedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(pi);
        }

        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectIndent(int id)
        {
            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            pi.Status = PIStatus.REJECTED;
            pi.ApprovedBy = userId;
            pi.ApprovedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(pi);
        }

        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<PIItem>>> GetPendingPIItems()
        {
            // Items that are approved but not yet ordered
            return await _context.PIItems
                .Include(i => i.PurchaseIndent)
                .Include(i => i.PatternDie)
                .Where(i => i.PurchaseIndent!.Status == PIStatus.APPROVED && !i.IsOrdered)
                .ToListAsync();
        }
    }
}
