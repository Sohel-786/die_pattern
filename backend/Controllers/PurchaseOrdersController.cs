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
    public class PurchaseOrdersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGen;

        public PurchaseOrdersController(ApplicationDbContext context, ICodeGeneratorService codeGen)
        {
            _context = context;
            _codeGen = codeGen;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseOrder>>> GetOrders()
        {
            return await _context.PurchaseOrders
                .Include(po => po.Vendor)
                .Include(po => po.Creator)
                .Include(po => po.Approver)
                .Include(po => po.Items)
                    .ThenInclude(i => i.PIItem)
                        .ThenInclude(pii => pii!.PatternDie)
                .OrderByDescending(po => po.CreatedAt)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseOrder>> GetOrder(int id)
        {
            var po = await _context.PurchaseOrders
                .Include(po => po.Vendor)
                .Include(po => po.Creator)
                .Include(po => po.Approver)
                .Include(po => po.Items)
                    .ThenInclude(i => i.PIItem)
                        .ThenInclude(pii => pii!.PatternDie)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (po == null) return NotFound();
            return po;
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseOrder>> PostOrder(PurchaseOrder po)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            po.PONo = await _codeGen.GenerateCodeAsync("PO", "purchase_orders", "PONo");
            po.CreatedBy = userId;
            po.Status = POStatus.PENDING;
            po.CreatedAt = DateTime.Now;

            foreach (var item in po.Items)
            {
                var piItem = await _context.PIItems.FindAsync(item.PIItemId);
                if (piItem != null)
                {
                    piItem.IsOrdered = true;
                }
                item.IsReceived = false;
                item.IsQCApproved = false;
            }

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOrder), new { id = po.Id }, po);
        }

        [HttpPost("{id}/approve")]
        public async Task<IActionResult> ApproveOrder(int id)
        {
            var po = await _context.PurchaseOrders.FindAsync(id);
            if (po == null) return NotFound();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            po.Status = POStatus.APPROVED;
            po.ApprovedBy = userId;
            po.ApprovedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(po);
        }

        [HttpGet("pending-receipt")]
        public async Task<ActionResult<IEnumerable<POItem>>> GetPendingPOItems()
        {
            // Items that are approved but not yet received
            return await _context.POItems
                .Include(i => i.PurchaseOrder)
                    .ThenInclude(po => po!.Vendor)
                .Include(i => i.PIItem)
                    .ThenInclude(pii => pii!.PatternDie)
                .Where(i => i.PurchaseOrder!.Status == POStatus.APPROVED && !i.IsReceived)
                .ToListAsync();
        }
    }
}
