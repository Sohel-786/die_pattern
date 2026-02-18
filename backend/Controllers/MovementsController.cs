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
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetAll()
        {
            var data = await _context.Movements
                .Include(m => m.PatternDie)
                .Include(m => m.FromLocation)
                .Include(m => m.FromParty)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Select(m => new MovementDto
                {
                    Id = m.Id,
                    Type = m.Type,
                    PatternDieId = m.PatternDieId,
                    PatternDieName = m.PatternDie!.CurrentName,
                    FromType = m.FromType,
                    FromName = m.FromType == HolderType.Location ? m.FromLocation!.Name : m.FromParty!.Name,
                    ToType = m.ToType,
                    ToName = m.ToType == HolderType.Location ? m.ToLocation!.Name : m.ToParty!.Name,
                    Remarks = m.Remarks,
                    Reason = m.Reason,
                    IsQCPending = m.IsQCPending,
                    IsQCApproved = m.IsQCApproved,
                    CreatedAt = m.CreatedAt
                })
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Movement>>> Create([FromBody] CreateMovementDto dto)
        {
            if (!await HasPermission("CreateMovement")) return Forbidden();

            var patternDie = await _context.PatternDies.FindAsync(dto.PatternDieId);
            if (patternDie == null) return NotFound("Pattern/Die not found");

            // Business Rule: One holder at a time
            // Mandatory reason for SystemReturn
            if (dto.Type == MovementType.SystemReturn && string.IsNullOrEmpty(dto.Reason))
                return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Reason is mandatory for System Return" });

            var movement = new Movement
            {
                Type = dto.Type,
                PatternDieId = dto.PatternDieId,
                
                FromType = patternDie.CurrentHolderType,
                FromLocationId = patternDie.CurrentLocationId,
                FromPartyId = patternDie.CurrentPartyId,

                ToType = dto.ToType,
                ToLocationId = dto.ToLocationId,
                ToPartyId = dto.ToPartyId,

                Remarks = dto.Remarks,
                Reason = dto.Reason,
                PurchaseOrderId = dto.PurchaseOrderId,
                
                IsQCPending = (dto.Type == MovementType.Inward || dto.Type == MovementType.SystemReturn),
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            };

            // Update PatternDie holder (if no QC pending)
            // If Inward/SystemReturn, wait for QC to update stock
            if (dto.Type == MovementType.Outward)
            {
                patternDie.CurrentHolderType = dto.ToType;
                patternDie.CurrentLocationId = dto.ToLocationId;
                patternDie.CurrentPartyId = dto.ToPartyId;
                patternDie.UpdatedAt = DateTime.Now;
            }

            _context.Movements.Add(movement);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Movement> { Data = movement });
        }
    }
}
