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
        private readonly IItemStateService _itemState;

        public PurchaseIndentsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _itemState = itemState;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var code = await _codeGenerator.GenerateCode("PI");
            return Ok(new ApiResponse<string> { Data = code });
        }

        /// <summary>Returns item IDs that can be added to a PI (state = Not in stock). When editing, pass excludePiId so items only in that PI are included.</summary>
        [HttpGet("available-item-ids")]
        public async Task<ActionResult<ApiResponse<int[]>>> GetAvailableItemIdsForPI([FromQuery] int? excludePiId)
        {
            if (!await HasPermission("CreatePI") && !await HasPermission("EditPI")) return Forbidden();
            var allItemIds = await _context.Items.Where(i => i.IsActive).Select(i => i.Id).ToListAsync();
            var available = new List<int>();
            foreach (var id in allItemIds)
            {
                if (await _itemState.CanAddToPIAsync(id, excludePiId))
                    available.Add(id);
            }
            return Ok(new ApiResponse<int[]> { Data = available.ToArray() });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentDto>>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] DateTime? createdDateFrom,
            [FromQuery] DateTime? createdDateTo,
            [FromQuery] string? itemIds)
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
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .AsQueryable();

            if (!isAdmin)
                query = query.Where(p => p.IsActive);

            var searchTrim = (search ?? "").Trim();
            if (!string.IsNullOrEmpty(searchTrim))
            {
                searchTrim = searchTrim.ToLowerInvariant();
                query = query.Where(p =>
                    p.PiNo.ToLower().Contains(searchTrim) ||
                    (p.Creator != null && (p.Creator.FirstName + " " + p.Creator.LastName).ToLower().Contains(searchTrim)) ||
                    (p.Remarks != null && p.Remarks.ToLower().Contains(searchTrim)));
            }

            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseIndentStatus>(status, true, out var statusEnum))
                query = query.Where(p => p.Status == statusEnum);

            if (createdDateFrom.HasValue)
                query = query.Where(p => p.CreatedAt.Date >= createdDateFrom.Value.Date);
            if (createdDateTo.HasValue)
                query = query.Where(p => p.CreatedAt.Date <= createdDateTo.Value.Date);

            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0)
                query = query.Where(p => p.Items.Any(i => itemIdList.Contains(i.ItemId)));

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
                        PiNo = p.PiNo,
                        ItemId = i.ItemId,
                        MainPartName = i.Item!.MainPartName,
                        CurrentName = i.Item.CurrentName,
                        ItemTypeName = i.Item.ItemType != null ? i.Item.ItemType.Name : "N/A",
                        DrawingNo = i.Item.DrawingNo,
                        RevisionNo = i.Item.RevisionNo,
                        MaterialName = i.Item.Material != null ? i.Item.Material.Name : "N/A",
                        PoNo = _context.PurchaseOrderItems
                            .Where(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                            .Select(poi => poi.PurchaseOrder!.PoNo)
                            .FirstOrDefault() ?? "-",
                        PoId = _context.PurchaseOrderItems
                            .Where(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                            .Select(poi => poi.PurchaseOrderId)
                            .FirstOrDefault(),
                        IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
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

            foreach (var itemId in itemIds)
            {
                var canAdd = await _itemState.CanAddToPIAsync(itemId, null);
                if (!canAdd)
                {
                    var state = await _itemState.GetStateAsync(itemId, null);
                    var stateName = state.ToString().Replace("In", "In ").Replace("Outward", "Outward to party");
                    return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = $"Item (ID {itemId}) cannot be added to PI: it is already in another process ({stateName}). Only items that are Not in stock can be added to a Purchase Indent." });
                }
            }

            var pi = new PurchaseIndent
            {
                PiNo = await _codeGenerator.GenerateCode("PI"),
                LocationId = dto.LocationId,
                Type = dto.Type,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                Status = PurchaseIndentStatus.Pending,
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
            if (pi.Status != PurchaseIndentStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be edited." });

            var itemIds = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count != (dto.ItemIds?.Count ?? 0))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Duplicate die/pattern in the same PI is not allowed." });
            if (itemIds.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            foreach (var itemId in itemIds)
            {
                var canAdd = await _itemState.CanAddToPIAsync(itemId, id);
                if (!canAdd)
                {
                    var state = await _itemState.GetStateAsync(itemId, id);
                    var stateName = state.ToString().Replace("In", "In ").Replace("Outward", "Outward to party");
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item (ID {itemId}) cannot be in this PI: it is already in another process ({stateName}). Only items that are Not in stock (or only in this indent) can be included." });
                }
            }

            // Do not allow removing an item that is in an active PO
            var existingItemIds = pi.Items.Select(i => i.ItemId).ToHashSet();
            var newItemIdsSet = itemIds.ToHashSet();
            var toRemove = pi.Items.Where(i => !newItemIdsSet.Contains(i.ItemId)).ToList();
            foreach (var pii in toRemove)
            {
                var inActivePo = await _context.PurchaseOrderItems
                    .AnyAsync(poi => poi.PurchaseIndentItemId == pii.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive);
                if (inActivePo)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot remove item(s) that are already in an active Purchase Order. Remove only items that do not have a PO." });
            }

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
            // Draft removed: new PIs are created as Pending. No-op if already Pending.
            if (pi.Status != PurchaseIndentStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be submitted." });
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

        /// <summary>Revert an approved PI back to Pending. Only allowed when no PO has been created that uses any item from this PI.</summary>
        [HttpPost("{id}/revert-to-pending")]
        public async Task<ActionResult<ApiResponse<bool>>> RevertToPending(int id)
        {
            if (!await HasPermission("ApprovePI")) return Forbidden();

            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFound();
            if (pi.Status != PurchaseIndentStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only approved indents can be reverted to pending." });

            var piItemIds = pi.Items.Select(i => i.Id).ToList();
            var hasLinkedPo = await _context.PurchaseOrderItems.AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive);
            if (hasLinkedPo)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot revert: one or more items from this indent are already in a Purchase Order." });

            pi.Status = PurchaseIndentStatus.Pending;
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

            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id);
            if (pi == null) return NotFound();

            // Do not allow deactivating if any item of this PI is in an active PO
            if (pi.IsActive)
            {
                var piItemIds = pi.Items.Select(i => i.Id).ToList();
                var hasActivePo = await _context.PurchaseOrderItems
                    .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive);
                if (hasActivePo)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot deactivate: one or more items from this indent are in an active Purchase Order." });
            }

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
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
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
                        .Where(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                        .Select(poi => poi.PurchaseOrder!.PoNo)
                        .FirstOrDefault() ?? "-",
                    PoId = _context.PurchaseOrderItems
                        .Where(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                        .Select(poi => poi.PurchaseOrderId)
                        .FirstOrDefault(),
                    IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                }).ToList()
            };
            return Ok(new ApiResponse<PurchaseIndentDto> { Data = dto });
        }

        /// <summary>Returns all active items with their current process state for PI item selection. Only items with status NotInStock can be added to a PI.</summary>
        [HttpGet("items-with-status")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemWithStatusDto>>>> GetItemsWithStatus([FromQuery] int? excludePiId)
        {
            if (!await HasPermission("CreatePI") && !await HasPermission("EditPI")) return Forbidden();

            var items = await _context.Items
                .AsNoTracking()
                .Where(i => i.IsActive)
                .Select(i => new { i.Id, i.CurrentName, i.MainPartName, ItemTypeName = i.ItemType != null ? i.ItemType.Name : null })
                .ToListAsync();

            var result = new List<ItemWithStatusDto>();
            foreach (var i in items)
            {
                var state = await _itemState.GetStateAsync(i.Id, excludePiId);
                result.Add(new ItemWithStatusDto
                {
                    ItemId = i.Id,
                    CurrentName = i.CurrentName,
                    MainPartName = i.MainPartName,
                    ItemTypeName = i.ItemTypeName ?? "N/A",
                    Status = state.ToString()
                });
            }
            return Ok(new ApiResponse<IEnumerable<ItemWithStatusDto>> { Data = result });
        }

        [HttpGet("approved-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<PurchaseIndentItemDto>>>> GetApprovedItems()
        {
            // Items from approved PIs that are NOT already in a PO
            var items = await _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.ItemType)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.Material)
                .Where(pii => pii.PurchaseIndent!.Status == PurchaseIndentStatus.Approved && 
                             pii.PurchaseIndent!.IsActive &&
                             !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive))
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
    }
}
