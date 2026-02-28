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

        public InwardsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IWebHostEnvironment env) : base(context)
        {
            _codeGenerator = codeGenerator;
            _env = env;
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
            var query = _context.Inwards
                .Where(i => i.LocationId == locationId)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                        .ThenInclude(i => i.ItemType)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                        .ThenInclude(i => i.Material)
                .Include(i => i.Lines)
                .OrderByDescending(i => i.CreatedAt)
                .AsQueryable();

            if (vendorIds != null && vendorIds.Any())
                query = query.Where(i => vendorIds.Contains(i.VendorId ?? 0));

            if (sourceType.HasValue)
                query = query.Where(i => i.Lines.Any(l => l.SourceType == sourceType.Value));

            if (isActive.HasValue)
                query = query.Where(i => i.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(i => i.InwardNo.Contains(search) || (i.Vendor != null && i.Vendor.Name.Contains(search)));
            }
            
            if (!string.IsNullOrWhiteSpace(sourceNo))
            {
                // This is a bit expensive but requested: filter by source number across POs and JWs
                query = query.Where(i => i.Lines.Any(l => 
                    (l.SourceType == InwardSourceType.PO && _context.PurchaseOrders.Any(p => p.Id == l.SourceRefId && p.PoNo.Contains(sourceNo))) ||
                    (l.SourceType == InwardSourceType.JobWork && _context.JobWorks.Any(j => j.Id == l.SourceRefId && j.JobWorkNo.Contains(sourceNo))) ||
                    (l.SourceType == InwardSourceType.OutwardReturn && _context.Outwards.Any(o => o.Id == l.SourceRefId && o.OutwardNo != null && o.OutwardNo.Contains(sourceNo)))
                ));
            }

            if (startDate.HasValue)
                query = query.Where(i => i.InwardDate >= startDate.Value.Date);
            
            if (endDate.HasValue)
                query = query.Where(i => i.InwardDate <= endDate.Value.Date);

            var list = await query.ToListAsync();
            
            // Pre-fetch source numbers for display
            var poIds = list.SelectMany(i => i.Lines).Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var jwIds = list.SelectMany(i => i.Lines).Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var outIds = list.SelectMany(i => i.Lines).Where(l => l.SourceType == InwardSourceType.OutwardReturn && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();

            var pos = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.PoNo);
            var jws = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id, j => j.JobWorkNo);
            var outs = await _context.Outwards.Where(o => outIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.OutwardNo ?? $"OUT-{o.Id}");
            
            var lineIds = list.SelectMany(i => i.Lines).Select(l => l.Id).ToList();
            var qcs = await _context.QcItems
                .Where(q => lineIds.Contains(q.InwardLineId))
                .Include(q => q.QcEntry)
                .ToDictionaryAsync(q => q.InwardLineId, q => q.QcEntry!.QcNo);

            var data = list.Select(i => MapToDto(i, pos, jws, outs, qcs)).ToList();
            return Ok(new ApiResponse<IEnumerable<InwardDto>> { Data = data });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleActive(int id, [FromQuery] bool active)
        {
            if (!await HasPermission("EditInward")) return Forbidden();
            var inward = await _context.Inwards.FindAsync(id);
            if (inward == null) return NotFound();
            inward.IsActive = active;
            inward.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
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

            // Fetch source details for single result too
            var poIds = inward.Lines.Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var jwIds = inward.Lines.Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();
            var outIds = inward.Lines.Where(l => l.SourceType == InwardSourceType.OutwardReturn && l.SourceRefId.HasValue).Select(l => l.SourceRefId!.Value).Distinct().ToList();

            var pos = await _context.PurchaseOrders.Where(p => poIds.Contains(p.Id)).ToDictionaryAsync(p => p.Id, p => p.PoNo);
            var jws = await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id, j => j.JobWorkNo);
            var outs = await _context.Outwards.Where(o => outIds.Contains(o.Id)).ToDictionaryAsync(o => o.Id, o => o.OutwardNo ?? $"OUT-{o.Id}");
            
            var lineIds = inward.Lines.Select(l => l.Id).ToList();
            var qcs = await _context.QcItems
                .Where(q => lineIds.Contains(q.InwardLineId))
                .Include(q => q.QcEntry)
                .ToDictionaryAsync(q => q.InwardLineId, q => q.QcEntry!.QcNo);

            return Ok(new ApiResponse<InwardDto> { Data = MapToDto(inward, pos, jws, outs, qcs) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Inward>>> Create([FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one line is required." });

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
                       var vid = await ValidateSourceRefAsync(locationId, l.SourceType, l.SourceRefId.Value); 
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

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one line is required." });

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
                       var vid = await ValidateSourceRefAsync(locationId, l.SourceType, l.SourceRefId.Value); 
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
                    Remarks = l.Remarks
                });
            }

            await _context.SaveChangesAsync();
            await ProcessInwardMovementsAsync(inward);
            
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public async Task<ActionResult<ApiResponse<bool>>> Submit(int id)
        {
            // Legacy endpoint, keep for compatibility but now handled in Create
            return Ok(new ApiResponse<bool> { Data = true });
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

                // Update source status if necessary
                if (line.SourceType == InwardSourceType.JobWork && line.SourceRefId.HasValue)
                {
                    var jw = await _context.JobWorks.FindAsync(line.SourceRefId.Value);
                    if (jw != null)
                    {
                        jw.Status = JobWorkStatus.Completed;
                        jw.UpdatedAt = DateTime.Now;
                    }
                }
            }
            await _context.SaveChangesAsync();
        }

        private async Task<int?> ValidateSourceRefAsync(int locationId, InwardSourceType sourceType, int sourceRefId)
        {
            int? vendorId = null;
            if (sourceType == InwardSourceType.PO)
            {
                var po = await _context.PurchaseOrders.Include(p => p.Items).ThenInclude(i => i.PurchaseIndentItem).FirstOrDefaultAsync(p => p.Id == sourceRefId && p.LocationId == locationId);
                if (po == null) throw new ArgumentException("Invalid PO reference or PO not in current location.");
                if (po.Status != PoStatus.Approved) throw new ArgumentException("Only approved POs can be used for Inward.");
                if (!po.IsActive) throw new ArgumentException("Inactive POs cannot be used for Inward.");
                var poItemIds = po.Items.Where(poi => poi.PurchaseIndentItem != null).Select(poi => poi.PurchaseIndentItem!.ItemId).ToHashSet();
                
                var inwardedFromPo = await _context.InwardLines
                    .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == sourceRefId && l.Inward != null && l.Inward.IsActive)
                    .Select(l => l.ItemId)
                    .ToListAsync();

                var inwardedSet = inwardedFromPo.ToHashSet();
                if (poItemIds.Count > 0 && poItemIds.All(id => inwardedSet.Contains(id)))
                    throw new ArgumentException("This PO is already fully inwarded.");
                vendorId = po.VendorId;
            }
            else if (sourceType == InwardSourceType.OutwardReturn)
            {
                var outward = await _context.Outwards.FirstOrDefaultAsync(o => o.Id == sourceRefId);
                if (outward == null) throw new ArgumentException("Invalid Outward reference.");
                var alreadyInwarded = await _context.InwardLines.AnyAsync(l => l.SourceType == InwardSourceType.OutwardReturn && l.SourceRefId == sourceRefId && l.Inward != null && l.Inward.IsActive);
                if (alreadyInwarded) throw new ArgumentException("This Outward challan has already been inwarded.");
                vendorId = outward.PartyId;
            }
            else if (sourceType == InwardSourceType.JobWork)
            {
                var jw = await _context.JobWorks.FirstOrDefaultAsync(j => j.Id == sourceRefId && j.LocationId == locationId);
                if (jw == null) throw new ArgumentException("Invalid Job Work reference or not in current location.");
                if (jw.Status != JobWorkStatus.Pending) throw new ArgumentException("Only pending Job Work entries (not yet inwarded) can be used for Inward.");
                var alreadyInwarded = await _context.InwardLines.AnyAsync(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == sourceRefId && l.Inward != null && l.Inward.IsActive);
                if (alreadyInwarded) throw new ArgumentException("This Job Work has already been inwarded.");
            }
            return vendorId;
        }

        private static InwardDto MapToDto(
            Inward i, 
            Dictionary<int, string>? pos = null, 
            Dictionary<int, string>? jws = null,
            Dictionary<int, string>? outs = null,
            Dictionary<int, string>? qcs = null)
        {
            var sourceTypes = i.Lines.Select(l => l.SourceType).Distinct().ToList();
            var fromStrs = new List<string>();
            if (sourceTypes.Contains(InwardSourceType.PO)) fromStrs.Add("Purchase Order");
            if (sourceTypes.Contains(InwardSourceType.JobWork)) fromStrs.Add("Job Work");
            if (sourceTypes.Contains(InwardSourceType.OutwardReturn)) fromStrs.Add("Outward");

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
                    SourceRefDisplay = (l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && pos != null && pos.ContainsKey(l.SourceRefId.Value)) ? pos[l.SourceRefId.Value]
                                     : (l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue && jws != null && jws.ContainsKey(l.SourceRefId.Value)) ? jws[l.SourceRefId.Value]
                                     : (l.SourceType == InwardSourceType.OutwardReturn && l.SourceRefId.HasValue && outs != null && outs.ContainsKey(l.SourceRefId.Value)) ? outs[l.SourceRefId.Value]
                                     : l.SourceRefId?.ToString(),
                    IsQCPending = l.IsQCPending,
                    IsQCApproved = l.IsQCApproved,
                    QCNo = (qcs != null && qcs.ContainsKey(l.Id)) ? qcs[l.Id] : "—"
                }).ToList()
            };
            return dto;
        }
    }
}
