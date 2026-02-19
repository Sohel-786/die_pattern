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
                .Include(m => m.Item)
                .Include(m => m.FromLocation)
                .Include(m => m.FromParty)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Select(m => new MovementDto
                {
                    Id = m.Id,
                    Type = m.Type,
                    ItemId = m.ItemId,
                    ItemName = m.Item!.CurrentName,
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

            var item = await _context.Items.FindAsync(dto.ItemId);
            if (item == null) return NotFound("Item not found");

            // Business Rule: One holder at a time
            // Mandatory reason for SystemReturn
            if (dto.Type == MovementType.SystemReturn && string.IsNullOrEmpty(dto.Reason))
                return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Reason is mandatory for System Return" });

            var movement = new Movement
            {
                Type = dto.Type,
                ItemId = dto.ItemId,
                
                FromType = item.CurrentHolderType,
                FromLocationId = item.CurrentLocationId,
                FromPartyId = item.CurrentPartyId,

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

            // Update Item holder (if no QC pending)
            // If Inward/SystemReturn, wait for QC to update stock
            if (dto.Type == MovementType.Outward)
            {
                item.CurrentHolderType = dto.ToType;
                item.CurrentLocationId = dto.ToLocationId;
                item.CurrentPartyId = dto.ToPartyId;
                item.UpdatedAt = DateTime.Now;
            }

            _context.Movements.Add(movement);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Movement> { Data = movement });
        }
    }
}
