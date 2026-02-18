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

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PIDto>>>> GetAll()
        {
            var data = await _context.PurchaseIndents
                .Include(p => p.Creator)
                .Include(p => p.Items)
                    .ThenInclude(i => i.PatternDie)
                .Select(p => new PIDto
                {
                    Id = p.Id,
                    PiNo = p.PiNo,
                    Type = p.Type,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    CreatedBy = p.CreatedBy,
                    CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : "Unknown",
                    CreatedAt = p.CreatedAt,
                    Items = p.Items.Select(i => new PIItemDto
                    {
                        Id = i.Id,
                        PatternDieId = i.PatternDieId,
                        MainPartName = i.PatternDie!.MainPartName,
                        CurrentName = i.PatternDie.CurrentName,
                        IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id)
                    }).ToList()
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PIDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PurchaseIndent>>> Create([FromBody] CreatePIDto dto)
        {
            if (!await HasPermission("CreatePI")) return Forbidden();

            var pi = new PurchaseIndent
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
                pi.Items.Add(new PurchaseIndentItem { PatternDieId = itemId });
            }

            _context.PurchaseIndents.Add(pi);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PurchaseIndent> { Data = pi });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();

            pi.Status = PiStatus.Approved;
            pi.ApprovedBy = CurrentUserId;
            pi.ApprovedAt = DateTime.Now;
            pi.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
        
        [HttpGet("approved-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PIItemDto>>>> GetApprovedItems()
        {
            // Items from approved PIs that are NOT already in a PO
            var items = await _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.PatternDie)
                .Where(pii => pii.PurchaseIndent!.Status == PiStatus.Approved && 
                             !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id))
                .Select(pii => new PIItemDto
                {
                    Id = pii.Id,
                    PatternDieId = pii.PatternDieId,
                    MainPartName = pii.PatternDie!.MainPartName,
                    CurrentName = pii.PatternDie.CurrentName
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PIItemDto>> { Data = items });
        }
    }
}
