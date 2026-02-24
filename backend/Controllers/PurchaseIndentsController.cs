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
                .Include(p => p.Approver)
                .Include(p => p.Location)
                    .ThenInclude(l => l!.Company)
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
                    LocationId = p.LocationId,
                    LocationName = p.Location != null ? p.Location.Name : null,
                    CompanyName = p.Location != null && p.Location.Company != null ? p.Location.Company.Name : null,
                    Type = p.Type,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    CreatedBy = p.CreatedBy,
                    CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : "Unknown",
                    ApprovedBy = p.ApprovedBy,
                    ApproverName = p.Approver != null ? p.Approver.FirstName + " " + p.Approver.LastName : null,
                    ApprovedAt = p.ApprovedAt,
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
                        DrawingNo = i.Item.DrawingNo,
                        RevisionNo = i.Item.RevisionNo,
                        MaterialName = i.Item.Material != null ? i.Item.Material.Name : "N/A",
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

            var itemIds = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count != (dto.ItemIds?.Count ?? 0))
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "Duplicate die/pattern in the same PI is not allowed." });

            if (itemIds.Count == 0)
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "At least one item is required." });

            var pi = new PurchaseIndent
            {
                PiNo = await _codeGenerator.GenerateCode("PI"),
                LocationId = dto.LocationId,
                Type = dto.Type,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PurchaseIndentStatus.Draft,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var itemId in itemIds)
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
            if (pi.Status != PurchaseIndentStatus.Draft && pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft or pending indents can be edited." });
            }

            var itemIds = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count != (dto.ItemIds?.Count ?? 0))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Duplicate die/pattern in the same PI is not allowed." });
            if (itemIds.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            pi.LocationId = dto.LocationId;
            pi.Type = dto.Type;
            pi.Remarks = dto.Remarks;
            pi.UpdatedAt = DateTime.Now;

            _context.PurchaseIndentItems.RemoveRange(pi.Items);
            foreach (var itemId in itemIds)
            {
                pi.Items.Add(new PurchaseIndentItem { ItemId = itemId });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public async Task<ActionResult<ApiResponse<bool>>> Submit(int id)
        {
            if (!await HasPermission("CreatePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();
            if (pi.Status != PurchaseIndentStatus.Draft)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft indents can be submitted for approval." });
            }

            pi.Status = PurchaseIndentStatus.Pending;
            pi.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.FindAsync(id);
            if (pi == null) return NotFound();
            if (pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be approved." });
            }

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
            if (pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be rejected." });
            }

            pi.Status = PurchaseIndentStatus.Rejected;
            pi.ApprovedBy = null;
            pi.ApprovedAt = null;
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
        
        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PurchaseIndentDto>>> GetById(int id)
        {
            var pi = await _context.PurchaseIndents
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Location)
                    .ThenInclude(l => l!.Company)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pi == null) return NotFound();
            var isAdmin = await IsAdmin();
            if (!isAdmin && !pi.IsActive)
                return NotFound();

            var dto = new PurchaseIndentDto
            {
                Id = pi.Id,
                PiNo = pi.PiNo,
                LocationId = pi.LocationId,
                LocationName = pi.Location?.Name,
                CompanyName = pi.Location?.Company?.Name,
                Type = pi.Type,
                Status = pi.Status,
                Remarks = pi.Remarks,
                CreatedBy = pi.CreatedBy,
                CreatorName = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : "Unknown",
                ApprovedBy = pi.ApprovedBy,
                ApproverName = pi.Approver != null ? pi.Approver.FirstName + " " + pi.Approver.LastName : null,
                ApprovedAt = pi.ApprovedAt,
                IsActive = pi.IsActive,
                CreatedAt = pi.CreatedAt,
                Items = pi.Items.Select(i => new PurchaseIndentItemDto
                {
                    Id = i.Id,
                    PurchaseIndentId = i.PurchaseIndentId,
                    ItemId = i.ItemId,
                    MainPartName = i.Item!.MainPartName,
                    CurrentName = i.Item.CurrentName,
                    ItemTypeName = i.Item.ItemType != null ? i.Item.ItemType.Name : "N/A",
                    DrawingNo = i.Item.DrawingNo,
                    RevisionNo = i.Item.RevisionNo,
                    MaterialName = i.Item.Material != null ? i.Item.Material.Name : "N/A",
                    PoNo = _context.PurchaseOrderItems
                        .Where(poi => poi.PurchaseIndentItemId == i.Id)
                        .Select(poi => poi.PurchaseOrder!.PoNo)
                        .FirstOrDefault() ?? "-",
                    IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id)
                }).ToList()
            };
            return Ok(new ApiResponse<PurchaseIndentDto> { Data = dto });
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
                    CurrentName = pii.Item.CurrentName,
                    ItemTypeName = pii.Item.ItemType != null ? pii.Item.ItemType.Name : "N/A",
                    DrawingNo = pii.Item.DrawingNo,
                    RevisionNo = pii.Item.RevisionNo,
                    MaterialName = pii.Item.Material != null ? pii.Item.Material.Name : "N/A"
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PurchaseIndentItemDto>> { Data = items });
        }
    }
}
