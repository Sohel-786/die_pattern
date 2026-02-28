using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using System.Text.Json;

namespace net_backend.Controllers
{
    [Route("quality-control")]
    [ApiController]
    public class QualityControlController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly IWebHostEnvironment _env;

        public QualityControlController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IWebHostEnvironment env) : base(context)
        {
            _codeGenerator = codeGenerator;
            _env = env;
        }

        // ── Temp Upload (stored in temp dir, URL returned to client) ──────────────────
        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermission("CreateQC") && !await HasPermission("EditQC")) return Forbidden();
            var uploadFile = file ?? Request.Form.Files?.FirstOrDefault();
            if (uploadFile == null || uploadFile.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file uploaded." });

            const long maxBytes = 20 * 1024 * 1024;
            if (uploadFile.Length > maxBytes)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "File size must be under 20 MB." });

            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp" };
            var ext = Path.GetExtension(uploadFile.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only PDF and image files are allowed." });

            try
            {
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var dir = Path.Combine(root, "wwwroot", "storage", "qc-attachments-temp");
                Directory.CreateDirectory(dir);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.GetFullPath(Path.Combine(dir, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid file path." });
                await using var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
                await uploadFile.CopyToAsync(stream);
                var url = $"/storage/qc-attachments-temp/{fileName}";
                return Ok(new ApiResponse<object> { Data = new { url } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = "Upload failed: " + ex.Message });
            }
        }

        // ── Delete Attachment ──────────────────────────────────────────────────────
        [HttpDelete("attachment")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteAttachment([FromQuery] string? url)
        {
            if (!await HasPermission("EditQC") && !await HasPermission("CreateQC")) return Forbidden();
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "URL is required." });
            try
            {
                var decoded = Uri.UnescapeDataString(url.Trim());
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var wwwroot = Path.Combine(root, "wwwroot");
                var relativePath = decoded.TrimStart('/');
                var filePath = Path.GetFullPath(Path.Combine(wwwroot, relativePath));
                if (!filePath.StartsWith(Path.GetFullPath(wwwroot), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Invalid file path." });
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<bool> { Success = false, Message = "Delete failed: " + ex.Message });
            }
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<QCDto>>>> GetAll(
            [FromQuery] int? partyId,
            [FromQuery] List<int>? partyIds,
            [FromQuery] QcStatus? status,
            [FromQuery] bool? isActive,
            [FromQuery] string? search,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (!await HasPermission("ViewQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.QcEntries
                .Where(q => q.LocationId == locationId)
                .Include(q => q.Party)
                .Include(q => q.Creator)
                .Include(q => q.Approver)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Inward)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                            .ThenInclude(it => it!.ItemType)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                            .ThenInclude(it => it!.Material)
                .OrderByDescending(q => q.CreatedAt)
                .AsQueryable();

            if (partyId.HasValue)
                query = query.Where(q => q.PartyId == partyId.Value);
            if (partyIds != null && partyIds.Any())
                query = query.Where(q => partyIds.Contains(q.PartyId));
            if (status.HasValue)
                query = query.Where(q => q.Status == status.Value);
            if (isActive.HasValue)
                query = query.Where(q => q.IsActive == isActive.Value);
            if (startDate.HasValue)
                query = query.Where(q => q.CreatedAt >= startDate.Value);
            if (endDate.HasValue)
            {
                var end = endDate.Value.Date.AddDays(1);
                query = query.Where(q => q.CreatedAt < end);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(q =>
                    (q.QcNo != null && q.QcNo.ToLower().Contains(term)) ||
                    (q.Party != null && q.Party.Name != null && q.Party.Name.ToLower().Contains(term)) ||
                    (q.Remarks != null && q.Remarks.ToLower().Contains(term)));
            }

            var list = await query.ToListAsync();
            var data = list.Select(MapToDto).ToList();
            return Ok(new ApiResponse<IEnumerable<QCDto>> { Data = data });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<QCDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries
                .Include(q => q.Party)
                .Include(q => q.Creator)
                .Include(q => q.Approver)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Inward)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                            .ThenInclude(it => it!.ItemType)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                            .ThenInclude(it => it!.Material)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);

            if (entry == null) return NotFound();
            return Ok(new ApiResponse<QCDto> { Data = MapToDto(entry) });
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PendingQCDto>>>> GetPending(
            [FromQuery] int? partyId,
            [FromQuery] InwardSourceType? sourceType)
        {
            if (!await HasPermission("CreateQC") && !await HasPermission("EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            
            var query = _context.InwardLines
                .Include(l => l.Item)
                .Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                .Where(l => l.IsQCPending && !l.IsQCApproved && l.Inward != null && l.Inward.IsActive && l.Inward.LocationId == locationId)
                .AsQueryable();

            if (partyId.HasValue)
                query = query.Where(l => l.Inward!.VendorId == partyId.Value);
            if (sourceType.HasValue)
                query = query.Where(l => l.SourceType == sourceType.Value);

            // Hide items already in an active Pending QC entry
            var inActiveQc = await _context.QcItems
                .Where(qi => qi.QcEntry!.IsActive && qi.QcEntry.Status == QcStatus.Pending)
                .Select(qi => qi.InwardLineId)
                .ToListAsync();

            query = query.Where(l => !inActiveQc.Contains(l.Id));

            var list = await query.ToListAsync();
            var data = list.Select(m => new PendingQCDto
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
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<PendingQCDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<QualityControlEntry>>> Create([FromBody] CreateQCDto dto)
        {
            if (!await HasPermission("CreateQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.InwardLineIds == null || !dto.InwardLineIds.Any())
                return BadRequest(new ApiResponse<QualityControlEntry> { Success = false, Message = "At least one item is required for QC." });

            var qcEntry = new QualityControlEntry
            {
                QcNo = await _codeGenerator.GenerateCode("QC", locationId),
                LocationId = locationId,
                PartyId = dto.PartyId,
                SourceType = dto.SourceType,
                Remarks = dto.Remarks,
                AttachmentUrlsJson = dto.AttachmentUrls != null && dto.AttachmentUrls.Count > 0
                    ? JsonSerializer.Serialize(dto.AttachmentUrls) : null,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Status = QcStatus.Pending,
                IsActive = true
            };

            foreach (var lineId in dto.InwardLineIds)
            {
                var line = await _context.InwardLines.FindAsync(lineId);
                if (line != null)
                {
                    qcEntry.Items.Add(new QualityControlItem
                    {
                        InwardLineId = lineId,
                        IsApproved = null // Pending
                    });
                }
            }

            _context.QcEntries.Add(qcEntry);
            await _context.SaveChangesAsync();

            // Mark items as In QC so Item Master shows correct state
            var itemIds = await _context.InwardLines
                .Where(l => dto.InwardLineIds.Contains(l.Id))
                .Select(l => l.ItemId)
                .Distinct()
                .ToListAsync();
            var itemsToUpdate = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToListAsync();
            foreach (var item in itemsToUpdate)
            {
                item.CurrentProcess = ItemProcessState.InQC;
                item.UpdatedAt = DateTime.Now;
            }
            if (itemsToUpdate.Any())
                await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<QualityControlEntry> { Data = qcEntry });
        }

        [HttpPost("{id}/approve-item")]
        public async Task<ActionResult<ApiResponse<bool>>> ApproveItem(int id, [FromBody] ApproveQCItemDto dto)
        {
            if (!await HasPermission("ApproveQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var qi = await _context.QcItems
                .Include(i => i.QcEntry)
                .Include(i => i.InwardLine).ThenInclude(l => l!.Item)
                .FirstOrDefaultAsync(i => i.Id == dto.QCItemId && i.QcEntryId == id && i.QcEntry!.LocationId == locationId);

            if (qi == null) return NotFound();
            if (qi.QcEntry!.Status != QcStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Resolution can only be changed for Pending QC entries." });

            qi.IsApproved = dto.IsApproved;
            qi.Remarks = dto.Remarks;

            // Item-level reject: inward shows Rejected, item back In Stock
            if (dto.IsApproved == false && qi.InwardLine != null)
            {
                qi.InwardLine.IsQCPending = false;
                qi.InwardLine.IsQCApproved = false;
                var item = qi.InwardLine.Item;
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InStock;
                    item.CurrentLocationId = locationId;
                    item.CurrentPartyId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApproveQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);

            if (entry == null) return NotFound();
            if (entry.Status != QcStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending QC entries can be approved." });

            if (entry.Items.Any(i => !i.IsApproved.HasValue))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "All items must be resolved (Approved or Rejected) before entry approval." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                foreach (var qi in entry.Items)
                {
                    var line = qi.InwardLine;
                    if (line == null) continue;

                    if (qi.IsApproved == true)
                    {
                        line.IsQCPending = false;
                        line.IsQCApproved = true;
                        
                        var item = line.Item;
                        if (item != null)
                        {
                            item.CurrentProcess = ItemProcessState.InStock;
                            item.CurrentLocationId = entry.LocationId;
                            item.CurrentPartyId = null;
                            item.UpdatedAt = DateTime.Now;
                        }
                    }
                    else
                    {
                        // Rejected: mark line as resolved (not pending), show Rejected in Inward; item back In Stock
                        line.IsQCPending = false;
                        line.IsQCApproved = false;

                        var item = line.Item;
                        if (item != null)
                        {
                            item.CurrentProcess = ItemProcessState.InStock;
                            item.CurrentLocationId = entry.LocationId;
                            item.CurrentPartyId = null;
                            item.UpdatedAt = DateTime.Now;
                        }
                    }
                }

                entry.Status = QcStatus.Approved;
                entry.ApprovedBy = CurrentUserId;
                entry.ApprovedAt = DateTime.Now;
                entry.UpdatedAt = DateTime.Now;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiResponse<bool> { Success = false, Message = "Approval failed: " + ex.Message });
            }
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult<ApiResponse<bool>>> Reject(int id, [FromBody] RejectQCEntryDto? dto = null)
        {
            if (!await HasPermission("ApproveQC")) return Forbidden(); // Or RejectQC permission
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);

            if (entry == null) return NotFound();
            if (entry.Status != QcStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending QC entries can be rejected." });

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Rejecting the entry means ALL items are rejected; inward shows Rejected, items back In Stock
                foreach (var qi in entry.Items)
                {
                    qi.IsApproved = false;
                    var line = qi.InwardLine;
                    if (line != null)
                    {
                        line.IsQCPending = false;
                        line.IsQCApproved = false;
                        var item = line.Item;
                        if (item != null)
                        {
                            item.CurrentProcess = ItemProcessState.InStock;
                            item.CurrentLocationId = entry.LocationId;
                            item.CurrentPartyId = null;
                            item.UpdatedAt = DateTime.Now;
                        }
                    }
                }

                entry.Status = QcStatus.Rejected;
                entry.Remarks = dto?.Remarks ?? entry.Remarks;
                entry.UpdatedAt = DateTime.Now;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiResponse<bool> { Success = false, Message = "Rejection failed: " + ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<QCDto>>> Update(int id, [FromBody] UpdateQCDto dto)
        {
            if (!await HasPermission("EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();
            if (entry.Status != QcStatus.Pending)
                return BadRequest(new ApiResponse<QCDto> { Success = false, Message = "Only pending QC entries can be updated." });

            entry.Remarks = dto.Remarks ?? entry.Remarks;
            if (dto.AttachmentUrls != null)
                entry.AttachmentUrlsJson = dto.AttachmentUrls.Count > 0 ? JsonSerializer.Serialize(dto.AttachmentUrls) : null;
            entry.UpdatedAt = DateTime.Now;

            if (dto.InwardLineIds != null && dto.InwardLineIds.Any())
            {
                var inActiveQc = await _context.QcItems
                    .Where(qi => qi.QcEntry!.IsActive && qi.QcEntry.Status == QcStatus.Pending && qi.QcEntryId != id)
                    .Select(qi => qi.InwardLineId)
                    .ToListAsync();

                var toAdd = dto.InwardLineIds.Where(lid => !entry.Items.Any(i => i.InwardLineId == lid)).ToList();
                var toRemove = entry.Items.Where(i => !dto.InwardLineIds.Contains(i.InwardLineId)).ToList();

                foreach (var lineId in toAdd)
                {
                    if (inActiveQc.Contains(lineId)) continue;
                    var line = await _context.InwardLines
                        .Include(l => l.Inward)
                        .FirstOrDefaultAsync(l => l.Id == lineId && l.Inward != null && l.Inward.IsActive && l.Inward.LocationId == locationId);
                    if (line == null || !line.IsQCPending || line.IsQCApproved) continue;
                    entry.Items.Add(new QualityControlItem { InwardLineId = lineId, IsApproved = null });
                }
                foreach (var qi in toRemove)
                    _context.QcItems.Remove(qi);
            }

            await _context.SaveChangesAsync();
            var updated = await _context.QcEntries
                .Include(q => q.Party)
                .Include(q => q.Creator)
                .Include(q => q.Approver)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Inward)
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                        .ThenInclude(l => l!.Item)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            return Ok(new ApiResponse<QCDto> { Data = MapToDto(updated!) });
        }

        [HttpPatch("{id}/inactive")]
        public async Task<ActionResult<ApiResponse<bool>>> SetInactive(int id)
        {
            if (!await HasPermission("EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries.FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();

            if (entry.Status == QcStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Approved QC entries cannot be deactivated." });

            entry.IsActive = false;
            entry.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> SetActive(int id)
        {
            if (!await HasPermission("EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries.FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();

            if (entry.Status == QcStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Approved QC entries cannot be toggled." });

            entry.IsActive = true;
            entry.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private static QCDto MapToDto(QualityControlEntry q)
        {
            return new QCDto
            {
                Id = q.Id,
                QcNo = q.QcNo,
                PartyId = q.PartyId,
                PartyName = q.Party?.Name ?? "Unknown",
                SourceType = q.SourceType,
                Remarks = q.Remarks,
                AttachmentUrls = string.IsNullOrWhiteSpace(q.AttachmentUrlsJson)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(q.AttachmentUrlsJson) ?? new List<string>()),
                Status = q.Status,
                CreatedBy = q.CreatedBy,
                CreatorName = q.Creator != null ? q.Creator.FirstName + " " + q.Creator.LastName : null,
                ApprovedBy = q.ApprovedBy,
                ApproverName = q.Approver != null ? q.Approver.FirstName + " " + q.Approver.LastName : null,
                ApprovedAt = q.ApprovedAt,
                IsActive = q.IsActive,
                CreatedAt = q.CreatedAt,
                Items = q.Items.Select(i => new QCItemDto
                {
                    Id = i.Id,
                    InwardLineId = i.InwardLineId,
                    ItemId = i.InwardLine!.ItemId,
                    MainPartName = i.InwardLine.Item?.MainPartName,
                    CurrentName = i.InwardLine.Item?.CurrentName,
                    ItemTypeName = i.InwardLine.ItemTypeName ?? i.InwardLine.Item?.ItemType?.Name,
                    DrawingNo = i.InwardLine.DrawingNo,
                    RevisionNo = i.InwardLine.RevisionNo,
                    MaterialName = i.InwardLine.MaterialName ?? i.InwardLine.Item?.Material?.Name,
                    InwardNo = i.InwardLine.Inward?.InwardNo,
                    InwardId = i.InwardLine.InwardId,
                    SourceRefDisplay = i.InwardLine.SourceType == InwardSourceType.PO ? $"PO-{i.InwardLine.SourceRefId}"
                        : i.InwardLine.SourceType == InwardSourceType.JobWork ? $"JW-{i.InwardLine.SourceRefId}"
                        : i.InwardLine.SourceType == InwardSourceType.OutwardReturn ? $"Outward #{i.InwardLine.SourceRefId}"
                        : i.InwardLine.SourceRefId?.ToString(),
                    IsApproved = i.IsApproved,
                    Remarks = i.Remarks
                }).ToList()
            };
        }
    }
}
