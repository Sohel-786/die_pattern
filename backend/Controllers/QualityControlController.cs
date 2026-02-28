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
        public async Task<ActionResult<ApiResponse<IEnumerable<PendingQCDto>>>> GetPending(
            [FromQuery] InwardSourceType? sourceType)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.InwardLines
                .Include(l => l.Item)
                .Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                .Where(l => l.IsQCPending && !l.IsQCApproved && l.Inward != null && l.Inward.IsActive && l.Inward.LocationId == locationId);

            if (sourceType.HasValue)
                query = query.Where(l => l.SourceType == sourceType.Value);

            var list = await query.ToListAsync();
            var data = list.Select(m => MapToDto(m)).ToList();
            return Ok(new ApiResponse<IEnumerable<PendingQCDto>> { Data = data });
        }

        private static PendingQCDto MapToDto(InwardLine m)
        {
            return new PendingQCDto
            {
                InwardLineId = m.Id,
                ItemId = m.ItemId,
                ItemName = m.Item?.CurrentName,
                MainPartName = m.Item?.MainPartName,
                InwardId = m.InwardId,
                InwardNo = m.Inward?.InwardNo,
                SourceType = m.SourceType,
                SourceRefDisplay = m.SourceType == InwardSourceType.PO ? $"PO-{m.SourceRefId}"
                    : m.SourceType == InwardSourceType.OutwardReturn ? $"Outward #{m.SourceRefId}"
                    : m.SourceType == InwardSourceType.JobWork ? $"JW-{m.SourceRefId}"
                    : m.SourceRefId?.ToString(),
                VendorName = m.Inward?.Vendor?.Name,
                IsQCPending = m.IsQCPending,
                IsQCApproved = m.IsQCApproved,
                InwardDate = m.Inward?.InwardDate ?? DateTime.Now
            };
        }

        [HttpPost("perform")]
        public async Task<ActionResult<ApiResponse<bool>>> Perform([FromBody] QCDto dto)
        {
            if (!await HasPermission("CreateQC")) return Forbidden();
            if (dto.IsApproved && !await HasPermission("ApproveQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var line = await _context.InwardLines
                .Include(l => l.Item)
                .Include(l => l.Inward)
                .FirstOrDefaultAsync(l => l.Id == dto.InwardLineId && l.Inward!.LocationId == locationId);

            if (line == null) return NotFound("Inward Line not found");
            if (!line.IsQCPending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "This inward line is not pending QC or has already been processed." });

            if (await _context.QualityControls.AnyAsync(q => q.InwardLineId == dto.InwardLineId))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "QC entry already exists for this inward line." });

            var qc = new QualityControl
            {
                InwardLineId = dto.InwardLineId,
                IsApproved = dto.IsApproved,
                Remarks = dto.Remarks,
                CheckedBy = CurrentUserId,
                CheckedAt = DateTime.Now
            };

            line.IsQCApproved = dto.IsApproved;
            line.IsQCPending = false;

            if (dto.IsApproved)
            {
                var item = line.Item;
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InStock;
                    item.CurrentLocationId = line.Inward!.LocationId;
                    item.CurrentPartyId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.QualityControls.Add(qc);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
