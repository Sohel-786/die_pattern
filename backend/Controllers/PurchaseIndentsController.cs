using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("purchase-indents")]
    [ApiController]
    public class PurchaseIndentsController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;

        public PurchaseIndentsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator) : base(context)
        {
            _codeGenerator = codeGenerator;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var code = await _codeGenerator.GenerateCode("PI");
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentDto>>>> GetAll()
        {
            var isAdmin = await IsAdmin();
            var query = _context.PurchaseIndents
                .OrderByDescending(p => p.CreatedAt)
                .Include(p => p.Creator)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .AsQueryable();

            if (!isAdmin)
            {
                query = query.Where(p => p.IsActive);
            }

            var data = await query
                .Select(p => new PurchaseIndentDto
                {
                    Id = p.Id,
                    PiNo = p.PiNo,
                    Type = p.Type,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    CreatedBy = p.CreatedBy,
                    CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : "Unknown",
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    Items = p.Items.Select(i => new PurchaseIndentItemDto
                    {
                        Id = i.Id,
                        PurchaseIndentId = i.PurchaseIndentId,
                        ItemId = i.ItemId,
                        MainPartName = i.Item!.MainPartName,
                        CurrentName = i.Item.CurrentName,
                        ItemTypeName = i.Item.ItemType != null ? i.Item.ItemType.Name : "N/A",
                        PoNo = _context.PurchaseOrderItems
                            .Where(poi => poi.PurchaseIndentItemId == i.Id)
                            .Select(poi => poi.PurchaseOrder!.PoNo)
                            .FirstOrDefault() ?? "-",
                        IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id)
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PurchaseIndentDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PurchaseIndent>>> Create([FromBody] CreatePurchaseIndentDto dto)
        {
            if (!await HasPermission("CreatePI")) return Forbidden();

            var pi = new PurchaseIndent
            {
                PiNo = await _codeGenerator.GenerateCode("PI"),
                Type = dto.Type,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PurchaseIndentStatus.Pending,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var itemId in dto.ItemIds)
            {
                pi.Items.Add(new PurchaseIndentItem { ItemId = itemId });
            }

            _context.PurchaseIndents.Add(pi);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PurchaseIndent> { Data = pi });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreatePurchaseIndentDto dto)
        {
            if (!await HasPermission("EditPI")) return Forbidden();

            var pi = await _context.PurchaseIndents
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pi == null) return NotFound();
            if (pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Message = "Only pending indents can be edited" });
            }

            pi.Type = dto.Type;
            pi.Remarks = dto.Remarks;
            pi.UpdatedAt = DateTime.Now;

            // Update items
            _context.PurchaseIndentItems.RemoveRange(pi.Items);
            foreach (var itemId in dto.ItemIds)
            {
                pi.Items.Add(new PurchaseIndentItem { ItemId = itemId });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            pi.Status = PurchaseIndentStatus.Approved;
            pi.ApprovedBy = CurrentUserId;
            pi.ApprovedAt = DateTime.Now;
            pi.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult<ApiResponse<bool>>> Reject(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            pi.Status = PurchaseIndentStatus.Rejected;
            pi.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleStatus(int id)
        {
            if (!await IsAdmin()) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            pi.IsActive = !pi.IsActive;
            pi.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = pi.IsActive });
        }
        
        [HttpGet("approved-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentItemDto>>>> GetApprovedItems()
        {
            // Items from approved PIs that are NOT already in a PO
            var items = await _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.Item)
                .Where(pii => pii.PurchaseIndent!.Status == PurchaseIndentStatus.Approved && 
                             pii.PurchaseIndent!.IsActive &&
                             !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id))
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
    }
}
