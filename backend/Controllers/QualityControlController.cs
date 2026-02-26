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
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetPending(
            [FromQuery] InwardSourceType? sourceType)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.Movements
                .Include(m => m.Item)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Include(m => m.Inward)
                .Include(m => m.PurchaseOrder)
                .Where(m => m.IsQCPending && !m.IsQCApproved && m.ToLocationId == locationId);

            if (sourceType.HasValue)
                query = query.Where(m => m.Inward != null && m.Inward.SourceType == sourceType.Value);

            var list = await query.ToListAsync();
            var data = list.Select(m => MapToDto(m)).ToList();
            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = data });
        }

        private static MovementDto MapToDto(Movement m)
        {
            var dto = new MovementDto
            {
                Id = m.Id,
                Type = m.Type,
                ItemId = m.ItemId,
                ItemName = m.Item?.CurrentName,
                MainPartName = m.Item?.MainPartName,
                FromType = m.FromType,
                FromName = m.FromParty?.Name ?? m.FromLocation?.Name,
                ToType = m.ToType,
                ToName = m.ToType == HolderType.Location ? m.ToLocation?.Name : m.ToParty?.Name,
                Remarks = m.Remarks,
                Reason = m.Reason,
                PurchaseOrderId = m.PurchaseOrderId,
                PoNo = m.PurchaseOrder?.PoNo,
                InwardId = m.InwardId,
                InwardNo = m.Inward?.InwardNo,
                SourceType = m.Inward != null ? (InwardSourceType?)m.Inward.SourceType : null,
                SourceRefDisplay = m.Inward != null
                    ? (m.Inward.SourceType == InwardSourceType.PO ? $"PO-{m.Inward.SourceRefId}"
                        : m.Inward.SourceType == InwardSourceType.OutwardReturn ? $"Outward #{m.Inward.SourceRefId}"
                        : m.Inward.SourceType == InwardSourceType.JobWork ? $"JW-{m.Inward.SourceRefId}"
                        : m.Inward.SourceRefId.ToString())
                    : null,
                IsQCPending = m.IsQCPending,
                IsQCApproved = m.IsQCApproved,
                CreatedAt = m.CreatedAt
            };
            return dto;
        }

        [HttpPost("perform")]
        public async Task<ActionResult<ApiResponse<bool>>> Perform([FromBody] QCDto dto)
        {
            if (!await HasPermission("CreateQC")) return Forbidden();
            if (dto.IsApproved && !await HasPermission("ApproveQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var movement = await _context.Movements
                .Include(m => m.Item)
                .FirstOrDefaultAsync(m => m.Id == dto.MovementId && m.ToLocationId == locationId);

            if (movement == null) return NotFound("Movement not found");
            if (!movement.IsQCPending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "This movement is not pending QC or has already been processed." });

            if (await _context.QualityControls.AnyAsync(q => q.MovementId == dto.MovementId))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "QC entry already exists for this movement (duplicate not allowed)." });

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
