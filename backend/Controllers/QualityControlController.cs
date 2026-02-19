using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("quality-control")]
    [ApiController]
    public class QualityControlController : BaseController
    {
        public QualityControlController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetPending()
        {
            var data = await _context.Movements
                .Include(m => m.Item)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Where(m => m.IsQCPending && !m.IsQCApproved)
                .Select(m => new MovementDto
                {
                    Id = m.Id,
                    Type = m.Type,
                    ItemId = m.ItemId,
                    ItemName = m.Item!.CurrentName,
                    ToType = m.ToType,
                    ToName = m.ToType == HolderType.Location ? m.ToLocation!.Name : m.ToParty!.Name,
                    Remarks = m.Remarks,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = data });
        }

        [HttpPost("perform")]
        public async Task<ActionResult<ApiResponse<bool>>> Perform([FromBody] QCDto dto)
        {
            if (!await HasPermission("PerformQC")) return Forbidden();

            var movement = await _context.Movements
                .Include(m => m.Item)
                .FirstOrDefaultAsync(m => m.Id == dto.MovementId);

            if (movement == null) return NotFound("Movement not found");

            var qc = new QualityControl
            {
                MovementId = dto.MovementId,
                IsApproved = dto.IsApproved,
                Remarks = dto.Remarks,
                CheckedBy = CurrentUserId,
                CheckedAt = DateTime.Now
            };

            movement.IsQCApproved = dto.IsApproved;
            movement.IsQCPending = false;

            if (dto.IsApproved)
            {
                // Update stock holder only on approval
                var item = movement.Item;
                if (item != null)
                {
                    item.CurrentHolderType = movement.ToType;
                    item.CurrentLocationId = movement.ToLocationId;
                    item.CurrentPartyId = movement.ToPartyId;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.QualityControls.Add(qc);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
