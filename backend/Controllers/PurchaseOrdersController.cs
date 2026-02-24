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
            dto.Rate = po.Rate;
            dto.DeliveryDate = po.DeliveryDate;
            dto.QuotationUrl = po.QuotationUrl;
            dto.QuotationUrls = QuotationUrlsHelper.FromJson(po.QuotationUrlsJson);
            dto.GstType = po.GstType.HasValue ? (GstType)po.GstType.Value : null;
            dto.GstPercent = po.GstPercent;
            decimal rate = po.Rate ?? 0;
            if (po.GstPercent.HasValue && po.GstPercent.Value > 0)
            {
                dto.GstAmount = Math.Round(rate * po.GstPercent.Value / 100, 2);
                dto.TotalAmount = Math.Round(rate + dto.GstAmount.Value, 2);
            }
            else
            {
                dto.GstAmount = null;
                dto.TotalAmount = rate;
            }
            dto.Status = po.Status;
            dto.Remarks = po.Remarks;
            dto.CreatedAt = po.CreatedAt;
            dto.CreatorName = po.Creator != null ? po.Creator.FirstName + " " + po.Creator.LastName : null;
            dto.ApprovedBy = po.ApprovedBy;
            dto.ApproverName = po.Approver != null ? po.Approver.FirstName + " " + po.Approver.LastName : null;
            dto.ApprovedAt = po.ApprovedAt;
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
                    ItemId = pii.ItemId,
                    MainPartName = pii.Item!.MainPartName,
                    CurrentName = pii.Item.CurrentName
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<PurchaseIndentItemDto>> { Data = items });
        }

        [HttpPost("upload-quotation")]
        public async Task<ActionResult<ApiResponse<object>>> UploadQuotation([FromForm] IFormFile file)
        {
            if (!await HasPermission("CreatePO")) return Forbidden();
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "No file uploaded." });

            var allowed = new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg" };
            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG." });

            var dir = Path.Combine(_env.ContentRootPath ?? Directory.GetCurrentDirectory(), "wwwroot", "storage", "po-quotations");
            Directory.CreateDirectory(dir);
            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(dir, fileName);
            using (var stream = new FileStream(filePath, FileMode.Create))
                await file.CopyToAsync(stream);

            var url = $"/storage/po-quotations/{fileName}";
            return Ok(new ApiResponse<object> { Data = new { url } });
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
                    Rate = p.Rate,
                    DeliveryDate = p.DeliveryDate,
                    QuotationUrl = p.QuotationUrl,
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
                        PiNo = i.PurchaseIndentItem.PurchaseIndent!.PiNo
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

            var itemIds = dto.PurchaseIndentItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count == 0) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "At least one item is required." });

            var alreadyInPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => itemIds.Contains(poi.PurchaseIndentItemId));
            if (alreadyInPo) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "One or more items are already assigned to a PO." });

            var po = new PurchaseOrder
            {
                PoNo = await _codeGenerator.GenerateCode("PO"),
                VendorId = dto.VendorId,
                Rate = dto.Rate,
                DeliveryDate = dto.DeliveryDate,
                QuotationUrl = dto.QuotationUrl,
                QuotationUrlsJson = QuotationUrlsHelper.ToJson(dto.QuotationUrls ?? new List<string>()),
                GstType = dto.GstType.HasValue ? (int)dto.GstType.Value : null,
                GstPercent = dto.GstPercent,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PoStatus.Draft,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var piItemId in itemIds)
                po.Items.Add(new PurchaseOrderItem { PurchaseIndentItemId = piItemId });

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
                Rate = po.Rate,
                DeliveryDate = po.DeliveryDate,
                QuotationUrl = po.QuotationUrl,
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
                    PiNo = i.PurchaseIndentItem.PurchaseIndent!.PiNo
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

            var itemIds = dto.PurchaseIndentItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count == 0) return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            var alreadyInOtherPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => itemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrderId != id);
            if (alreadyInOtherPo)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "One or more items are already in another PO." });

            po.VendorId = dto.VendorId;
            po.Rate = dto.Rate;
            po.DeliveryDate = dto.DeliveryDate;
            po.QuotationUrl = dto.QuotationUrl;
            po.QuotationUrlsJson = QuotationUrlsHelper.ToJson(dto.QuotationUrls ?? new List<string>());
            po.GstType = dto.GstType.HasValue ? (int)dto.GstType.Value : null;
            po.GstPercent = dto.GstPercent;
            po.Remarks = dto.Remarks;
            po.UpdatedAt = DateTime.Now;

            _context.PurchaseOrderItems.RemoveRange(po.Items);
            foreach (var piItemId in itemIds)
                po.Items.Add(new PurchaseOrderItem { PurchaseIndentItemId = piItemId });

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
