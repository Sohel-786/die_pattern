using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using System.Text.Json;

namespace net_backend.Controllers
{
    [Route("inwards")]
    [ApiController]
    public class InwardsController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly IWebHostEnvironment _env;
        private readonly IItemStateService _itemState;

        public InwardsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IWebHostEnvironment env, IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _env = env;
            _itemState = itemState;
        }

        // ── Helper: resolve a storage folder for an inward ───────────────────────────
        private string GetInwardStorageDir(string companyName, string locationName, string inwardNo)
        {
            var safe = (string s) => string.Concat(s.Split(Path.GetInvalidFileNameChars())).Trim();
            var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
            return Path.Combine(root, "wwwroot", "storage",
                safe(companyName), safe(locationName), "inward-attachments", safe(inwardNo));
        }

        // ── Temp upload (no inward number yet – stored in temp, returned as URL) ─────
        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment([FromForm] IFormFile? file)
        {
            if (!await HasPermission("CreateInward") && !await HasPermission("EditInward")) return Forbidden();
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
                var dir = Path.Combine(root, "wwwroot", "storage", "inward-attachments-temp");
                Directory.CreateDirectory(dir);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.GetFullPath(Path.Combine(dir, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid file path." });
                await using var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
                await uploadFile.CopyToAsync(stream);
                var url = $"/storage/inward-attachments-temp/{fileName}";
                return Ok(new ApiResponse<object> { Data = new { url } });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = "Upload failed: " + ex.Message });
            }
        }

        // ── Delete a specific attachment file ─────────────────────────────────────────
        [HttpDelete("attachment")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteAttachment([FromQuery] string? url)
        {
            if (!await HasPermission("EditInward") && !await HasPermission("CreateInward")) return Forbidden();
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "URL is required." });

            try
            {
                var decoded = Uri.UnescapeDataString(url.Trim());
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var wwwroot = Path.Combine(root, "wwwroot");
                // The URL is relative, e.g. /storage/companyName/locationName/inward-attachments/INW-001/file.pdf
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
            var code = await _codeGenerator.GenerateCode("INWARD", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<InwardDto>>>> GetAll(
            [FromQuery] List<int>? vendorIds,
            [FromQuery] InwardSourceType? sourceType,
            [FromQuery] string? sourceNo,
            [FromQuery] bool? isActive,
            [FromQuery] string? search,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var locationId = await GetCurrentLocationIdAsync();
            IQueryable<Inward> query = _context.Inwards
                .Where(i => i.LocationId == locationId)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item!)
                        .ThenInclude(i => i!.ItemType)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item!)
                        .ThenInclude(i => i!.Material)
                .Include(i => i.Lines);

            if (vendorIds != null && vendorIds.Any())
                query = query.Where(i => vendorIds.Contains(i.VendorId ?? 0));

            if (sourceType.HasValue)
                query = query.Where(i => i.Lines.Any(l => l.SourceType == sourceType.Value));

            // SECURITY: Only Admin can see inactive entries. For others, force only active records.
            if (!await IsAdmin())
                query = query.Where(i => i.IsActive);
            else if (isActive.HasValue)
                query = query.Where(i => i.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(i =>
                    i.InwardNo.ToLower().Contains(s) ||
                    (i.Vendor != null && i.Vendor.Name.ToLower().Contains(s)) ||
                    (i.Remarks != null && i.Remarks.ToLower().Contains(s)) ||
                    i.Lines.Any(l =>
                        (l.Item != null && l.Item.MainPartName.ToLower().Contains(s)) ||
                        (l.Item != null && (l.Item.CurrentName ?? "").ToLower().Contains(s)) ||
                        (l.Remarks != null && l.Remarks.ToLower().Contains(s))
                    )
                );
            }
            
            if (!string.IsNullOrWhiteSpace(sourceNo))
            {
                var sn = sourceNo.Trim().ToLower();
                // This is a bit expensive but requested: filter by source number across POs and JWs
                query = query.Where(i => i.Lines.Any(l => 
                    (l.SourceType == InwardSourceType.PO && _context.PurchaseOrders.Any(p => p.Id == l.SourceRefId && p.PoNo.ToLower().Contains(sn))) ||
                    (l.SourceType == InwardSourceType.JobWork && _context.JobWorks.Any(j => j.Id == l.SourceRefId && j.JobWorkNo.ToLower().Contains(sn)))
                ));
            }

            if (startDate.HasValue)
            {
                var sd = startDate.Value.Date;
                query = query.Where(i => i.InwardDate >= sd);
            }
            
            if (endDate.HasValue)
            {
                var ed = endDate.Value.Date.AddDays(1);
                query = query.Where(i => i.InwardDate < ed);
            }

            if (!isActive.HasValue && !await IsAdmin())
                query = query.Where(i => i.IsActive);

            var list = await query.OrderByDescending(i => i.CreatedAt).ToListAsync();
            
            // Pre-fetch source numbers for display
            var poIds = list.SelectMany(i => i.Lines).Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var jwIds = list.SelectMany(i => i.Lines).Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();

            var pos = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            var poRates = await _context.PurchaseOrderItems
                .Include(poi => poi.PurchaseIndentItem)
                .Where(poi => poIds.Contains(poi.PurchaseOrderId))
                .ToDictionaryAsync(poi => $"{poi.PurchaseOrderId}_{poi.PurchaseIndentItem!.ItemId}", poi => poi.Rate);
            
            var jws = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id);
            
            var lineIds = list.SelectMany(i => i.Lines).Select(l => l.Id).ToList();
            var qcInfo = await _context.QcItems
                .Where(q => lineIds.Contains(q.InwardLineId))
                .Include(q => q.QcEntry)
                .Select(q => new { q.InwardLineId, q.QcEntry!.QcNo, q.QcEntry.IsActive, q.QcEntry.CreatedAt })
                .ToListAsync();

            var qcs = qcInfo.Where(q => q.IsActive)
                .GroupBy(q => q.InwardLineId)
                .ToDictionary(g => g.Key, g => {
                    var latest = g.OrderByDescending(x => x.CreatedAt).First();
                    return (latest.QcNo, latest.CreatedAt);
                });
            var activeQcLineIds = qcInfo.Where(q => q.IsActive).Select(q => q.InwardLineId).ToHashSet();

            var data = list.Select(i => MapToDto(i, pos, jws, null, qcs, poRates, activeQcLineIds)).ToList();
            return Ok(new ApiResponse<IEnumerable<InwardDto>> { Data = data });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleActive(int id, [FromQuery] bool active)
        {
            if (!await IsAdmin()) return Forbidden();
            if (!await HasPermission("EditInward")) return Forbidden();
            
            var inward = await _context.Inwards
                .Include(i => i.Lines)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (inward == null) return NotFound();
            
            if (inward.IsActive == active) return Ok(new ApiResponse<bool> { Data = true });
            
            if (active)
            {
                // Rule 1: Cannot reactivate if any item in this inward is already active in *another* inward for the same source
                foreach (var line in inward.Lines)
                {
                    if (line.SourceRefId.HasValue)
                    {
                        var alreadyActiveInwardNo = await _context.InwardLines
                            .Include(l => l.Inward)
                            .Where(l => l.SourceType == line.SourceType && 
                                       l.SourceRefId == line.SourceRefId && 
                                       l.ItemId == line.ItemId && 
                                       l.InwardId != id && 
                                       l.Inward!.IsActive)
                            .Select(l => l.Inward!.InwardNo)
                            .FirstOrDefaultAsync();

                        if (alreadyActiveInwardNo != null)
                        {
                            return BadRequest(new ApiResponse<bool> 
                            { 
                                Success = false, 
                                Message = $"Cannot reactivate Inward {inward.InwardNo}: Item ID {line.ItemId} is already associated with an active Inward entry ({alreadyActiveInwardNo}) for this source. One item can only have one active inward record at a time." 
                            });
                        }
                    }
                }
                
                // Rule 2: Sync item states (Back to InwardDone)
                await ProcessInwardMovementsAsync(inward);
            }
            else
            {
                // Rule 3: Cannot deactivate if any line has an Active QC entry
                var lineIds = inward.Lines.Select(l => l.Id).ToList();
                var hasActiveQC = await _context.QcItems
                    .AnyAsync(qi => lineIds.Contains(qi.InwardLineId) && qi.QcEntry != null && qi.QcEntry.IsActive);
                
                if (hasActiveQC)
                {
                    return BadRequest(new ApiResponse<bool> 
                    { 
                        Success = false, 
                        Message = "Cannot deactivate Inward entry because one or more items are currently under Quality Control or have already been inspected in an active entry." 
                    });
                }

                // Rule 3b: PRODUCTION-LEVEL TRACEABILITY: 
                // Cannot deactivate if a LATER active transaction exists for any item.
                foreach (var line in inward.Lines)
                {
                    var (hasDescendant, txInfo) = await _itemState.CheckForDescendantTransactionsAsync(line.ItemId, inward.CreatedAt, inward.Id, "Inward");
                    if (hasDescendant)
                    {
                        var item = await _context.Items.FindAsync(line.ItemId);
                        return BadRequest(new ApiResponse<bool>
                        {
                            Success = false,
                            Message = $"Cannot deactivate Inward {inward.InwardNo}: Item '{item?.MainPartName}' has a subsequent active operation: {txInfo}. You must deactivate the latest operation first."
                        });
                    }
                }
                
                // Rule 4: Revert item states
                foreach (var line in inward.Lines)
                {
                    var item = await _context.Items.FindAsync(line.ItemId);
                    if (item != null && item.CurrentProcess == ItemProcessState.InwardDone)
                    {
                        if (line.SourceType == InwardSourceType.PO)
                        {
                            item.CurrentProcess = ItemProcessState.InPO;
                            item.CurrentPartyId = null;
                            item.UpdatedAt = DateTime.Now;
                        }
                        else if (line.SourceType == InwardSourceType.JobWork)
                        {
                            item.CurrentProcess = ItemProcessState.InJobwork;
                            var jw = await _context.JobWorks.FindAsync(line.SourceRefId);
                            if (jw != null) item.CurrentPartyId = jw.ToPartyId;
                            item.CurrentLocationId = null;
                            item.UpdatedAt = DateTime.Now;
                        }
                    }
                }
            }
            
            inward.IsActive = active;
            inward.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            
            // Rule 5: Refresh source statuses (e.g. Completed -> InTransit if an inward is deactivated)
            await RefreshSourceStatusesAsync(inward.Lines);

            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<InwardDto>>> GetById(int id)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var inward = await _context.Inwards
                .Include(i => i.Location)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (inward == null) return NotFound();
            if (!inward.IsActive && !await IsAdmin()) return NotFound();

            // Fetch source details for single result too
            var poIds = inward.Lines.Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var jwIds = inward.Lines.Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();

            var pos = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id);
            var poRates = await _context.PurchaseOrderItems
                .Include(poi => poi.PurchaseIndentItem)
                .Where(poi => poIds.Contains(poi.PurchaseOrderId))
                .ToDictionaryAsync(poi => $"{poi.PurchaseOrderId}_{poi.PurchaseIndentItem!.ItemId}", poi => poi.Rate);

            var jws = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id);
            
            var lineIds = inward.Lines.Select(l => l.Id).ToList();
            var qcInfo = await _context.QcItems
                .Where(q => q.InwardLine!.InwardId == id)
                .Include(q => q.QcEntry)
                .Select(q => new { q.InwardLineId, q.QcEntry!.QcNo, q.QcEntry.IsActive, q.QcEntry.CreatedAt })
                .ToListAsync();

            var qcs = qcInfo.Where(q => q.IsActive)
                .GroupBy(q => q.InwardLineId)
                .ToDictionary(g => g.Key, g => {
                    var latest = g.OrderByDescending(x => x.CreatedAt).First();
                    return (latest.QcNo, latest.CreatedAt);
                });
            var activeQcLineIds = qcInfo.Where(q => q.IsActive).Select(q => q.InwardLineId).ToHashSet();

            return Ok(new ApiResponse<InwardDto> { Data = MapToDto(inward, pos, jws, null, qcs, poRates, activeQcLineIds) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Inward>>> Create([FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.VendorId <= 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "Vendor / Party is mandatory." });

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one inward item is required." });

            var inward = new Inward
            {
                InwardNo = await _codeGenerator.GenerateCode("INWARD", locationId),
                InwardDate = dto.InwardDate ?? DateTime.Now.Date,
                LocationId = locationId,
                VendorId = dto.VendorId,
                Remarks = dto.Remarks,
                AttachmentUrlsJson = dto.AttachmentUrls != null && dto.AttachmentUrls.Count > 0
                    ? JsonSerializer.Serialize(dto.AttachmentUrls) : null,
                Status = InwardStatus.Submitted,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                IsActive = true
            };

            var itemIds = dto.Lines.Select(l => l.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Include(i => i.ItemType)
                .Include(i => i.Material)
                .Where(i => itemIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id);

            foreach (var l in dto.Lines)
            {
                if (l.Quantity < 1) continue;
                
                // Validate source for each line if provided
                if (l.SourceRefId.HasValue) {
                   try { 
                       var vid = await ValidateInwardLineAsync(locationId, l.SourceType, l.SourceRefId.Value, l.ItemId, null); 
                       if (inward.VendorId == null) inward.VendorId = vid;
                   }
                   catch (ArgumentException ex) { return BadRequest(new ApiResponse<Inward> { Success = false, Message = ex.Message }); }
                }

                var item = items.ContainsKey(l.ItemId) ? items[l.ItemId] : null;
                inward.Lines.Add(new InwardLine { 
                    ItemId = l.ItemId, 
                    ItemTypeName = item?.ItemType?.Name,
                    MaterialName = item?.Material?.Name,
                    DrawingNo = item?.DrawingNo,
                    RevisionNo = item?.RevisionNo,
                    Quantity = l.Quantity,
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks,
                    Rate = l.Rate,
                    GstPercent = l.GstPercent,
                    IsQCPending = true,
                    IsQCApproved = false
                });
            }

            if (inward.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one valid line is required." });

            _context.Inwards.Add(inward);
            await _context.SaveChangesAsync();
            
            await ProcessInwardMovementsAsync(inward);
            
            return StatusCode(201, new ApiResponse<Inward> { Data = inward });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("EditInward")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var inward = await _context.Inwards.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (inward == null) return NotFound();

            if (dto.VendorId <= 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Vendor / Party is mandatory." });

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one inward item is required." });

            var existingLineIds = inward.Lines.Select(l => l.Id).ToList();
            var hasActiveQC = await _context.QcItems.AnyAsync(qi => existingLineIds.Contains(qi.InwardLineId) && qi.QcEntry != null && qi.QcEntry.IsActive);
            
            if (hasActiveQC)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot update Inward entry because one or more items are currently under Quality Control or have already been inspected." });

            inward.InwardDate = dto.InwardDate ?? inward.InwardDate;
            inward.VendorId = dto.VendorId;
            inward.Remarks = dto.Remarks;
            inward.AttachmentUrlsJson = dto.AttachmentUrls != null
                ? (dto.AttachmentUrls.Count > 0 ? JsonSerializer.Serialize(dto.AttachmentUrls) : null)
                : inward.AttachmentUrlsJson;
            inward.UpdatedAt = DateTime.Now;

            var itemIds = dto.Lines.Select(l => l.ItemId).Distinct().ToList();
            var items = await _context.Items
                .Include(i => i.ItemType)
                .Include(i => i.Material)
                .Where(i => itemIds.Contains(i.Id))
                .ToDictionaryAsync(i => i.Id);

            // Simple approach: remove lines and recreate (which will recreate movements if we are not careful)
            // But if Movement already exists and we remove the line, what happens?
            // For now, let's just update the header. If items changed, they should recreate.
            // Actually, I'll clear lines and movements linked to this inward and recreate.
            
            _context.InwardLines.RemoveRange(inward.Lines);
            
            foreach (var l in dto.Lines)
            {
                if (l.Quantity < 1) continue;
                
                if (l.SourceRefId.HasValue) {
                   try { 
                       var vid = await ValidateInwardLineAsync(locationId, l.SourceType, l.SourceRefId.Value, l.ItemId, id); 
                       if (inward.VendorId == null) inward.VendorId = vid;
                   }
                   catch (ArgumentException ex) { return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message }); }
                }

                var item = items.ContainsKey(l.ItemId) ? items[l.ItemId] : null;
                inward.Lines.Add(new InwardLine { 
                    ItemId = l.ItemId, 
                    ItemTypeName = item?.ItemType?.Name,
                    MaterialName = item?.Material?.Name,
                    DrawingNo = item?.DrawingNo,
                    RevisionNo = item?.RevisionNo,
                    Quantity = l.Quantity,
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks,
                    Rate = l.Rate,
                    GstPercent = l.GstPercent
                });
            }

            await _context.SaveChangesAsync();
            await ProcessInwardMovementsAsync(inward);
            
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public ActionResult<ApiResponse<bool>> Submit(int id)
        {
            // Legacy endpoint, keep for compatibility but now handled in Create
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private async Task RefreshSourceStatusesAsync(ICollection<InwardLine> lines)
        {
            var jwIdsToCheck = lines
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue)
                .Select(l => l.SourceRefId!.Value)
                .Distinct()
                .ToList();

            foreach (var jwId in jwIdsToCheck)
            {
                var jw = await _context.JobWorks.Include(j => j.Items).FirstOrDefaultAsync(j => j.Id == jwId);
                if (jw != null)
                {
                    var originalItemIds = jw.Items.Select(i => i.ItemId).ToList();
                    var inwardedItemIds = await _context.InwardLines
                        .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == jwId && l.Inward != null && l.Inward.IsActive)
                        .Select(l => l.ItemId)
                        .ToListAsync();

                    var inwardedSet = inwardedItemIds.ToHashSet();
                    
                    if (originalItemIds.Count > 0 && originalItemIds.All(id => inwardedSet.Contains(id)))
                    {
                        jw.Status = JobWorkStatus.Completed;
                    }
                    else if (inwardedSet.Count > 0)
                    {
                        jw.Status = JobWorkStatus.InTransit;
                    }
                    else
                    {
                        jw.Status = JobWorkStatus.Pending;
                    }
                    jw.UpdatedAt = DateTime.Now;
                }
            }
            await _context.SaveChangesAsync();
        }

        private async Task ProcessInwardMovementsAsync(Inward inward)
        {
            foreach (var line in inward.Lines)
            {
                var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == line.ItemId);
                if (item != null)
                {
                    // Item is now back at location, awaiting QC
                    item.CurrentProcess = ItemProcessState.InwardDone;
                    item.CurrentLocationId = inward.LocationId;
                    item.CurrentPartyId = null; // No longer with vendor/party
                    item.UpdatedAt = DateTime.Now;
                    _context.Items.Update(item);
                }
            }

            await RefreshSourceStatusesAsync(inward.Lines);
        }

        private async Task<int?> ValidateInwardLineAsync(int locationId, InwardSourceType sourceType, int sourceRefId, int itemId, int? excludeInwardId)
        {
            int? vendorId = null;

            // Check if item already has an active Inward for this source
            var alreadyActive = await _context.InwardLines
                .AnyAsync(l => l.SourceType == sourceType && 
                               l.SourceRefId == sourceRefId && 
                               l.ItemId == itemId && 
                               l.InwardId != excludeInwardId && 
                               l.Inward!.IsActive);
            
            if (alreadyActive)
                throw new ArgumentException($"Item ID {itemId} already has an active Inward record for this source. Only one active Inward is allowed per item per source.");

            if (sourceType == InwardSourceType.PO)
            {
                var po = await _context.PurchaseOrders
                    .Include(p => p.Items)
                        .ThenInclude(i => i.PurchaseIndentItem)
                    .FirstOrDefaultAsync(p => p.Id == sourceRefId && p.LocationId == locationId);

                if (po == null) throw new ArgumentException("Invalid PO reference or PO not in current location.");
                if (po.Status != PoStatus.Approved) throw new ArgumentException("Only approved POs can be used for Inward.");
                if (!po.IsActive) throw new ArgumentException("Inactive POs cannot be used for Inward.");

                var poItemIds = po.Items.Where(poi => poi.PurchaseIndentItem != null).Select(poi => poi.PurchaseIndentItem!.ItemId).ToList();
                if (!poItemIds.Contains(itemId))
                    throw new ArgumentException($"Item ID {itemId} does not belong to Purchase Order {po.PoNo}.");

                vendorId = po.VendorId;
            }
            else if (sourceType == InwardSourceType.JobWork)
            {
                var jw = await _context.JobWorks
                    .Include(j => j.Items)
                    .FirstOrDefaultAsync(j => j.Id == sourceRefId && j.LocationId == locationId);

                if (jw == null) throw new ArgumentException("Invalid Job Work reference or not in current location.");
                if (!jw.IsActive) throw new ArgumentException("Inactive Job Work entries cannot be used for Inward.");
                
                var jwItemIds = jw.Items.Select(i => i.ItemId).ToList();
                if (!jwItemIds.Contains(itemId))
                    throw new ArgumentException($"Item ID {itemId} does not belong to Job Work {jw.JobWorkNo}.");
                
                vendorId = jw.ToPartyId;
            }
            return vendorId;
        }

        private static InwardDto MapToDto(
            Inward i, 
            Dictionary<int, PurchaseOrder>? pos = null, 
            Dictionary<int, JobWork>? jws = null,
            Dictionary<int, string>? outs = null,
            Dictionary<int, (string QcNo, DateTime CreatedAt)>? qcs = null,
            Dictionary<string, decimal>? poRates = null,
            HashSet<int>? activeQcLineIds = null)
        {
            var sourceTypes = i.Lines.Select(l => l.SourceType).Distinct().ToList();
            var fromStrs = new List<string>();
            if (sourceTypes.Contains(InwardSourceType.PO)) fromStrs.Add("Purchase Order");
            if (sourceTypes.Contains(InwardSourceType.JobWork)) fromStrs.Add("Job Work");

            var dto = new InwardDto
            {
                Id = i.Id,
                InwardNo = i.InwardNo,
                InwardDate = i.InwardDate,
                VendorId = i.VendorId,
                VendorName = i.Vendor?.Name,
                Remarks = i.Remarks,
                Status = i.Status,
                CreatedBy = i.CreatedBy,
                CreatorName = i.Creator != null ? i.Creator.FirstName + " " + i.Creator.LastName : null,
                IsActive = i.IsActive,
                InwardFrom = string.Join(", ", fromStrs),
                CreatedAt = i.CreatedAt,
                HasActiveQC = activeQcLineIds != null && i.Lines.Any(l => activeQcLineIds.Contains(l.Id)),
                AttachmentUrls = string.IsNullOrWhiteSpace(i.AttachmentUrlsJson)
                    ? new List<string>()
                    : (JsonSerializer.Deserialize<List<string>>(i.AttachmentUrlsJson) ?? new List<string>()),
                Lines = i.Lines.Select(l => new InwardLineDto
                {
                    Id = l.Id,
                    InwardId = l.InwardId,
                    ItemId = l.ItemId,
                    ItemName = l.Item?.CurrentName ?? "—",
                    MainPartName = l.Item?.MainPartName ?? "—",
                    ItemTypeName = l.ItemTypeName ?? l.Item?.ItemType?.Name,
                    MaterialName = l.MaterialName ?? l.Item?.Material?.Name,
                    DrawingNo = l.DrawingNo ?? l.Item?.DrawingNo,
                    RevisionNo = l.RevisionNo ?? l.Item?.RevisionNo,
                    Quantity = l.Quantity,
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks,
                    SourceRefDisplay = (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && pos != null && pos.ContainsKey(l.SourceRefId.Value)) ? pos[l.SourceRefId.Value].PoNo
                                     : (l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue && jws != null && jws.ContainsKey(l.SourceRefId.Value)) ? jws[l.SourceRefId.Value].JobWorkNo
                                     : l.SourceRefId?.ToString(),
                    IsQCPending = l.IsQCPending,
                    IsQCApproved = l.IsQCApproved,
                    QCNo = (qcs != null && qcs.TryGetValue(l.Id, out var qcRow)) ? qcRow.QcNo : "—",
                    QCDate = (qcs != null && qcs.TryGetValue(l.Id, out var qcRowDate)) ? qcRowDate.CreatedAt : null,
                    HasActiveQC = activeQcLineIds != null && activeQcLineIds.Contains(l.Id),
                    Rate = l.Rate,
                    GstPercent = l.GstPercent,
                    SourceRate = (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && poRates != null && poRates.ContainsKey($"{l.SourceRefId}_{l.ItemId}")) 
                                   ? poRates[$"{l.SourceRefId}_{l.ItemId}"]
                                   : null,
                    SourceGstPercent = (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && pos != null && pos.ContainsKey(l.SourceRefId.Value))
                                   ? pos[l.SourceRefId.Value].GstPercent
                                   : null,
                    SourceDate = (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && pos != null && pos.ContainsKey(l.SourceRefId.Value)) ? pos[l.SourceRefId.Value].CreatedAt
                               : (l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue && jws != null && jws.ContainsKey(l.SourceRefId.Value)) ? jws[l.SourceRefId.Value].CreatedAt
                               : null
                }).ToList()
            };
            return dto;
        }
    }
}
