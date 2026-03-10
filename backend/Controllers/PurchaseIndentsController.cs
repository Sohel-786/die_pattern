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
            if (!await HasPermission("ViewPI")) return Forbidden();
            if (!await HasPermission("CreatePI") && !await HasPermission("EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("PI", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        /// <summary>Returns item IDs that can be added to a PI (state = Not in stock). When editing, pass excludePiId so items only in that PI are included.</summary>
        [HttpGet("available-item-ids")]
        public async Task<ActionResult<ApiResponse<int[]>>> GetAvailableItemIdsForPI([FromQuery] int? excludePiId)
        {
            if (!await HasPermission("CreatePI") && !await HasPermission("EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var allItemIds = await _context.Items.Where(i => i.LocationId == locationId && i.IsActive).Select(i => i.Id).ToListAsync();
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
            [FromQuery] List<int>? itemIds,
            [FromQuery] List<int>? creatorIds,
            [FromQuery] bool? isActive)
        {
            if (!await HasPermission("ViewPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var isAdmin = await IsAdmin();
            IQueryable<PurchaseIndent> query = _context.PurchaseIndents
                .Where(p => p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId))
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material);

            if (!isAdmin)
            {
                query = query.Where(p => p.IsActive);
            }
            else if (isActive.HasValue)
            {
                query = query.Where(p => p.IsActive == isActive.Value);
            }

            if (creatorIds != null && creatorIds.Any())
                query = query.Where(p => creatorIds.Contains(p.CreatedBy));

            if (itemIds != null && itemIds.Any())
                query = query.Where(p => p.Items.Any(i => itemIds.Contains(i.ItemId)));

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



            var data = await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PurchaseIndentDto
                {
                    Id = p.Id,
                    PiNo = p.PiNo,
                    Type = p.Type,
                    Status = p.Status,
                    Remarks = p.Remarks,
                    ReqDateOfDelivery = p.ReqDateOfDelivery,
                    MtcReq = p.MtcReq,
                    DocumentNo = p.DocumentNo,
                    RevisionNo = p.RevisionNo,
                    RevisionDate = p.RevisionDate,
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
                        IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive),
                        InwardNo = (from il in _context.InwardLines
                                    join inv in _context.Inwards on il.InwardId equals inv.Id
                                    where il.SourceType == InwardSourceType.PO &&
                                          _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrderId == il.SourceRefId && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive) &&
                                          inv.IsActive
                                    orderby inv.CreatedAt descending
                                    select inv.InwardNo).FirstOrDefault(),
                        QCNo = (from il in _context.InwardLines
                                join qi in _context.QcItems on il.Id equals qi.InwardLineId
                                join qe in _context.QcEntries on qi.QcEntryId equals qe.Id
                                where il.SourceType == InwardSourceType.PO &&
                                      _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrderId == il.SourceRefId && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive) &&
                                      qe.IsActive
                                orderby qe.CreatedAt descending
                                select qe.QcNo).FirstOrDefault()
                    }).ToList()
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PurchaseIndentDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PurchaseIndent>>> Create([FromBody] CreatePurchaseIndentDto dto)
        {
            if (!await HasAllPermissions("ViewPI", "CreatePI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var itemIds = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count != (dto.ItemIds?.Count ?? 0))
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "Duplicate die/pattern in the same PI is not allowed." });

            if (itemIds.Count == 0)
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "At least one item is required." });

            if (!dto.ReqDateOfDelivery.HasValue)
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "Required Date of Delivery is mandatory." });

            if (dto.ReqDateOfDelivery.Value.Date < DateTime.Now.Date)
                return BadRequest(new ApiResponse<PurchaseIndent> { Success = false, Message = "Required Date of Delivery cannot be in the past." });

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
                PiNo = await _codeGenerator.GenerateCode("PI", locationId),
                Type = dto.Type,
                Remarks = dto.Remarks,
                ReqDateOfDelivery = dto.ReqDateOfDelivery,
                MtcReq = dto.MtcReq,
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
            // Set item state to InPI (PI Issued) as soon as they are in a PI — traceability and prevent duplicate PI
            var itemsToUpdate = await _context.Items.Where(i => itemIds.Contains(i.Id)).ToListAsync();
            foreach (var item in itemsToUpdate)
            {
                item.CurrentProcess = ItemProcessState.InPI;
                item.UpdatedAt = DateTime.Now;
            }
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PurchaseIndent> { Data = pi });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreatePurchaseIndentDto dto)
        {
            if (!await HasAllPermissions("ViewPI", "EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));

            if (pi == null) return NotFound();
            if (!pi.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "An inactive Purchase Indent cannot be edited. Inactivated indents cannot be modified or reactivated." });
            if (pi.Status != PurchaseIndentStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be edited. For approved indents, use the remove-items action to delete unused items." });

            var itemIds = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIds.Count != (dto.ItemIds?.Count ?? 0))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Duplicate die/pattern in the same PI is not allowed." });
            if (itemIds.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            if (!dto.ReqDateOfDelivery.HasValue)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Required Date of Delivery is mandatory." });

            if (dto.ReqDateOfDelivery.Value.Date < DateTime.Now.Date)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Required Date of Delivery cannot be in the past." });

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

            pi.Type = dto.Type;
            pi.Remarks = dto.Remarks;
            pi.ReqDateOfDelivery = dto.ReqDateOfDelivery;
            pi.MtcReq = dto.MtcReq;
            pi.UpdatedAt = DateTime.Now;

            var removedItemIds = existingItemIds.Except(newItemIdsSet).ToList();
            var addedItemIds = newItemIdsSet.Except(existingItemIds).ToList();

            _context.PurchaseIndentItems.RemoveRange(pi.Items);
            foreach (var itemId in itemIds)
            {
                pi.Items.Add(new PurchaseIndentItem { ItemId = itemId });
            }

            // Revert removed items to NotInStock if not in any other active PI
            foreach (var itemId in removedItemIds)
            {
                var inOtherActivePi = await _context.PurchaseIndentItems
                    .AnyAsync(pii => pii.ItemId == itemId && pii.PurchaseIndentId != id
                        && _context.PurchaseIndents.Any(pi2 => pi2.Id == pii.PurchaseIndentId && pi2.IsActive));
                if (!inOtherActivePi)
                {
                    var item = await _context.Items.FindAsync(itemId);
                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.NotInStock;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
            }
            // Set newly added items to InPI
            foreach (var itemId in addedItemIds)
            {
                var item = await _context.Items.FindAsync(itemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InPI;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public async Task<ActionResult<ApiResponse<bool>>> Submit(int id)
        {
            if (!await HasAllPermissions("ViewPI", "CreatePI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents.FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));
            if (pi == null) return NotFound();
            // Draft removed: new PIs are created as Pending. No-op if already Pending.
            if (pi.Status != PurchaseIndentStatus.Pending)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be submitted." });
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> Approve(int id)
        {
            if (!await HasAllPermissions("ViewPI", "ApprovePI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));
            if (pi == null) return NotFound();
            if (!pi.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only active Purchase Indents can be approved." });
            if (pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be approved." });
            }

            pi.Status = PurchaseIndentStatus.Approved;
            pi.ApprovedBy = CurrentUserId;
            pi.ApprovedAt = DateTime.Now;
            pi.UpdatedAt = DateTime.Now;

            var appliedDoc = await _context.DocumentControls
                .Where(d => d.DocumentType == DocumentType.PurchaseIndent && d.IsActive && d.IsApplied)
                .FirstOrDefaultAsync();
            if (appliedDoc != null)
            {
                pi.DocumentNo = appliedDoc.DocumentNo;
                pi.RevisionNo = appliedDoc.RevisionNo;
                pi.RevisionDate = appliedDoc.RevisionDate;
            }

            // Ensure item states remain InPI (already set at Create/Update; idempotent)
            foreach (var piItem in pi.Items)
            {
                var item = await _context.Items.FindAsync(piItem.ItemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InPI;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/reject")]
        public async Task<ActionResult<ApiResponse<bool>>> Reject(int id)
        {
            if (!await HasAllPermissions("ViewPI", "ApprovePI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));
            if (pi == null) return NotFound();
            if (!pi.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only active Purchase Indents can be rejected." });
            if (pi.Status != PurchaseIndentStatus.Pending)
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only pending indents can be rejected." });
            }

            pi.Status = PurchaseIndentStatus.Rejected;
            pi.ApprovedBy = null;
            pi.ApprovedAt = null;
            pi.UpdatedAt = DateTime.Now;

            // Revert items to NotInStock so they can be added to another PI
            foreach (var piItem in pi.Items)
            {
                var item = await _context.Items.FindAsync(piItem.ItemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.NotInStock;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        /// <summary>Revert an approved PI back to Pending. Only allowed when no PO has been created that uses any item from this PI.</summary>
        [HttpPost("{id}/revert-to-pending")]
        public async Task<ActionResult<ApiResponse<bool>>> RevertToPending(int id)
        {
            if (!await HasAllPermissions("ViewPI", "ApprovePI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));
            if (pi == null) return NotFound();
            if (!pi.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only active Purchase Indents can be reverted to pending." });
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
            if (!await HasAllPermissions("ViewPI", "EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents.Include(p => p.Items).FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));
            if (pi == null) return NotFound();

            if (pi.IsActive)
            {
                // DEACTIVATING
                // Do not allow deactivating if any item of this PI is in an active PO
                var piItemIds = pi.Items.Select(i => i.Id).ToList();
                var hasActivePo = await _context.PurchaseOrderItems
                    .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive);
                if (hasActivePo)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot deactivate: one or more items from this indent are in an active Purchase Order." });

                pi.IsActive = false;
                pi.UpdatedAt = DateTime.Now;

                // When deactivating, release items back to NotInStock so they can be used in a new PI
                foreach (var piItem in pi.Items)
                {
                    var item = await _context.Items.FindAsync(piItem.ItemId);
                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.NotInStock;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
            }
            else
            {
                // REACTIVATING
                // Allow reactivating an inactive PI if all its items are currently NotInStock (not in another active PI)
                foreach (var piItem in pi.Items)
                {
                    var canAdd = await _itemState.CanAddToPIAsync(piItem.ItemId, pi.Id);
                    if (!canAdd)
                    {
                        var state = await _itemState.GetStateAsync(piItem.ItemId, pi.Id);
                        var stateName = state.ToString().Replace("In", "In ").Replace("Outward", "Outward to party");
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Cannot reactivate: item (ID {piItem.ItemId}) is already in another process ({stateName}). Reactivation is only allowed if all items are available." });
                    }
                }

                pi.IsActive = true;
                pi.UpdatedAt = DateTime.Now;

                // Set items back to InPI
                foreach (var piItem in pi.Items)
                {
                    var item = await _context.Items.FindAsync(piItem.ItemId);
                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.InPI;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = pi.IsActive });
        }

        /// <summary>
        /// Remove one or more items from an approved Purchase Indent, but only when those items are not in any active Purchase Order.
        /// This is used for the "partial cleanup" case where some lines have not yet been used.
        /// </summary>
        [HttpPut("{id}/remove-unused-items")]
        public async Task<ActionResult<ApiResponse<bool>>> RemoveUnusedItems(int id, [FromBody] RemovePiItemsDto dto)
        {
            if (!await HasAllPermissions("ViewPI", "EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var pi = await _context.PurchaseIndents
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));

            if (pi == null) return NotFound();
            if (!pi.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "An inactive Purchase Indent cannot be modified." });
            if (pi.Status != PurchaseIndentStatus.Approved)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only approved indents support removing unused items." });

            var itemIdsToRemove = dto.ItemIds?.Distinct().ToList() ?? new List<int>();
            if (itemIdsToRemove.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required to remove." });

            var piItemsToRemove = pi.Items.Where(i => itemIdsToRemove.Contains(i.ItemId)).ToList();
            if (piItemsToRemove.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "No matching items found in this Purchase Indent." });

            // Ensure none of the items we are trying to remove are in any active PO
            var piItemIds = piItemsToRemove.Select(i => i.Id).ToList();
            var hasActivePo = await _context.PurchaseOrderItems
                .AnyAsync(poi => piItemIds.Contains(poi.PurchaseIndentItemId) && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive);
            if (hasActivePo)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "One or more selected items are already in an active Purchase Order and cannot be removed." });

            // Remove the PI items and reset their item process state back to NotInStock
            foreach (var piItem in piItemsToRemove)
            {
                var item = await _context.Items.FindAsync(piItem.ItemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.NotInStock;
                    item.UpdatedAt = DateTime.Now;
                }
                _context.PurchaseIndentItems.Remove(piItem);
            }

            pi.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<PurchaseIndentDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var pi = await _context.PurchaseIndents
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));

            if (pi == null) return NotFound();
            var isAdmin = await IsAdmin();
            if (!isAdmin && !pi.IsActive)
                return NotFound();

            var dto = new PurchaseIndentDto
            {
                Id = pi.Id,
                PiNo = pi.PiNo,
                Type = pi.Type,
                Status = pi.Status,
                Remarks = pi.Remarks,
                ReqDateOfDelivery = pi.ReqDateOfDelivery,
                MtcReq = pi.MtcReq,
                DocumentNo = pi.DocumentNo,
                RevisionNo = pi.RevisionNo,
                RevisionDate = pi.RevisionDate,
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
                    PiNo = pi.PiNo,
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
                    IsInPO = _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive),
                    InwardNo = (from il in _context.InwardLines
                                join inv in _context.Inwards on il.InwardId equals inv.Id
                                where il.SourceType == InwardSourceType.PO &&
                                      _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrderId == il.SourceRefId && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive) &&
                                      inv.IsActive
                                orderby inv.CreatedAt descending
                                select inv.InwardNo).FirstOrDefault(),
                    QCNo = (from il in _context.InwardLines
                            join qi in _context.QcItems on il.Id equals qi.InwardLineId
                            join qe in _context.QcEntries on qi.QcEntryId equals qe.Id
                            where il.SourceType == InwardSourceType.PO &&
                                  _context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == i.Id && poi.PurchaseOrderId == il.SourceRefId && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive) &&
                                  qe.IsActive
                            orderby qe.CreatedAt descending
                            select qe.QcNo).FirstOrDefault()
                }).ToList()
            };
            return Ok(new ApiResponse<PurchaseIndentDto> { Data = dto });
        }

        /// <summary>Returns full data for Purchase Indent print view (header, table, footer). Uses PI's stored document revision snapshot.</summary>
        [HttpGet("{id}/print")]
        public async Task<ActionResult<ApiResponse<PurchaseIndentPrintDto>>> GetPrint(int id)
        {
            if (!await HasPermission("ViewPI")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var pi = await _context.PurchaseIndents
                .Include(p => p.Creator)
                .Include(p => p.Approver)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(p => p.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .FirstOrDefaultAsync(p => p.Id == id && p.Items.Any(i => i.Item != null && i.Item.LocationId == locationId));

            if (pi == null) return NotFound();
            var isAdmin = await IsAdmin();
            if (!isAdmin && !pi.IsActive) return NotFound();

            var company = await _context.Companies.FindAsync(companyId);
            var location = await _context.Locations.FindAsync(locationId);
            var companyName = company?.Name ?? "";
            var locationName = location?.Name ?? "";

            var srNo = 0;
            var rows = pi.Items
                .OrderBy(i => i.Id)
                .Select(i => new PurchaseIndentPrintRowDto
                {
                    SrNo = ++srNo,
                    ItemDescription = i.Item?.CurrentName ?? i.Item?.MainPartName ?? "-",
                    ItemType = i.Item?.ItemType?.Name ?? "N/A",
                    ItemMaterial = i.Item?.Material?.Name ?? "N/A",
                    DrgNo = i.Item?.DrawingNo ?? "-"
                })
                .ToList();

            // Use PI's stored revision snapshot if set (from approval); otherwise fall back to currently applied revision
            string documentNo = pi.DocumentNo ?? "-";
            string revisionNo = pi.RevisionNo ?? "-";
            DateTime? revisionDate = pi.RevisionDate;
            if (string.IsNullOrWhiteSpace(pi.DocumentNo) || string.IsNullOrWhiteSpace(pi.RevisionNo))
            {
                var appliedDoc = await _context.DocumentControls
                    .Where(d => d.DocumentType == DocumentType.PurchaseIndent && d.IsActive && d.IsApplied)
                    .FirstOrDefaultAsync();
                if (appliedDoc != null)
                {
                    documentNo = appliedDoc.DocumentNo;
                    revisionNo = appliedDoc.RevisionNo;
                    revisionDate = appliedDoc.RevisionDate;
                }
            }

            var printDto = new PurchaseIndentPrintDto
            {
                CompanyName = companyName,
                LocationName = locationName,
                DocumentNo = documentNo,
                RevisionNo = revisionNo,
                RevisionDate = revisionDate,
                IndentNo = pi.PiNo,
                IndentDate = pi.CreatedAt,
                ReqDateOfDelivery = pi.ReqDateOfDelivery,
                MtcReq = pi.MtcReq,
                IndentedBy = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : "",
                AuthorisedBy = pi.Approver != null ? pi.Approver.FirstName + " " + pi.Approver.LastName : "",
                ReceivedBy = "",
                Rows = rows
            };

            return Ok(new ApiResponse<PurchaseIndentPrintDto> { Data = printDto });
        }

        /// <summary>Returns all active items with their current process state for PI item selection. Only items with status NotInStock can be added to a PI.</summary>
        [HttpGet("items-with-status")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemWithStatusDto>>>> GetItemsWithStatus([FromQuery] int? excludePiId)
        {
            if (!await HasPermission("ViewPI")) return Forbidden();
            if (!await HasPermission("CreatePI") && !await HasPermission("EditPI")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var items = await _context.Items
                .AsNoTracking()
                .Where(i => i.LocationId == locationId && i.IsActive)
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
            var allowed =
                await HasPermission("ViewPI") ||
                await HasAllPermissions("ViewPO", "CreatePO") ||
                await HasAllPermissions("ViewPO", "EditPO");
            if (!allowed) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            // Items from approved PIs that are NOT already in a PO (scoped to current location)
            var items = await _context.PurchaseIndentItems
                .Include(pii => pii.PurchaseIndent)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.ItemType)
                .Include(pii => pii.Item)
                    .ThenInclude(i => i!.Material)
                .Where(pii => pii.Item != null && pii.Item.LocationId == locationId &&
                             pii.PurchaseIndent!.Status == PurchaseIndentStatus.Approved && 
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
