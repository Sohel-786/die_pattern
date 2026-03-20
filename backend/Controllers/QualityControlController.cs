using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using System.Text.Json;

namespace net_backend.Controllers
{
    [Route("api/quality-control")]
    [ApiController]
    public class QualityControlController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly IWebHostEnvironment _env;
        private readonly IItemStateService _itemState;

        public QualityControlController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IWebHostEnvironment env, IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _env = env;
            _itemState = itemState;
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

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("QC", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<QCDto>>>> GetAll(
            [FromQuery] List<int>? partyIds,
            [FromQuery] List<int>? creatorIds,
            [FromQuery] List<int>? itemIds,
            [FromQuery] QcStatus? status,
            [FromQuery] bool? isActive,
            [FromQuery] string? search,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            IQueryable<QualityControlEntry> query = _context.QcEntries
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
                            .ThenInclude(it => it!.Material);

            if (partyIds != null && partyIds.Any())
                query = query.Where(q => partyIds.Contains(q.PartyId));

            if (creatorIds != null && creatorIds.Any())
                query = query.Where(q => creatorIds.Contains(q.CreatedBy));

            if (itemIds != null && itemIds.Any())
                query = query.Where(q => q.Items.Any(i => i.InwardLine != null && itemIds.Contains(i.InwardLine.ItemId)));

            if (status.HasValue)
                query = query.Where(q => q.Status == status.Value);
            // SECURITY: Only Admin can see inactive entries. For others, force only active records.
            if (!await IsAdmin())
                query = query.Where(q => q.IsActive);
            else if (isActive.HasValue)
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

            var ordered = query.OrderByDescending(q => q.CreatedAt);
            var totalCount = await ordered.CountAsync();
            var (skip, take) = PaginationHelper.GetSkipTake(page, pageSize);
            var list = await ordered.Skip(skip).Take(take).ToListAsync();

            // Fetch Source Numbers for Professional Display
            var poIds = list.SelectMany(q => q.Items).Where(i => i.InwardLine?.SourceType == InwardSourceType.PO && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var jwIds = list.SelectMany(q => q.Items).Where(i => i.InwardLine?.SourceType == InwardSourceType.JobWork && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var poDict = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            var jwDict = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id);

            var data = list.Select(q => MapToDto(q, poDict, jwDict)).ToList();
            return Ok(new ApiResponse<IEnumerable<QCDto>> { Data = data, TotalCount = totalCount });
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
            if (!entry.IsActive && !await IsAdmin()) return NotFound();

            // Fetch Source Numbers for Professional Display
            var poIds = entry.Items.Where(i => i.InwardLine?.SourceType == InwardSourceType.PO && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var jwIds = entry.Items.Where(i => i.InwardLine?.SourceType == InwardSourceType.JobWork && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var poDict = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            var jwDict = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id);

            return Ok(new ApiResponse<QCDto> { Data = MapToDto(entry, poDict, jwDict) });
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PendingQCDto>>>> GetPending(
            [FromQuery] int? partyId,
            [FromQuery] InwardSourceType? sourceType,
            [FromQuery] int? excludeEntryId)
        {
            if (!await HasPermission("CreateQC") && !await HasPermission("EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            
            var query = _context.InwardLines
                .Include(l => l.Item).ThenInclude(i => i!.ItemType)
                .Include(l => l.Item).ThenInclude(i => i!.Material)
                .Include(l => l.Inward).ThenInclude(i => i!.Vendor)
                .Where(l => l.IsQCPending && !l.IsQCApproved && l.Inward != null && l.Inward.IsActive && l.Inward.LocationId == locationId)
                .AsQueryable();

            if (partyId.HasValue)
                query = query.Where(l => l.Inward!.VendorId == partyId.Value);
            if (sourceType.HasValue)
                query = query.Where(l => l.SourceType == sourceType.Value);

            // Hide items already in an active Pending QC entry
            var inActiveQc = await _context.QcItems
                .Where(qi => qi.QcEntry!.IsActive && qi.QcEntry.Status == QcStatus.Pending && qi.QcEntryId != excludeEntryId)
                .Select(qi => qi.InwardLineId)
                .ToListAsync();

            query = query.Where(l => !inActiveQc.Contains(l.Id));

            var list = await query.ToListAsync();

            // Fetch Source Numbers for Professional Display
            var poIds = list.Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var jwIds = list.Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();

            var poDict = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.PoNo);
            var jwDict = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id, j => j.JobWorkNo);

            var data = list.Select(m => new PendingQCDto
            {
                InwardLineId = m.Id,
                ItemId = m.ItemId,
                ItemName = m.ItemNameSnapshot ?? m.Item?.CurrentName,
                MainPartName = m.Item?.MainPartName,
                ItemTypeName = m.ItemTypeName ?? m.Item?.ItemType?.Name,
                DrawingNo = m.DrawingNo ?? m.Item?.DrawingNo,
                RevisionNo = m.RevisionNo ?? m.Item?.RevisionNo,
                MaterialName = m.MaterialName ?? m.Item?.Material?.Name,
                InwardId = m.InwardId,
                InwardNo = m.Inward?.InwardNo,
                SourceType = m.SourceType,
                SourceRefDisplay = m.SourceType == InwardSourceType.PO && m.SourceRefId.HasValue && poDict.ContainsKey(m.SourceRefId.Value) ? poDict[m.SourceRefId.Value]
                    : m.SourceType == InwardSourceType.JobWork && m.SourceRefId.HasValue && jwDict.ContainsKey(m.SourceRefId.Value) ? jwDict[m.SourceRefId.Value]
                    : m.SourceRefId?.ToString(),
                VendorName = m.Inward?.Vendor?.Name,
                IsQCPending = m.IsQCPending,
                IsQCApproved = m.IsQCApproved,
                // Prefer CreatedAt for accurate inward entry date/time; InwardDate is often date-only
                InwardDate = m.Inward?.CreatedAt ?? m.Inward?.InwardDate ?? DateTime.Now,
                OriginalDisplayName = m.ItemNameSnapshot ?? m.Item?.CurrentName,
                NewDisplayNameFromJobWork = m.NewItemNameFromJobWork
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<PendingQCDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<QualityControlEntry>>> Create([FromBody] CreateQCDto dto)
        {
            if (!await HasAllPermissions("ViewQC", "CreateQC")) return Forbidden();
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
            if (!await HasAllPermissions("ViewQC", "ApproveQC")) return Forbidden();
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

            // Sync result to InwardLine flags and Item state
            if (qi.InwardLine != null)
            {
                var item = qi.InwardLine.Item;
                if (dto.IsApproved == false)
                {
                    // Item-level reject: mark inward line as resolved-rejected, item back In Stock
                    qi.InwardLine.IsQCPending = false;
                    qi.InwardLine.IsQCApproved = false;

                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.InStock;
                        item.CurrentLocationId = locationId;
                        item.CurrentPartyId = null;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
                else
                {
                    // Item-level approve: mark inward line as QC-approved (still within pending entry).
                    // IsQCApproved = true reflects this item's decision; entry finalisation later
                    // will confirm the overall outcome. Item remains in QC process.
                    qi.InwardLine.IsQCPending = true;
                    qi.InwardLine.IsQCApproved = true;  // ← reflect approved decision immediately

                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.InStock;
                        item.CurrentLocationId = locationId;
                        item.CurrentPartyId = null;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasAllPermissions("ViewQC", "ApproveQC")) return Forbidden();
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

                            // Resolve proposed new display name: from inward line snapshot, or fallback to Job Work item when line was created before versioning
                            string? proposedNewName = !string.IsNullOrWhiteSpace(line.NewItemNameFromJobWork) ? line.NewItemNameFromJobWork.Trim() : null;
                            if (string.IsNullOrEmpty(proposedNewName) && line.SourceType == InwardSourceType.JobWork && line.SourceRefId.HasValue)
                            {
                                var jwi = await _context.JobWorkItems.AsNoTracking()
                                    .FirstOrDefaultAsync(j => j.JobWorkId == line.SourceRefId.Value && j.ItemId == item.Id && j.WillChangeName && !string.IsNullOrWhiteSpace(j.ProposedNewName));
                                if (jwi != null)
                                {
                                    proposedNewName = jwi.ProposedNewName!.Trim();
                                    // Backfill inward line so future reads are consistent
                                    line.NewItemNameFromJobWork = proposedNewName;
                                    if (string.IsNullOrEmpty(line.ItemNameSnapshot))
                                        line.ItemNameSnapshot = item.CurrentName;
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(proposedNewName))
                            {
                                var newName = proposedNewName;
                                if (item.CurrentName?.Trim().ToLower() != newName.ToLower())
                                {
                                    if (await _context.Items.AnyAsync(i => i.LocationId == entry.LocationId && i.Id != item.Id && (i.CurrentName.ToLower() == newName.ToLower() || i.MainPartName.ToLower() == newName.ToLower())))
                                        throw new InvalidOperationException($"Display name '{newName}' is already used by another item. Cannot apply name change from Job Work.");
                                    var oldName = item.CurrentName ?? "";
                                    item.CurrentName = newName;
                                    item.UpdatedAt = DateTime.Now;
                                    int? jwId = line.SourceType == InwardSourceType.JobWork ? line.SourceRefId : null;
                                    int? jwItemId = null;
                                    if (jwId.HasValue)
                                    {
                                        var jwi = await _context.JobWorkItems.FirstOrDefaultAsync(j => j.JobWorkId == jwId.Value && j.ItemId == item.Id);
                                        if (jwi != null) jwItemId = jwi.Id;
                                    }
                                    _context.ItemChangeLogs.Add(new ItemChangeLog
                                    {
                                        ItemId = item.Id,
                                        OldName = oldName,
                                        NewName = newName,
                                        OldRevision = item.RevisionNo ?? "",
                                        NewRevision = item.RevisionNo ?? "",
                                        ChangeType = "JobWork",
                                        Source = "JobWork",
                                        JobWorkId = jwId,
                                        JobWorkItemId = jwItemId,
                                        InwardId = line.InwardId,
                                        InwardLineId = line.Id,
                                        QcEntryId = entry.Id,
                                        CreatedBy = CurrentUserId,
                                        CreatedAt = DateTime.Now
                                    });
                                }
                            }
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
            if (!await HasAllPermissions("ViewQC", "ApproveQC")) return Forbidden(); // Or RejectQC permission
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
            if (!await HasAllPermissions("ViewQC", "EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries
                .Include(q => q.Items)
                    .ThenInclude(i => i.InwardLine)
                .FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();
            if (entry.Status != QcStatus.Pending)
                return BadRequest(new ApiResponse<QCDto> { Success = false, Message = "Only pending QC entries can be updated." });

            entry.PartyId = dto.PartyId;
            entry.SourceType = dto.SourceType;
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

            if (updated == null) return NotFound();

            // Fetch Source Numbers for Professional Display
            var poIds = updated.Items.Where(i => i.InwardLine?.SourceType == InwardSourceType.PO && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var jwIds = updated.Items.Where(i => i.InwardLine?.SourceType == InwardSourceType.JobWork && i.InwardLine.SourceRefId.HasValue).Select(i => i.InwardLine!.SourceRefId!.Value).Distinct().ToList();
            var poDict = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            var jwDict = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id);

            return Ok(new ApiResponse<QCDto> { Data = MapToDto(updated, poDict, jwDict) });
        }

        [HttpPatch("{id}/inactive")]
        public async Task<ActionResult<ApiResponse<bool>>> SetInactive(int id)
        {
            if (!await IsAdmin()) return Forbidden();
            if (!await HasAllPermissions("ViewQC", "EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries.FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();

            if (entry.Status == QcStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Approved QC entries cannot be deactivated." });

            // Rule 3: PRODUCTION-LEVEL TRACEABILITY: 
            // Cannot deactivate if a LATER active transaction exists for any item.
            foreach (var qi in entry.Items)
            {
                if (qi.InwardLine == null) continue;
                var (hasDescendant, txInfo) = await _itemState.CheckForDescendantTransactionsAsync(qi.InwardLine.ItemId, entry.CreatedAt, entry.Id, "QC");
                if (hasDescendant)
                {
                    var item = await _context.Items.FindAsync(qi.InwardLine.ItemId);
                    return BadRequest(new ApiResponse<bool>
                    {
                        Success = false,
                        Message = $"Cannot deactivate QC Entry {entry.QcNo}: Item '{item?.MainPartName}' has a subsequent active operation: {txInfo}. You must deactivate that operation first."
                    });
                }
            }

            entry.IsActive = false;
            entry.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> SetActive(int id)
        {
            if (!await IsAdmin()) return Forbidden();
            if (!await HasAllPermissions("ViewQC", "EditQC")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var entry = await _context.QcEntries.FirstOrDefaultAsync(q => q.Id == id && q.LocationId == locationId);
            if (entry == null) return NotFound();

            if (entry.Status == QcStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Approved QC entries cannot be toggled." });

            // Check for existing active QC on items
            var itemLineIds = await _context.QcItems.Where(qi => qi.QcEntryId == id).Select(qi => qi.InwardLineId).ToListAsync();
            var alreadyActive = await _context.QcItems
                .Include(qi => qi.QcEntry)
                .Where(qi => qi.InwardLineId != 0 && itemLineIds.Contains(qi.InwardLineId) && qi.QcEntryId != id && qi.QcEntry!.IsActive)
                .Select(qi => qi.QcEntry!.QcNo)
                .FirstOrDefaultAsync();

            if (alreadyActive != null)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Cannot activate. One or more items in this entry are already part of another active QC entry ({alreadyActive})." });
            }

            entry.IsActive = true;
            entry.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private static QCDto MapToDto(QualityControlEntry q, Dictionary<int, PurchaseOrder>? poDict = null, Dictionary<int, JobWork>? jwDict = null)
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
                    CurrentName = i.InwardLine.ItemNameSnapshot ?? i.InwardLine.Item?.CurrentName,
                    ItemTypeName = i.InwardLine.ItemTypeName ?? i.InwardLine.Item?.ItemType?.Name,
                    DrawingNo = i.InwardLine.DrawingNo,
                    RevisionNo = i.InwardLine.RevisionNo,
                    MaterialName = i.InwardLine.MaterialName ?? i.InwardLine.Item?.Material?.Name,
                    InwardNo = i.InwardLine.Inward?.InwardNo,
                    InwardId = i.InwardLine.InwardId,
                    SourceRefDisplay = (i.InwardLine.SourceType == InwardSourceType.PO && i.InwardLine.SourceRefId.HasValue && poDict != null && poDict.ContainsKey(i.InwardLine.SourceRefId.Value)) ? poDict[i.InwardLine.SourceRefId.Value].PoNo
                                     : (i.InwardLine.SourceType == InwardSourceType.JobWork && i.InwardLine.SourceRefId.HasValue && jwDict != null && jwDict.ContainsKey(i.InwardLine.SourceRefId.Value)) ? jwDict[i.InwardLine.SourceRefId.Value].JobWorkNo
                                     : i.InwardLine.SourceRefId?.ToString(),
                    // Use CreatedAt for accurate inward entry date/time (InwardDate may be date-only)
                    InwardDate = i.InwardLine.Inward?.CreatedAt ?? i.InwardLine.Inward?.InwardDate,
                    SourceDate = (i.InwardLine.SourceType == InwardSourceType.PO && i.InwardLine.SourceRefId.HasValue && poDict != null && poDict.ContainsKey(i.InwardLine.SourceRefId.Value)) ? poDict[i.InwardLine.SourceRefId.Value].CreatedAt
                               : (i.InwardLine.SourceType == InwardSourceType.JobWork && i.InwardLine.SourceRefId.HasValue && jwDict != null && jwDict.ContainsKey(i.InwardLine.SourceRefId.Value)) ? jwDict[i.InwardLine.SourceRefId.Value].CreatedAt
                               : null,
                    IsApproved = i.IsApproved,
                    Remarks = i.Remarks,
                    OriginalDisplayName = i.InwardLine.ItemNameSnapshot ?? i.InwardLine.Item?.CurrentName,
                    NewDisplayNameFromJobWork = i.InwardLine.NewItemNameFromJobWork
                }).ToList()
            };
        }
    }
}
