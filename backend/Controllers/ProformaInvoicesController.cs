using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("proforma-invoices")]
    [ApiController]
    public class ProformaInvoicesController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;

        public ProformaInvoicesController(ApplicationDbContext context, ICodeGeneratorService codeGenerator) : base(context)
        {
            _codeGenerator = codeGenerator;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ProformaInvoiceDto>>>> GetAll()
        {
            var data = await _context.ProformaInvoices
                .Include(p => p.Creator)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                .Select(p => new ProformaInvoiceDto
                {
                    Id = p.Id,
                    PiNo = p.PiNo,
                    Type = p.Type,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    CreatedBy = p.CreatedBy,
                    CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : "Unknown",
                    CreatedAt = p.CreatedAt,
                    Items = p.Items.Select(i => new ProformaInvoiceItemDto
                    {
                        Id = i.Id,
                        ItemId = i.ItemId,
                        MainPartName = i.Item!.MainPartName,
                        CurrentName = i.Item.CurrentName,
                        IsInPO = _context.PurchaseOrderItems.Any(poi => poi.ProformaInvoiceItemId == i.Id)
                    }).ToList()
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<ProformaInvoiceDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ProformaInvoice>>> Create([FromBody] CreateProformaInvoiceDto dto)
        {
            if (!await HasPermission("CreatePI")) return Forbidden();

            var pi = new ProformaInvoice
            {
                PiNo = await _codeGenerator.GenerateCode("PI"),
                Type = dto.Type,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PiStatus.Pending,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var itemId in dto.ItemIds)
            {
                pi.Items.Add(new ProformaInvoiceItem { ItemId = itemId });
            }

            _context.ProformaInvoices.Add(pi);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<ProformaInvoice> { Data = pi });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.ProformaInvoices.FindAsync(id);
            if (pi == null) return NotFound();

            pi.Status = PiStatus.Approved;
            pi.ApprovedBy = CurrentUserId;
            pi.ApprovedAt = DateTime.Now;
            pi.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
        
        [HttpGet("approved-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ProformaInvoiceItemDto>>>> GetApprovedItems()
        {
            // Items from approved PIs that are NOT already in a PO
            var items = await _context.ProformaInvoiceItems
                .Include(pii => pii.ProformaInvoice)
                .Include(pii => pii.Item)
                .Where(pii => pii.ProformaInvoice!.Status == PiStatus.Approved && 
                             !_context.PurchaseOrderItems.Any(poi => poi.ProformaInvoiceItemId == pii.Id))
                .Select(pii => new ProformaInvoiceItemDto
                {
                    Id = pii.Id,
                    ItemId = pii.ItemId,
                    MainPartName = pii.Item!.MainPartName,
                    CurrentName = pii.Item.CurrentName
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<ProformaInvoiceItemDto>> { Data = items });
        }
    }
}
