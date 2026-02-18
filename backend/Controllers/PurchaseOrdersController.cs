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

        public PurchaseOrdersController(ApplicationDbContext context, ICodeGeneratorService codeGenerator) : base(context)
        {
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PODto>>>> GetAll()
        {
            var data = await _context.PurchaseOrders
                .Include(p => p.Vendor)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PatternDie)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .Select(p => new PODto
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
                    Items = p.Items.Select(i => new POItemDto
                    {
                        Id = i.Id,
                        PiItemId = i.PurchaseIndentItemId,
                        PatternDieId = i.PurchaseIndentItem!.PatternDieId,
                        MainPartName = i.PurchaseIndentItem!.PatternDie!.MainPartName,
                        CurrentName = i.PurchaseIndentItem.PatternDie.CurrentName,
                        PiNo = i.PurchaseIndentItem.PurchaseIndent!.PiNo
                    }).ToList()
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PODto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PurchaseOrder>>> Create([FromBody] CreatePODto dto)
        {
            if (!await HasPermission("CreatePO")) return Forbidden();

            // Additional business logic: Ensure items are not already in another PO
            var alreadyInPo = await _context.PurchaseOrderItems
                .AnyAsync(poi => dto.PiItemIds.Contains(poi.PurchaseIndentItemId));
            if (alreadyInPo) return BadRequest(new ApiResponse<PurchaseOrder> { Success = false, Message = "One or more items are already assigned to a PO" });

            var po = new PurchaseOrder
            {
                PoNo = await _codeGenerator.GenerateCode("PO"),
                VendorId = dto.VendorId,
                Rate = dto.Rate,
                DeliveryDate = dto.DeliveryDate,
                QuotationUrl = dto.QuotationUrl,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PoStatus.Pending,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var piItemId in dto.PiItemIds)
            {
                po.Items.Add(new PurchaseOrderItem { PurchaseIndentItemId = piItemId });
            }

            _context.PurchaseOrders.Add(po);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PurchaseOrder> { Data = po });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePO")) return Forbidden();

            var po = await _context.PurchaseOrders.FindAsync(id);
            if (po == null) return NotFound();

            po.Status = PoStatus.Approved;
            po.ApprovedBy = CurrentUserId;
            po.ApprovedAt = DateTime.Now;
            po.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
