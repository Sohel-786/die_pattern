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
    public class MovementsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGen;

        public MovementsController(ApplicationDbContext context, ICodeGeneratorService codeGen)
        {
            _context = context;
            _codeGen = codeGen;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Movement>>> GetMovements()
        {
            return await _context.Movements
                .Include(m => m.PatternDie)
                .Include(m => m.FromLocation)
                .Include(m => m.ToLocation)
                .Include(m => m.FromVendor)
                .Include(m => m.ToVendor)
                .Include(m => m.Creator)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Movement>> PostMovement(Movement movement)
        {
            var patternDie = await _context.PatternDies.FindAsync(movement.PatternDieId);
            if (patternDie == null) return NotFound("Pattern/Die not found");

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            movement.CreatedAt = DateTime.Now;
            movement.CreatedBy = userId;
            movement.MovementNo = await _codeGen.GenerateCodeAsync("MOV", "movements", "MovementNo");

            // Basic Stock Control Logic
            if (movement.Type == MovementType.ISSUE_TO_VENDOR)
            {
                if (patternDie.IsAtVendor) return BadRequest("Pattern/Die is already at a vendor");
                
                movement.FromLocationId = patternDie.CurrentLocationId;
                patternDie.CurrentLocationId = null;
                patternDie.CurrentVendorId = movement.ToVendorId;
                movement.IsQCRequired = false;
            }
            else if (movement.Type == MovementType.RECEIVE_FROM_VENDOR)
            {
                if (!patternDie.IsAtVendor) return BadRequest("Pattern/Die is not at a vendor");
                
                movement.FromVendorId = patternDie.CurrentVendorId;
                movement.IsQCRequired = true;
                movement.IsQCApproved = false;
                
                // Location update happens after QC approval usually, 
                // but we record the intent here.
            }
            else if (movement.Type == MovementType.INTERNAL_TRANSFER)
            {
                movement.FromLocationId = patternDie.CurrentLocationId;
                patternDie.CurrentLocationId = movement.ToLocationId;
            }

            patternDie.UpdatedAt = DateTime.Now;
            _context.Movements.Add(movement);
            await _context.SaveChangesAsync();

            return Ok(movement);
        }

        [HttpPost("{id}/qc")]
        public async Task<IActionResult> QCApproval(int id, [FromBody] QCApprovalDto qc)
        {
            var movement = await _context.Movements
                .Include(m => m.PatternDie)
                .FirstOrDefaultAsync(m => m.Id == id);
            
            if (movement == null) return NotFound();

            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            movement.IsQCApproved = qc.Approved;
            movement.QCBy = userId;
            movement.QCAt = DateTime.Now;
            movement.QCRemarks = qc.Remarks;

            if (qc.Approved && movement.PatternDie != null)
            {
                movement.PatternDie.CurrentVendorId = null;
                movement.PatternDie.CurrentLocationId = movement.ToLocationId;
                movement.PatternDie.UpdatedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return Ok(movement);
        }
    }

    public class QCApprovalDto
    {
        public bool Approved { get; set; }
        public string? Remarks { get; set; }
    }
}
