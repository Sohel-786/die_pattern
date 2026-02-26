using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("purchase-orders")]
    [ApiController]
    public class PurchaseOrdersController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly IWebHostEnvironment _env;

        public PurchaseOrdersController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IWebHostEnvironment env) : base(context)
        {
            _codeGenerator = codeGenerator;
            _env = env;
        }

        private static void MapToDto(PurchaseOrder po, PODto dto)
        {
            dto.Id = po.Id;
            dto.PoNo = po.PoNo;
            dto.VendorId = po.VendorId;
            dto.VendorName = po.Vendor?.Name;
            dto.DeliveryDate = po.DeliveryDate;
            dto.QuotationNo = po.QuotationNo;
            dto.QuotationUrls = QuotationUrlsHelper.FromJson(po.QuotationUrlsJson);
            dto.GstType = po.GstType.HasValue ? (GstType)po.GstType.Value : null;
            dto.GstPercent = po.GstPercent;
            decimal subtotal = po.Items.Sum(i => i.Rate);
            dto.Subtotal = Math.Round(subtotal, 2);
            if (po.GstType.HasValue && po.GstPercent.HasValue && po.GstPercent.Value > 0)
            {
                dto.GstAmount = Math.Round(subtotal * po.GstPercent.Value / 100, 2);
                dto.TotalAmount = Math.Round(subtotal + dto.GstAmount.Value, 2);
            }
            else
            {
                dto.GstAmount = null;
                dto.TotalAmount = dto.Subtotal;
            }
            dto.Status = po.Status;
            dto.Remarks = po.Remarks;
            dto.CreatedAt = po.CreatedAt;
            dto.CreatorName = po.Creator != null ? po.Creator.FirstName + " " + po.Creator.LastName : null;
            dto.ApprovedBy = po.ApprovedBy;
            dto.ApproverName = po.Approver != null ? po.Approver.FirstName + " " + po.Approver.LastName : null;
            dto.ApprovedAt = po.ApprovedAt;
            dto.PurchaseType = po.PurchaseType;
            dto.IsActive = po.IsActive;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("PO", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        /// <summary>Approved PI items that can be selected for this PO: not in any active PO, or already in this PO (for edit).</summary>
        [HttpGet("approved-items-for-edit")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentItemDto>>>> GetApprovedItemsForEdit([FromQuery] int? poId)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.ItemType)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.Material)
                .Where(pii => pii.Item != null && pii.Item.LocationId == locationId &&
                             pii.PurchaseIndent!.Status == PurchaseIndentStatus.Approved && pii.PurchaseIndent.IsActive);

            if (poId.HasValue)
                query = query.Where(pii => !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive) || _context.PurchaseOrderItems.Any(poi => poi.PurchaseOrderId == poId && poi.PurchaseIndentItemId == pii.Id));
            else
                query = query.Where(pii => !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive));

            var items = await query
                .Select(pii => new PurchaseIndentItemDto
                {
                    Id = pii.Id,
                    PurchaseIndentId = pii.PurchaseIndentId,
                    PiNo = pii.PurchaseIndent != null ? pii.PurchaseIndent.PiNo : null,
                    ItemId = pii.ItemId,
                    MainPartName = pii.Item!.MainPartName,
                    CurrentName = pii.Item.CurrentName,
                    ItemTypeName = pii.Item.ItemType != null ? pii.Item.ItemType.Name : "N/A",
                    DrawingNo = pii.Item.DrawingNo,
                    RevisionNo = pii.Item.RevisionNo,
                    MaterialName = pii.Item.Material != null ? pii.Item.Material.Name : "N/A"
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<PurchaseIndentItemDto>> { Data = items });
        }

        [HttpPost("upload-quotation")]
        public async Task<ActionResult<ApiResponse<object>>> UploadQuotation([FromForm] IFormFile? file)
        {
            if (!await HasPermission("CreatePO")) return Forbidden();

            // Support both "file" and "file" from FormData (some clients send different names)
            var uploadFile = file ?? Request.Form.Files?.FirstOrDefault(f => f.Name == "file" || f.Length > 0);
            if (uploadFile == null || uploadFile.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file uploaded." });

            const long maxBytes = 20 * 1024 * 1024; // 20 MB
            if (uploadFile.Length > maxBytes)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "File size must be under 20 MB." });

            var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp" };
            var ext = Path.GetExtension(uploadFile.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Only PDF and image files (PNG, JPG, JPEG, GIF, WEBP) are allowed." });

            try
            {
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var dir = Path.Combine(root, "wwwroot", "storage", "po-quotations");
                if (!Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                var fileName = $"{Guid.NewGuid()}{ext}";
                var filePath = Path.GetFullPath(Path.Combine(dir, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid file path." });

                await using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
                    await uploadFile.CopyToAsync(stream);

                var url = $"/storage/po-quotations/{fileName}";
                return Ok(new ApiResponse<object> { Data = new { url } });
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = "Access denied to storage folder." });
            }
            catch (IOException ex)
            {
                return StatusCode(500, new ApiResponse<object> { Success = false, Message = "File save failed: " + ex.Message });
            }
        }

        /// <summary>Delete a quotation file from storage. Called when user removes a file in PO edit mode.</summary>
        [HttpDelete("quotation")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteQuotation([FromQuery] string? url)
        {
            if (!await HasPermission("EditPO") && !await HasPermission("CreatePO")) return Forbidden();
            if (string.IsNullOrWhiteSpace(url))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Quotation URL is required." });

            var decoded = Uri.UnescapeDataString(url.Trim());
            if (!decoded.StartsWith("/storage/po-quotations/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Invalid quotation path." });

            var fileName = Path.GetFileName(decoded);
            if (string.IsNullOrEmpty(fileName) || fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Invalid file name." });

            try
            {
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var dir = Path.Combine(root, "wwwroot", "storage", "po-quotations");
                var filePath = Path.GetFullPath(Path.Combine(dir, fileName));
                if (!filePath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Invalid path." });
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (UnauthorizedAccessException)
            {
                return StatusCode(500, new ApiResponse<bool> { Success = false, Message = "Access denied to storage." });
            }
            catch (IOException ex)
            {
                return StatusCode(500, new ApiResponse<bool> { Success = false, Message = "Delete failed: " + ex.Message });
            }
        }

        /// <summary>Set PO to inactive. Fails if any inward has been done from this PO.</summary>
        [HttpPatch("{id}/inactive")]
        public async Task<ActionResult<ApiResponse<bool>>> SetInactive(int id)
        {
            if (!await HasPermission("EditPO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();

            var hasInward = await _context.Inwards.AnyAsync(i => i.SourceType == InwardSourceType.PO && i.SourceRefId == id);
            if (hasInward)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot deactivate: one or more items from this PO have been inwarded. Inactive is allowed only when no inward has been done against this PO." });

            po.IsActive = false;
            po.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        /// <summary>Set PO to active. Fails if any of this PO's PI items are now in another active PO.</summary>
        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> SetActive(int id)
        {
            if (!await HasPermission("EditPO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();

            foreach (var poi in po.Items)
            {
                var inOtherActivePo = await _context.PurchaseOrderItems
                    .AnyAsync(x => x.PurchaseIndentItemId == poi.PurchaseIndentItemId && x.PurchaseOrderId != id && x.PurchaseOrder != null && x.PurchaseOrder.IsActive);
                if (inOtherActivePo)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot reactivate: one or more items from this PO have been used in another active PO. Reactivation is allowed only when none of its PI items are in any other PO." });
            }

            po.IsActive = true;
            po.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PODto>>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] DateTime? poDateFrom,
            [FromQuery] DateTime? poDateTo,
            [FromQuery] string? vendorIds,
            [FromQuery] string? purchaseType,
            [FromQuery] DateTime? deliveryDateFrom,
            [FromQuery] DateTime? deliveryDateTo,
            [FromQuery] string? itemIds,
            [FromQuery] decimal? rateMin,
            [FromQuery] decimal? rateMax)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.PurchaseOrders
                .Where(p => p.LocationId == locationId)
                .Include(p => p.Vendor)
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.ItemType)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.Material)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .AsQueryable();

            var searchTrim = (search ?? "").Trim();
            if (!string.IsNullOrEmpty(searchTrim))
            {
                searchTrim = searchTrim.ToLowerInvariant();
                query = query.Where(p =>
                    p.PoNo.ToLower().Contains(searchTrim) ||
                    (p.Vendor != null && p.Vendor.Name != null && p.Vendor.Name.ToLower().Contains(searchTrim)));
            }

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PoStatus>(status, true, out var statusEnum))
                query = query.Where(p => p.Status == statusEnum);

            if (poDateFrom.HasValue)
                query = query.Where(p => p.CreatedAt.Date >= poDateFrom.Value.Date);
            if (poDateTo.HasValue)
                query = query.Where(p => p.CreatedAt.Date <= poDateTo.Value.Date);

            var vendorIdList = (vendorIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (vendorIdList.Count > 0)
                query = query.Where(p => vendorIdList.Contains(p.VendorId));

            if (!string.IsNullOrWhiteSpace(purchaseType))
                query = query.Where(p => p.PurchaseType == purchaseType);

            if (deliveryDateFrom.HasValue)
                query = query.Where(p => p.DeliveryDate != null && p.DeliveryDate.Value.Date >= deliveryDateFrom.Value.Date);
            if (deliveryDateTo.HasValue)
                query = query.Where(p => p.DeliveryDate != null && p.DeliveryDate.Value.Date <= deliveryDateTo.Value.Date);

            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0)
                query = query.Where(p => p.Items.Any(i => i.PurchaseIndentItem != null && itemIdList.Contains(i.PurchaseIndentItem.ItemId)));

            if (rateMin.HasValue)
                query = query.Where(p => p.Items.Any(i => i.Rate >= rateMin.Value));
            if (rateMax.HasValue)
                query = query.Where(p => p.Items.Any(i => i.Rate <= rateMax.Value));

            var list = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
            var poIdsWithInward = await _context.Inwards
                .Where(i => i.SourceType == InwardSourceType.PO)
                .Select(i => i.SourceRefId)
                .Distinct()
                .ToListAsync();

            var data = list.Select(p =>
            {
                var dto = new PODto
                {
                    Id = p.Id,
                    HasInward = poIdsWithInward.Contains(p.Id),
                    PoNo = p.PoNo,
                    VendorId = p.VendorId,
                    VendorName = p.Vendor != null ? p.Vendor.Name : "Unknown",
                    DeliveryDate = p.DeliveryDate,
                    QuotationNo = p.QuotationNo,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt,
                    CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null,
                    ApprovedBy = p.ApprovedBy,
                    ApproverName = p.Approver != null ? p.Approver.FirstName + " " + p.Approver.LastName : null,
                    ApprovedAt = p.ApprovedAt,
                    Items = p.Items.Select(i => new POItemDto
                    {
                        Id = i.Id,
                        PurchaseIndentItemId = i.PurchaseIndentItemId,
                        ItemId = i.PurchaseIndentItem!.ItemId,
                        MainPartName = i.PurchaseIndentItem!.Item!.MainPartName,
                        CurrentName = i.PurchaseIndentItem.Item.CurrentName,
                        ItemTypeName = i.PurchaseIndentItem.Item.ItemType?.Name,
                        DrawingNo = i.PurchaseIndentItem.Item.DrawingNo,
                        RevisionNo = i.PurchaseIndentItem.Item.RevisionNo,
                        MaterialName = i.PurchaseIndentItem.Item.Material?.Name,
                        PiNo = i.PurchaseIndentItem.PurchaseIndent!.PiNo,
                        PurchaseIndentId = i.PurchaseIndentItem.PurchaseIndentId,
                        Rate = i.Rate
                    }).ToList()
                };
                MapToDto(p, dto);
                return dto;
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<PODto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PurchaseOrder>>> Create([FromBody] CreatePODto dto)
        {
            if (!await HasPermission("CreatePO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var items = dto.Items?.Where(i => i.PurchaseIndentItemId > 0).ToList() ?? new List<CreatePOItemDto>();
            if (items.Count == 0) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "At least one item with rate is required." });

            var piItemIds = items.Select(i => i.PurchaseIndentItemId).Distinct().ToList();
            if (piItemIds.Count != items.Count)
                return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "Duplicate die/pattern in the same PO is not allowed." });

            var alreadyInPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId));
            if (alreadyInPo) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "One or more items are already assigned to a PO." });

            if (dto.DeliveryDate.HasValue && dto.DeliveryDate.Value.Date < DateTime.Today)
                return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "Delivery date cannot be in the past." });

            var po = new PurchaseOrder
            {
                PoNo = await _codeGenerator.GenerateCode("PO", locationId),
                LocationId = locationId,
                VendorId = dto.VendorId,
                DeliveryDate = dto.DeliveryDate,
                QuotationNo = dto.QuotationNo,
                QuotationUrlsJson = QuotationUrlsHelper.ToJson(dto.QuotationUrls ?? new List<string>()),
                GstType = dto.GstType.HasValue ? (int)dto.GstType.Value : null,
                GstPercent = dto.GstPercent,
                Remarks = dto.Remarks,
                PurchaseType = dto.PurchaseType,
                ApprovedBy = dto.ApprovedBy,
                CreatedBy = CurrentUserId,
                Status = PoStatus.Pending,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var it in items)
                po.Items.Add(new PurchaseOrderItem
                {
                    PurchaseIndentItemId = it.PurchaseIndentItemId,
                    Rate = it.Rate
                });

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PurchaseOrder> { Data = po });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PODto>>> GetById(int id)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders
                .Include(p => p.Vendor)
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.ItemType)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.Material)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);

            if (po == null) return NotFound();

            var dto = new PODto
            {
                Id = po.Id,
                PoNo = po.PoNo,
                VendorId = po.VendorId,
                VendorName = po.Vendor?.Name,
                DeliveryDate = po.DeliveryDate,
                QuotationNo = po.QuotationNo,
                Status = po.Status,
                Remarks = po.Remarks,
                CreatedAt = po.CreatedAt,
                CreatorName = po.Creator != null ? po.Creator.FirstName + " " + po.Creator.LastName : null,
                ApprovedBy = po.ApprovedBy,
                ApproverName = po.Approver != null ? po.Approver.FirstName + " " + po.Approver.LastName : null,
                ApprovedAt = po.ApprovedAt,
                Items = po.Items.Select(i => new POItemDto
                {
                    Id = i.Id,
                    PurchaseIndentItemId = i.PurchaseIndentItemId,
                    ItemId = i.PurchaseIndentItem!.ItemId,
                    MainPartName = i.PurchaseIndentItem.Item!.MainPartName,
                    CurrentName = i.PurchaseIndentItem.Item.CurrentName,
                    ItemTypeName = i.PurchaseIndentItem.Item.ItemType?.Name,
                    DrawingNo = i.PurchaseIndentItem.Item.DrawingNo,
                    RevisionNo = i.PurchaseIndentItem.Item.RevisionNo,
                    MaterialName = i.PurchaseIndentItem.Item.Material?.Name,
                    PiNo = i.PurchaseIndentItem.PurchaseIndent!.PiNo,
                    PurchaseIndentId = i.PurchaseIndentItem.PurchaseIndentId,
                    Rate = i.Rate
                }).ToList()
            };
            MapToDto(po, dto);
            return Ok(new ApiResponse<PODto> { Data = dto });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreatePODto dto)
        {
            if (!await HasPermission("EditPO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();
            if (po.Status != PoStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending POs can be edited." });

            var hasInward = await _context.Inwards.AnyAsync(i => i.SourceType == InwardSourceType.PO && i.SourceRefId == id);
            if (hasInward)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot edit: one or more items from this PO have been inwarded. Edit is allowed only when no inward has been done against this PO." });

            var items = dto.Items?.Where(i => i.PurchaseIndentItemId > 0).ToList() ?? new List<CreatePOItemDto>();
            if (items.Count == 0) return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item with rate is required." });

            var piItemIds = items.Select(i => i.PurchaseIndentItemId).Distinct().ToList();
            if (piItemIds.Count != items.Count)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Duplicate die/pattern in the same PO is not allowed." });

            var alreadyInOtherPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrderId != id);
            if (alreadyInOtherPo)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "One or more items are already in another PO." });

            if (dto.DeliveryDate.HasValue && dto.DeliveryDate.Value.Date < DateTime.Today)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Delivery date cannot be in the past." });

            po.VendorId = dto.VendorId;
            po.DeliveryDate = dto.DeliveryDate;
            po.QuotationNo = dto.QuotationNo;
            po.QuotationUrlsJson = QuotationUrlsHelper.ToJson(dto.QuotationUrls ?? new List<string>());
            po.GstType = dto.GstType.HasValue ? (int)dto.GstType.Value : null;
            po.GstPercent = dto.GstPercent;
            po.Remarks = dto.Remarks;
            po.PurchaseType = dto.PurchaseType;
            po.ApprovedBy = dto.ApprovedBy;
            po.UpdatedAt = DateTime.Now;

            _context.PurchaseOrderItems.RemoveRange(po.Items);
            foreach (var it in items)
                po.Items.Add(new PurchaseOrderItem
                {
                    PurchaseIndentItemId = it.PurchaseIndentItemId,
                    Rate = it.Rate
                });

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public async Task<ActionResult<ApiResponse<bool>>> Submit(int id)
        {
            if (!await HasPermission("CreatePO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();
            // Draft removed: new POs are created as Pending. No-op if already Pending.
            if (po.Status != PoStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending POs can be submitted." });
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();
            if (po.Status != PoStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending POs can be approved." });

            po.Status = PoStatus.Approved;
            po.ApprovedBy = CurrentUserId;
            po.ApprovedAt = DateTime.Now;
            po.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult<ApiResponse<bool>>> Reject(int id)
        {
            if (!await HasPermission("ApprovePO")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var po = await _context.PurchaseOrders.FirstOrDefaultAsync(p => p.Id == id && p.LocationId == locationId);
            if (po == null) return NotFound();
            if (po.Status != PoStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending POs can be rejected." });

            po.Status = PoStatus.Rejected;
            po.ApprovedBy = null;
            po.ApprovedAt = null;
            po.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
