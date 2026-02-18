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
    public class InwardsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGen;

        public InwardsController(ApplicationDbContext context, ICodeGeneratorService codeGen)
        {
            _context = context;
            _codeGen = codeGen;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<InwardEntry>>> GetInwards()
        {
            return await _context.InwardEntries
                .Include(i => i.PurchaseOrder)
                    .ThenInclude(po => po!.Vendor)
                .Include(i => i.Receiver)
                .Include(i => i.Items)
                    .ThenInclude(ii => ii.POItem)
                        .ThenInclude(poi => poi!.PIItem)
                            .ThenInclude(pii => pii!.PatternDie)
                .OrderByDescending(i => i.InwardDate)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<InwardEntry>> PostInward(InwardEntry inward)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            inward.InwardNo = await _codeGen.GenerateCodeAsync("INW", "inward_entries", "InwardNo");
            inward.ReceivedBy = userId;
            inward.CreatedAt = DateTime.Now;

            foreach (var item in inward.Items)
            {
                var poItem = await _context.POItems
                    .Include(p => p.PIItem)
                    .FirstOrDefaultAsync(p => p.Id == item.POItemId);

                if (poItem != null)
                {
                    poItem.IsReceived = true;
                    
                    // Create a movement record as well for tracking
                    var movement = new Movement
                    {
                        MovementNo = await _codeGen.GenerateCodeAsync("MOV", "movements", "MovementNo"),
                        PatternDieId = poItem.PIItem!.PatternDieId,
                        Type = MovementType.RECEIVE_FROM_VENDOR,
                        FromVendorId = (await _context.PurchaseOrders.FindAsync(inward.POId))?.VendorId,
                        ToLocationId = 1, // Default store or incoming location
                        Reason = $"Received against PO: {inward.InwardNo}",
                        CreatedBy = userId,
                        IsQCRequired = true,
                        CreatedAt = DateTime.Now
                    };
                    _context.Movements.Add(movement);
                }
            }

            _context.InwardEntries.Add(inward);
            await _context.SaveChangesAsync();

            return Ok(inward);
        }

        [HttpGet("pending-qc")]
        public async Task<ActionResult<IEnumerable<InwardItem>>> GetPendingQCItems()
        {
            return await _context.InwardItems
                .Include(i => i.InwardEntry)
                    .ThenInclude(ie => ie!.PurchaseOrder)
                        .ThenInclude(po => po!.Vendor)
                .Include(i => i.POItem)
                    .ThenInclude(poi => poi!.PIItem)
                        .ThenInclude(pii => pii!.PatternDie)
                .Where(i => !i.IsQCProcessed)
                .ToListAsync();
        }
    }
}
