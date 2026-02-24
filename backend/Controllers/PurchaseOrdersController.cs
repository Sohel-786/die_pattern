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
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var code = await _codeGenerator.GenerateCode("PO");
            return Ok(new ApiResponse<string> { Data = code });
        }

        /// <summary>Approved PI items that can be selected for this PO: not in any PO, or already in this PO (for edit).</summary>
        [HttpGet("approved-items-for-edit")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentItemDto>>>> GetApprovedItemsForEdit([FromQuery] int? poId)
        {
            var inAnyPo = _context.PurchaseOrderItems.Select(poi => poi.PurchaseIndentItemId);
            var query = _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.Item)
                .Where(pii => pii.PurchaseIndent!.Status == PurchaseIndentStatus.Approved && pii.PurchaseIndent.IsActive);

            if (poId.HasValue)
                query = query.Where(pii => !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id) || _context.PurchaseOrderItems.Any(poi => poi.PurchaseOrderId == poId && poi.PurchaseIndentItemId == pii.Id));
            else
                query = query.Where(pii => !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id));

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

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PODto>>>> GetAll()
        {
            var list = await _context.PurchaseOrders
                .Include(p => p.Vendor)
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            var data = list.Select(p =>
            {
                var dto = new PODto
                {
                    Id = p.Id,
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

            var items = dto.Items?.Where(i => i.PurchaseIndentItemId > 0).ToList() ?? new List<CreatePOItemDto>();
            if (items.Count == 0) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "At least one item with rate is required." });

            var piItemIds = items.Select(i => i.PurchaseIndentItemId).Distinct().ToList();
            if (piItemIds.Count != items.Count)
                return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "Duplicate die/pattern in the same PO is not allowed." });

            var alreadyInPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId));
            if (alreadyInPo) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "One or more items are already assigned to a PO." });

            var po = new PurchaseOrder
            {
                PoNo = await _codeGenerator.GenerateCode("PO"),
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
                Status = PoStatus.Draft,
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
            var po = await _context.PurchaseOrders
                .Include(p => p.Vendor)
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .FirstOrDefaultAsync(p => p.Id == id);

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

            var po = await _context.PurchaseOrders.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (po == null) return NotFound();
            if (po.Status != PoStatus.Pending && po.Status != PoStatus.Draft)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft or pending POs can be edited." });

            var items = dto.Items?.Where(i => i.PurchaseIndentItemId > 0).ToList() ?? new List<CreatePOItemDto>();
            if (items.Count == 0) return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item with rate is required." });

            var piItemIds = items.Select(i => i.PurchaseIndentItemId).Distinct().ToList();
            if (piItemIds.Count != items.Count)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Duplicate die/pattern in the same PO is not allowed." });

            var alreadyInOtherPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrderId != id);
            if (alreadyInOtherPo)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "One or more items are already in another PO." });

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

            var po = await _context.PurchaseOrders.FindAsync(id);
            if (po == null) return NotFound();
            if (po.Status != PoStatus.Draft)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft POs can be submitted for approval." });

            po.Status = PoStatus.Pending;
            po.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePO")) return Forbidden();

            var po = await _context.PurchaseOrders.FindAsync(id);
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

            var po = await _context.PurchaseOrders.FindAsync(id);
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
