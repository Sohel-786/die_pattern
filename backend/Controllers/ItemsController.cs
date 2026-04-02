using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/items")]
    [ApiController]
    public class ItemsController : BaseController
    {
        private readonly IExcelService _excelService;
        private readonly IItemStateService _itemState;

        public ItemsController(ApplicationDbContext context, IExcelService excelService, IItemStateService itemState) : base(context)
        {
            _excelService = excelService;
            _itemState = itemState;
        }

        /// <summary>
        /// Active Item Types for filter UIs, scoped to current location (only types that have at least one item in that location).
        /// </summary>
        [HttpGet("item-types/for-filter")]
        public async Task<IActionResult> GetItemTypesForFilter()
        {
            var canUse =
                await HasAllPermissions("ViewMaster", "ManageItem") ||
                await HasPermission("ViewTransfer") ||
                await HasPermission("ViewPI") ||
                await HasPermission("ViewPO") ||
                await HasPermission("ViewInward") ||
                await HasPermission("ViewMovement") ||
                await HasPermission("ViewQC") ||
                await HasPermission("ViewReports");
            if (!canUse) return Forbidden();

            var locationId = await GetCurrentLocationIdAsync();

            var types = await _context.ItemTypes
                .AsNoTracking()
                .Where(t => t.IsActive)
                .Where(t => _context.Items.Any(i => i.LocationId == locationId && i.ItemTypeId == t.Id))
                .OrderBy(t => t.Name)
                .Select(t => new { t.Id, t.Name })
                .ToListAsync();

            return Ok(new { data = types });
        }

        [HttpGet("minimal")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetMinimal()
        {
            // Allow minimal item lookup for users who can either view masters for items,
            // or who have transactional access to Job Work or Inwards.
            var canUse =
                await HasAllPermissions("ViewMaster", "ManageItem") ||
                await HasPermission("ViewMovement") ||
                await HasPermission("ViewInward");
            if (!canUse) return Forbidden();

            var locationId = await GetCurrentLocationIdAsync();
            var items = await _context.Items
                .Where(p => p.LocationId == locationId && p.IsActive && !string.IsNullOrEmpty(p.DrawingNo))
                .OrderBy(p => p.MainPartName)
                .Select(p => new
                {
                    p.Id,
                    p.MainPartName,
                    p.CurrentName
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = items });
        }

        /// <summary>All items (active + inactive) for filter dropdowns only. Supports optional search and pagination for infinite scroll.</summary>
        [HttpGet("for-filter")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetForFilter(
            [FromQuery] string? search,
            [FromQuery] int? itemTypeId,
            [FromQuery] int? page,
            [FromQuery] int pageSize = 50)
        {
            var canUse =
                await HasAllPermissions("ViewMaster", "ManageItem") ||
                await HasPermission("ViewTransfer") ||
                await HasPermission("ViewPI") ||
                await HasPermission("ViewPO") ||
                await HasPermission("ViewInward") ||
                await HasPermission("ViewMovement") ||
                await HasPermission("ViewQC");
            if (!canUse) return Forbidden();

            var locationId = await GetCurrentLocationIdAsync();
            IQueryable<Item> query = _context.Items.Where(p => p.LocationId == locationId);

            if (itemTypeId.HasValue && itemTypeId.Value > 0)
            {
                query = query.Where(p => p.ItemTypeId == itemTypeId.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p =>
                    p.MainPartName.ToLower().Contains(s) ||
                    p.CurrentName.ToLower().Contains(s) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(s)));
            }

            var ordered = query.OrderBy(p => p.MainPartName);
            int totalCount = await ordered.CountAsync();

            List<Item> items;
            if (page.HasValue)
            {
                var (skip, take) = net_backend.Services.PaginationHelper.GetSkipTake(page.Value, pageSize);
                items = await ordered.Skip(skip).Take(take).ToListAsync();
            }
            else
            {
                items = await ordered.ToListAsync();
            }

            var itemIds = items.Select(p => p.Id).ToList();
            var previousNamesByItem = await _context.ItemChangeLogs
                .AsNoTracking()
                .Where(l => itemIds.Contains(l.ItemId))
                .Select(l => new { l.ItemId, l.OldName })
                .ToListAsync();
            var previousNamesDict = previousNamesByItem
                .GroupBy(x => x.ItemId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.OldName).Where(n => !string.IsNullOrEmpty(n)).Distinct().ToList());

            var result = items.Select(p => new
            {
                p.Id,
                p.MainPartName,
                p.CurrentName,
                p.ItemTypeId,
                ItemTypeName = p.ItemType != null ? p.ItemType.Name : (string?)null,
                PreviousNames = previousNamesDict.TryGetValue(p.Id, out var names) ? names : new List<string>()
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result, TotalCount = totalCount });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int? itemTypeId,
            [FromQuery] int? materialId,
            [FromQuery] int? ownerTypeId,
            [FromQuery] int? statusId,
            [FromQuery] int? currentProcessId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            IQueryable<Item> query = _context.Items
                .Where(p => p.LocationId == locationId)
                .Include(p => p.ItemType)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty);

            if (isActive.HasValue)
                query = query.Where(p => p.IsActive == isActive.Value);

            if (itemTypeId.HasValue && itemTypeId.Value > 0)
                query = query.Where(p => p.ItemTypeId == itemTypeId.Value);

            if (materialId.HasValue && materialId.Value > 0)
                query = query.Where(p => p.MaterialId == materialId.Value);

            if (ownerTypeId.HasValue && ownerTypeId.Value > 0)
                query = query.Where(p => p.OwnerTypeId == ownerTypeId.Value);

            if (statusId.HasValue && statusId.Value > 0)
                query = query.Where(p => p.StatusId == statusId.Value);

            if (currentProcessId.HasValue)
            {
                var processState = (ItemProcessState)currentProcessId.Value;
                query = query.Where(p => p.CurrentProcess == processState);
            }

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p => 
                    p.MainPartName.ToLower().Contains(s) || 
                    p.CurrentName.ToLower().Contains(s) || 
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(s)));
            }

            var ordered = query.OrderByDescending(p => p.CreatedAt);
            var totalCount = await ordered.CountAsync();
            var (skip, take) = net_backend.Services.PaginationHelper.GetSkipTake(page, pageSize);
            var items = await ordered.Skip(skip).Take(take).ToListAsync();
            var data = items.Select(p => new ItemDto
            {
                Id = p.Id,
                MainPartName = p.MainPartName,
                CurrentName = p.CurrentName,
                ItemTypeId = p.ItemTypeId,
                ItemTypeName = p.ItemType?.Name ?? "",
                DrawingNo = p.DrawingNo,
                RevisionNo = p.RevisionNo,
                MaterialId = p.MaterialId,
                MaterialName = p.Material?.Name ?? "",
                OwnerTypeId = p.OwnerTypeId,
                OwnerTypeName = p.OwnerType?.Name ?? "",
                StatusId = p.StatusId,
                StatusName = p.Status?.Name ?? "",
                CurrentLocationId = p.CurrentLocationId,
                CurrentLocationName = p.CurrentLocation?.Name,
                CurrentPartyId = p.CurrentPartyId,
                CurrentPartyName = p.CurrentParty?.Name,
                CurrentProcess = _itemState.GetStateDisplay(p.CurrentProcess),
                CurrentHolderType = p.CurrentProcess switch {
                    ItemProcessState.InStock or ItemProcessState.InQC or ItemProcessState.InwardDone => "Location",
                    ItemProcessState.InJobwork or ItemProcessState.AtVendor or ItemProcessState.InPO => "Vendor",
                    _ => "NotInStock"
                },
                IsActive = p.IsActive
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data, TotalCount = totalCount });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetActive()
        {
            if (!await HasAllPermissions("ViewMaster", "ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            // Materialize first so we can use switch expressions and service methods in-memory
            var items = await _context.Items
                .Where(p => p.LocationId == locationId)
                .Include(p => p.ItemType)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .Where(p => p.IsActive && !string.IsNullOrEmpty(p.DrawingNo))
                .ToListAsync();

            var data = items.Select(p => new ItemDto
            {
                Id = p.Id,
                MainPartName = p.MainPartName,
                CurrentName = p.CurrentName,
                ItemTypeId = p.ItemTypeId,
                ItemTypeName = p.ItemType?.Name ?? "",
                DrawingNo = p.DrawingNo,
                RevisionNo = p.RevisionNo,
                MaterialId = p.MaterialId,
                MaterialName = p.Material?.Name ?? "",
                OwnerTypeId = p.OwnerTypeId,
                OwnerTypeName = p.OwnerType?.Name ?? "",
                StatusId = p.StatusId,
                StatusName = p.Status?.Name ?? "",
                CurrentLocationId = p.CurrentLocationId,
                CurrentLocationName = p.CurrentLocation?.Name,
                CurrentPartyId = p.CurrentPartyId,
                CurrentPartyName = p.CurrentParty?.Name,
                CurrentProcess = _itemState.GetStateDisplay(p.CurrentProcess),
                CurrentHolderType = p.CurrentProcess switch {
                    ItemProcessState.InStock or ItemProcessState.InQC or ItemProcessState.InwardDone => "Location",
                    ItemProcessState.InJobwork or ItemProcessState.AtVendor or ItemProcessState.InPO => "Vendor",
                    _ => "NotInStock"
                },
                IsActive = p.IsActive
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Item>>> Create([FromBody] CreateItemDto dto)
        {
            if (!await CanCreateMaster("ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            if (await _context.Items.AnyAsync(p => p.LocationId == locationId && p.MainPartName.ToLower() == dto.MainPartName.Trim().ToLower()))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Main Part Name must be unique within this location" });
            
            if (await _context.Items.AnyAsync(p => p.LocationId == locationId && p.CurrentName.ToLower() == dto.CurrentName.Trim().ToLower()))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Display Name must be unique within this location" });
            
            if (!string.IsNullOrEmpty(dto.DrawingNo) && await _context.Items.AnyAsync(p => p.LocationId == locationId && p.DrawingNo != null && p.DrawingNo.ToLower() == dto.DrawingNo.Trim().ToLower()))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Drawing Number must be unique" });

            var s = dto.CurrentHolderType?.Trim().ToLower() ?? "";
            var item = new Item
            {
                MainPartName = dto.MainPartName.Trim(),
                CurrentName = dto.CurrentName.Trim(),
                ItemTypeId = dto.ItemTypeId,
                DrawingNo = dto.DrawingNo,
                RevisionNo = dto.RevisionNo,
                MaterialId = dto.MaterialId,
                OwnerTypeId = dto.OwnerTypeId,
                StatusId = dto.StatusId > 0 ? dto.StatusId : 1, // Use provided status or default to 1
                CurrentProcess = s switch {
                    var x when x == "location" || x == "at location" || x == "at_location" || x == "instock" || x == "inwarddone" || x == "inqc" => ItemProcessState.InStock,
                    var x when x == "vendor" || x == "party" || x == "at vendor" || x == "outward" || x == "injobwork" || x == "inpo" => ItemProcessState.AtVendor,
                    _ => ItemProcessState.NotInStock
                },
                CurrentLocationId = (s == "location" || s == "at location" || s == "at_location" || s == "instock" || s == "inwarddone" || s == "inqc") ? (dto.CurrentLocationId ?? locationId) : null,
                CurrentPartyId = (s == "vendor" || s == "party" || s == "at vendor" || s == "outward" || s == "injobwork" || s == "inpo") ? dto.CurrentPartyId : null,
                LocationId = locationId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Item> { Data = item });
        }

        [HttpPost("change-process")]
        public async Task<ActionResult<ApiResponse<Item>>> ChangeProcess([FromBody] ItemChangeRequestDto dto)
        {
            if (!await IsAdmin()) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == dto.ItemId && i.LocationId == locationId);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            var log = new ItemChangeLog
            {
                ItemId = item.Id,
                OldName = item.CurrentName,
                NewName = dto.NewName,
                OldRevision = item.RevisionNo ?? "",
                NewRevision = dto.NewRevision,
                ChangeType = dto.ChangeType,
                Remarks = dto.Remarks,
                Source = "AdminChange",
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            };

            // Update current
            item.CurrentName = dto.NewName;
            item.RevisionNo = dto.NewRevision;
            item.UpdatedAt = DateTime.Now;

            _context.ItemChangeLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Item> { Data = item, Message = "Change process completed successfully" });
        }

        [HttpGet("{id}/name-history")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemNameHistoryEntryDto>>>> GetNameHistory(int id)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (item == null) return NotFound(new ApiResponse<IEnumerable<ItemNameHistoryEntryDto>> { Success = false, Message = "Item not found" });

            var logs = await _context.ItemChangeLogs
                .AsNoTracking()
                .Where(l => l.ItemId == id)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new { l.Id, l.CreatedAt, l.OldName, l.NewName, l.ChangeType, l.Source, l.JobWorkId, l.InwardId, l.QcEntryId, l.CreatedBy })
                .ToListAsync();

            var jwIds = logs.Where(l => l.JobWorkId.HasValue).Select(l => l.JobWorkId!.Value).Distinct().ToList();
            var inwardIds = logs.Where(l => l.InwardId.HasValue).Select(l => l.InwardId!.Value).Distinct().ToList();
            var qcIds = logs.Where(l => l.QcEntryId.HasValue).Select(l => l.QcEntryId!.Value).Distinct().ToList();
            var userIds = logs.Select(l => l.CreatedBy).Distinct().ToList();

            var jwDict = jwIds.Any() ? await _context.JobWorks.Where(j => jwIds.Contains(j.Id)).ToDictionaryAsync(j => j.Id, j => j.JobWorkNo) : new Dictionary<int, string>();
            var inwardDict = inwardIds.Any() ? await _context.Inwards.Where(i => inwardIds.Contains(i.Id)).ToDictionaryAsync(i => i.Id, i => i.InwardNo) : new Dictionary<int, string>();
            var qcDict = qcIds.Any() ? await _context.QcEntries.Where(q => qcIds.Contains(q.Id)).ToDictionaryAsync(q => q.Id, q => q.QcNo) : new Dictionary<int, string>();
            var userDict = userIds.Any() ? await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName) : new Dictionary<int, string>();

            var result = new List<ItemNameHistoryEntryDto>();
            foreach (var l in logs)
            {
                var canRevert = await IsAdmin() && l.NewName == item.CurrentName;
                result.Add(new ItemNameHistoryEntryDto
                {
                    Id = l.Id,
                    CreatedAt = l.CreatedAt,
                    OldName = l.OldName,
                    NewName = l.NewName,
                    ChangeType = l.ChangeType,
                    Source = l.Source,
                    JobWorkNo = l.JobWorkId.HasValue && jwDict.ContainsKey(l.JobWorkId.Value) ? jwDict[l.JobWorkId.Value] : null,
                    InwardNo = l.InwardId.HasValue && inwardDict.ContainsKey(l.InwardId.Value) ? inwardDict[l.InwardId.Value] : null,
                    QcNo = l.QcEntryId.HasValue && qcDict.ContainsKey(l.QcEntryId.Value) ? qcDict[l.QcEntryId.Value] : null,
                    CreatedByName = userDict.ContainsKey(l.CreatedBy) ? userDict[l.CreatedBy] : null,
                    CanRevert = canRevert
                });
            }

            return Ok(new ApiResponse<IEnumerable<ItemNameHistoryEntryDto>> { Data = result });
        }

        /// <summary>
        /// Apply a display name change from an already-approved QC (Job Work) when it was not applied at approval time.
        /// Use this once to fix items that were QC-approved before the name-change logic was in place.
        /// </summary>
        [HttpPost("{id}/apply-pending-name-change")]
        public async Task<ActionResult<ApiResponse<Item>>> ApplyPendingNameChange(int id)
        {
            if (!await IsAdmin()) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            var approvedQcItems = await _context.QcItems
                .Include(qi => qi.InwardLine).Include(qi => qi.QcEntry)
                .Where(qi => qi.InwardLine != null && qi.InwardLine.ItemId == id
                    && qi.QcEntry != null && qi.QcEntry.LocationId == locationId
                    && qi.QcEntry.Status == QcStatus.Approved && qi.IsApproved == true
                    && qi.InwardLine.SourceType == InwardSourceType.JobWork && qi.InwardLine.SourceRefId != null)
                .OrderByDescending(qi => qi.QcEntry!.ApprovedAt ?? qi.QcEntry.CreatedAt)
                .ToListAsync();

            string? proposedNewName = null;
            InwardLine? chosenLine = null;
            QualityControlEntry? chosenEntry = null;
            int? jwId = null;
            int? jwItemId = null;

            foreach (var qi in approvedQcItems)
            {
                var line = qi.InwardLine!;
                proposedNewName = !string.IsNullOrWhiteSpace(line.NewItemNameFromJobWork) ? line.NewItemNameFromJobWork.Trim() : null;
                if (string.IsNullOrEmpty(proposedNewName))
                {
                    var jwi = await _context.JobWorkItems.AsNoTracking()
                        .FirstOrDefaultAsync(j => j.JobWorkId == line.SourceRefId!.Value && j.ItemId == id && j.WillChangeName && !string.IsNullOrWhiteSpace(j.ProposedNewName));
                    if (jwi != null) proposedNewName = jwi.ProposedNewName!.Trim();
                }
                if (!string.IsNullOrEmpty(proposedNewName) && (item.CurrentName?.Trim().ToLower() != proposedNewName.ToLower()))
                {
                    chosenLine = line;
                    chosenEntry = qi.QcEntry!;
                    jwId = line.SourceRefId;
                    if (jwId.HasValue)
                    {
                        var jwi = await _context.JobWorkItems.FirstOrDefaultAsync(j => j.JobWorkId == jwId.Value && j.ItemId == id);
                        if (jwi != null) jwItemId = jwi.Id;
                    }
                    break;
                }
            }

            if (chosenLine == null || chosenEntry == null || string.IsNullOrEmpty(proposedNewName))
                return NotFound(new ApiResponse<Item> { Success = false, Message = "No pending display name change found for this item from an approved QC (Job Work)." });

            if (await _context.Items.AnyAsync(i => i.LocationId == locationId && i.Id != id && (i.CurrentName.ToLower() == proposedNewName.ToLower() || i.MainPartName.ToLower() == proposedNewName.ToLower())))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = $"Display name '{proposedNewName}' is already used by another item." });

            var oldName = item.CurrentName ?? "";
            item.CurrentName = proposedNewName;
            item.UpdatedAt = DateTime.Now;

            _context.ItemChangeLogs.Add(new ItemChangeLog
            {
                ItemId = item.Id,
                OldName = oldName,
                NewName = proposedNewName,
                OldRevision = item.RevisionNo ?? "",
                NewRevision = item.RevisionNo ?? "",
                ChangeType = "JobWork",
                Source = "JobWork",
                JobWorkId = jwId,
                JobWorkItemId = jwItemId,
                InwardId = chosenLine.InwardId,
                InwardLineId = chosenLine.Id,
                QcEntryId = chosenEntry.Id,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Item> { Data = item, Message = "Display name applied from approved QC (Job Work)." });
        }

        [HttpPost("{id}/revert-name")]
        public async Task<ActionResult<ApiResponse<Item>>> RevertName(int id, [FromBody] RevertNameRequestDto dto)
        {
            if (!await IsAdmin()) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            var log = await _context.ItemChangeLogs.FirstOrDefaultAsync(l => l.Id == dto.ChangeLogId && l.ItemId == id);
            if (log == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Change log entry not found for this item." });

            if (item.CurrentName != log.NewName)
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Revert is only allowed for the current display name. This log entry is not the current version." });

            var oldCurrent = item.CurrentName ?? "";
            item.CurrentName = log.OldName;
            item.UpdatedAt = DateTime.Now;

            _context.ItemChangeLogs.Add(new ItemChangeLog
            {
                ItemId = item.Id,
                OldName = oldCurrent,
                NewName = log.OldName,
                OldRevision = item.RevisionNo ?? "",
                NewRevision = item.RevisionNo ?? "",
                ChangeType = "Revert",
                Source = "ManualRevert",
                RevertedFromLogId = log.Id,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Item> { Data = item, Message = "Display name reverted successfully." });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Item>>> Update(int id, [FromBody] UpdateItemDto dto)
        {
            if (!await IsAdmin()) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (id != dto.Id) return BadRequest(new ApiResponse<Item> { Success = false, Message = "ID mismatch" });

            var existing = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (existing == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            if (await _itemState.HasAnyTransactionHistoryAsync(id))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "This item has transaction or transfer history. Master data cannot be updated." });

            if (!string.IsNullOrWhiteSpace(dto.MainPartName))
            {
                var mainPartTrim = dto.MainPartName.Trim();
                if (mainPartTrim.ToLower() != existing.MainPartName.ToLower())
                {
                    if (await _context.Items.AnyAsync(p => p.LocationId == locationId && p.Id != id && p.MainPartName.ToLower() == mainPartTrim.ToLower()))
                        return BadRequest(new ApiResponse<Item> { Success = false, Message = "Main Part Name must be unique within this location" });
                    existing.MainPartName = mainPartTrim;
                }
            }

            if (dto.CurrentName != null)
            {
                var nameTrim = dto.CurrentName.Trim();
                if (nameTrim.ToLower() != existing.CurrentName.ToLower())
                {
                    if (await _context.Items.AnyAsync(p => p.LocationId == locationId && p.Id != id && p.CurrentName.ToLower() == nameTrim.ToLower()))
                        return BadRequest(new ApiResponse<Item> { Success = false, Message = "Display Name already exists in this location" });
                    existing.CurrentName = nameTrim;
                }
            }
            if (dto.ItemTypeId > 0)
                existing.ItemTypeId = dto.ItemTypeId;
            if (dto.MaterialId > 0)
                existing.MaterialId = dto.MaterialId;
            if (dto.OwnerTypeId > 0)
                existing.OwnerTypeId = dto.OwnerTypeId;
            if (dto.StatusId > 0)
                existing.StatusId = dto.StatusId;
            if (dto.DrawingNo != null)
            {
                var drawingTrim = dto.DrawingNo.Trim();
                if (drawingTrim != existing.DrawingNo)
                {
                    if (await _context.Items.AnyAsync(p => p.LocationId == locationId && p.Id != id && p.DrawingNo != null && p.DrawingNo.ToLower() == drawingTrim.ToLower()))
                        return BadRequest(new ApiResponse<Item> { Success = false, Message = "Drawing Number already exists" });
                    existing.DrawingNo = drawingTrim;
                }
            }
            if (dto.RevisionNo != null)
                existing.RevisionNo = dto.RevisionNo.Trim();

            if (dto.CurrentHolderType != null)
            {
                var s = dto.CurrentHolderType.Trim().ToLower();
                existing.CurrentProcess = s switch {
                    var x when x == "location" || x == "at location" || x == "at_location" || x == "instock" || x == "inwarddone" || x == "inqc" => ItemProcessState.InStock,
                    var x when x == "vendor" || x == "party" || x == "at vendor" || x == "outward" || x == "injobwork" || x == "inpo" => ItemProcessState.AtVendor,
                    _ => ItemProcessState.NotInStock
                };
                existing.CurrentLocationId = (s == "location" || s == "at location" || s == "at_location" || s == "instock") ? (dto.CurrentLocationId ?? locationId) : null;
                existing.CurrentPartyId = (s == "vendor" || s == "party" || s == "at vendor" || s == "outward") ? dto.CurrentPartyId : null;
            }

            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Item> { Data = existing });
        }

        /// <summary>Toggle item active state. Admin only. Deactivation allowed only when process is Not In Stock or In Stock.</summary>
        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<Item>>> SetActive(int id, [FromBody] ToggleItemActiveDto dto)
        {
            if (!await IsAdmin()) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var existing = await _context.Items.FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (existing == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            if (!dto.IsActive)
            {
                if (existing.CurrentProcess != ItemProcessState.NotInStock && existing.CurrentProcess != ItemProcessState.InStock)
                    return BadRequest(new ApiResponse<Item> { Success = false, Message = "Only items with process 'Not In Stock' or 'In Stock' can be deactivated. This item is currently in a transaction or transfer flow." });
            }

            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Item> { Data = existing, Message = dto.IsActive ? "Item activated" : "Item deactivated" });
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            if (!await HasAllPermissions("ViewMaster", "ExportMaster", "ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var items = await _context.Items
                .Where(i => i.LocationId == locationId)
                .Include(i => i.ItemType)
                .Include(i => i.Material)
                .Include(i => i.OwnerType)
                .Include(i => i.Status)
                .Include(i => i.CurrentLocation)
                .Include(i => i.CurrentParty)
                .ToListAsync();

            var data = items.Select(i => new {
                PartName = i.MainPartName,
                DisplayName = i.CurrentName,
                AssetType = i.ItemType?.Name,
                DrawingNo = i.DrawingNo,
                Revision = i.RevisionNo,
                Material = i.Material?.Name,
                Ownership = i.OwnerType?.Name,
                Condition = i.Status?.Name,
                CustodianType = i.CurrentProcess == ItemProcessState.NotInStock ? "Not in stock" : (i.CurrentProcess == ItemProcessState.InStock ? "Location" : "Vendor"),
                CustodianName = i.CurrentProcess == ItemProcessState.NotInStock ? "—" : (i.CurrentProcess == ItemProcessState.InStock ? i.CurrentLocation?.Name : i.CurrentParty?.Name),
                IsActive = i.IsActive ? "Yes" : "No"
            });

            var file = _excelService.GenerateExcel(data, "Die Pattern Masters");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "die_pattern_masters.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<ItemImportDto>>>> Validate(IFormFile file)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageItem")) return Forbidden();
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");
            using var stream = file.OpenReadStream();
            var excelResult = _excelService.ImportExcel<ItemImportDto>(stream);
            var validation = await ValidateImport(excelResult.Data);
            validation.TotalRows = excelResult.TotalRows;
            return Ok(new ApiResponse<ValidationResultDto<ItemImportDto>> { Data = validation });
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasAllPermissions("ViewMaster", "ImportMaster", "ManageItem")) return Forbidden();
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");
            var locationId = await GetCurrentLocationIdAsync();
            var currentLocation = await _context.Locations.Include(l => l.Company).AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            var currentLocationName = (currentLocation?.Name ?? "").Trim();
            var companyName = currentLocation?.Company?.Name ?? "Company";
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars())).Trim();
            var safeLocationName = string.Concat(currentLocationName.Split(Path.GetInvalidFileNameChars())).Trim();
            var openingFolder = Path.Combine("storage", companyName, safeLocationName, "Item Master Opening");
            var wwwroot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var fullDir = Path.Combine(wwwroot, openingFolder);
            if (!Directory.Exists(fullDir)) Directory.CreateDirectory(fullDir);
            var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            var originalName = file.FileName?.Trim() ?? "import.xlsx";
            if (!originalName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)) originalName += ".xlsx";
            var safeFileName = $"{timestamp}_{string.Concat(Path.GetFileNameWithoutExtension(originalName).Split(Path.GetInvalidFileNameChars()))}.xlsx";
            var relativePath = Path.Combine(openingFolder, safeFileName).Replace("\\", "/");
            var fullPath = Path.Combine(fullDir, safeFileName);

            await using (var saveStream = new FileStream(fullPath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await file.CopyToAsync(saveStream);
            }

            ImportResultDto<ItemImportDto> excelResult;
            using (var readStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                excelResult = _excelService.ImportExcel<ItemImportDto>(readStream);
            }
            var validation = await ValidateImport(excelResult.Data);
            var companyId = currentLocation?.CompanyId ?? 0;

            if (validation.Valid.Any())
            {
                foreach (var row in validation.Valid)
                {
                    var assetTypeTrim = row.Data.AssetType?.Trim() ?? "";
                    var materialTrim = row.Data.Material?.Trim() ?? "";
                    var ownershipTrim = row.Data.Ownership?.Trim() ?? "";
                    var statusTrim = row.Data.Condition?.Trim() ?? "";
                    var custodianTypeTrim = row.Data.CustodianType?.Trim() ?? "";
                    var custodianNameTrim = row.Data.CustodianName?.Trim() ?? "";

                    var type = await _context.ItemTypes.FirstOrDefaultAsync(t => t.Name.Trim().ToLower() == assetTypeTrim.ToLower());
                    var material = await _context.Materials.FirstOrDefaultAsync(m => m.Name.Trim().ToLower() == materialTrim.ToLower());
                    var ownerType = await _context.OwnerTypes.FirstOrDefaultAsync(o => o.Name.Trim().ToLower() == ownershipTrim.ToLower());
                    var status = await _context.ItemStatuses.FirstOrDefaultAsync(s => s.Name.Trim().ToLower() == statusTrim.ToLower());

                    if (type == null || material == null || ownerType == null || status == null)
                        continue;

                    ItemProcessState currentProcess;
                    int? currentLocationId = null;
                    int? currentPartyId = null;
                    if (string.Equals(custodianTypeTrim, "Location", StringComparison.OrdinalIgnoreCase) && string.Equals(custodianNameTrim, currentLocationName, StringComparison.OrdinalIgnoreCase))
                    {
                        currentProcess = ItemProcessState.InStock;
                        currentLocationId = locationId;
                    }
                    else if (string.Equals(custodianTypeTrim, "Vendor", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(custodianNameTrim))
                    {
                        var party = await _context.Parties.FirstOrDefaultAsync(p => p.CompanyId == companyId && p.IsActive && p.Name.Trim().ToLower() == custodianNameTrim.ToLower());
                        if (party != null)
                        {
                            currentProcess = ItemProcessState.AtVendor;
                            currentPartyId = party.Id;
                        }
                        else
                        {
                            currentProcess = ItemProcessState.NotInStock;
                        }
                    }
                    else
                    {
                        currentProcess = ItemProcessState.NotInStock;
                    }

                    _context.Items.Add(new Item
                    {
                        MainPartName = row.Data.PartName.Trim(),
                        CurrentName = !string.IsNullOrWhiteSpace(row.Data.DisplayName) ? row.Data.DisplayName.Trim() : row.Data.PartName.Trim(),
                        ItemTypeId = type.Id,
                        DrawingNo = row.Data.DrawingNo?.Trim(),
                        RevisionNo = row.Data.Revision?.Trim() ?? "0",
                        MaterialId = material.Id,
                        OwnerTypeId = ownerType.Id,
                        StatusId = status.Id,
                        CurrentProcess = currentProcess,
                        CurrentLocationId = currentLocationId,
                        CurrentPartyId = currentPartyId,
                        LocationId = locationId,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                        IsActive = !(row.Data.IsActive?.Trim().Equals("No", StringComparison.OrdinalIgnoreCase) ?? false)
                    });
                }
                await _context.SaveChangesAsync();

                // Build traceability: which items were successfully imported (row, mainPartName, displayName)
                var importedItemsList = validation.Valid.Select(v => new { row = v.Row, mainPartName = (v.Data.PartName ?? "").Trim(), displayName = (!string.IsNullOrWhiteSpace(v.Data.DisplayName) ? v.Data.DisplayName.Trim() : (v.Data.PartName ?? "").Trim()) }).ToList();
                var importedItemsJson = System.Text.Json.JsonSerializer.Serialize(importedItemsList);
                int totalRowsInFile = excelResult.TotalRows;
                string? importedOnlyRelativePath = null;

                // Save "imported only" Excel so user can download exactly which rows were imported (same columns as template)
                if (validation.Valid.Count > 0)
                {
                    var importedOnlyBytes = _excelService.GenerateItemMasterImportedOnlyExcel(validation.Valid.Select(v => v.Data).ToList());
                    var importedOnlyFileName = Path.GetFileNameWithoutExtension(safeFileName) + "_imported.xlsx";
                    var importedOnlyFullPath = Path.Combine(fullDir, importedOnlyFileName);
                    await System.IO.File.WriteAllBytesAsync(importedOnlyFullPath, importedOnlyBytes);
                    importedOnlyRelativePath = Path.Combine(openingFolder, importedOnlyFileName).Replace("\\", "/");
                }

                try
                {
                    _context.ItemMasterOpeningHistory.Add(new ItemMasterOpeningHistory
                    {
                        LocationId = locationId,
                        FilePath = relativePath,
                        OriginalFileName = originalName,
                        ImportedAt = DateTime.Now,
                        ImportedByUserId = CurrentUserId,
                        ItemsImportedCount = validation.Valid.Count,
                        TotalRowsInFile = totalRowsInFile,
                        ImportedItemsJson = importedItemsJson,
                        ImportedOnlyFilePath = importedOnlyRelativePath
                    });
                    await _context.SaveChangesAsync();
                }
                catch (Microsoft.EntityFrameworkCore.DbUpdateException ex) when (ex.InnerException is Microsoft.Data.SqlClient.SqlException sqlEx && sqlEx.Number == 208)
                {
                    // Table item_master_opening_history does not exist; run Scripts/CreateItemMasterOpeningHistory.sql or apply migrations
                }
            }
            else
            {
                if (System.IO.File.Exists(fullPath))
                    try { System.IO.File.Delete(fullPath); } catch { /* ignore cleanup failure */ }
            }

            return Ok(new ApiResponse<object> { 
                Data = new { imported = validation.Valid.Count, totalRows = excelResult.TotalRows }, 
                Message = $"{validation.Valid.Count} records imported successfully. Invalid/Duplicates/Already Exists are not imported." 
            });
        }

        [HttpGet("opening-history")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetOpeningHistory()
        {
            if (!await HasPermission("ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            try
            {
                var list = await _context.ItemMasterOpeningHistory
                    .Where(h => h.LocationId == locationId)
                    .OrderByDescending(h => h.ImportedAt)
                    .Select(h => new
                    {
                        h.Id,
                        h.OriginalFileName,
                        h.ImportedAt,
                        h.ItemsImportedCount,
                        h.TotalRowsInFile,
                        h.ImportedItemsJson,
                        h.ImportedOnlyFilePath,
                        ImportedBy = h.ImportedByUser != null ? (h.ImportedByUser.FirstName + " " + h.ImportedByUser.LastName).Trim() : (string?)null
                    })
                    .ToListAsync();
                return Ok(new ApiResponse<object> { Data = list });
            }
            catch (Exception ex)
            {
                var sqlEx = ex as Microsoft.Data.SqlClient.SqlException ?? ex.InnerException as Microsoft.Data.SqlClient.SqlException;
                if (sqlEx != null && sqlEx.Number == 208)
                {
                    // Table does not exist yet; run Scripts/CreateItemMasterOpeningHistory.sql or apply migrations
                    return Ok(new ApiResponse<object> { Data = Array.Empty<object>() });
                }
                throw;
            }
        }

        [HttpGet("opening-history/{id}/download")]
        public async Task<IActionResult> DownloadOpeningHistoryFile(int id, [FromQuery] string? variant = "full")
        {
            if (!await HasPermission("ManageItem")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            try
            {
                var record = await _context.ItemMasterOpeningHistory
                    .FirstOrDefaultAsync(h => h.Id == id && h.LocationId == locationId);
                if (record == null) return NotFound();
                var wwwroot = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                string pathToServe;
                string downloadName;
                if (string.Equals(variant, "imported", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(record.ImportedOnlyFilePath))
                {
                    pathToServe = Path.GetFullPath(Path.Combine(wwwroot, record.ImportedOnlyFilePath));
                    var baseName = Path.GetFileNameWithoutExtension(record.OriginalFileName ?? "opening-stock");
                    downloadName = baseName + "_imported.xlsx";
                }
                else
                {
                    pathToServe = Path.GetFullPath(Path.Combine(wwwroot, record.FilePath));
                    downloadName = record.OriginalFileName ?? "opening-stock.xlsx";
                }
                if (!pathToServe.StartsWith(Path.GetFullPath(wwwroot), StringComparison.OrdinalIgnoreCase) || !System.IO.File.Exists(pathToServe))
                    return NotFound();
                var contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                return PhysicalFile(pathToServe, contentType, downloadName);
            }
            catch (Exception ex)
            {
                var sqlEx = ex as Microsoft.Data.SqlClient.SqlException ?? ex.InnerException as Microsoft.Data.SqlClient.SqlException;
                if (sqlEx != null && sqlEx.Number == 208)
                    return NotFound();
                throw;
            }
        }

        private async Task<ValidationResultDto<ItemImportDto>> ValidateImport(List<ExcelRow<ItemImportDto>> rows)
        {
            var result = new ValidationResultDto<ItemImportDto>();
            var locationId = await GetCurrentLocationIdAsync();
            var currentLocation = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            var currentLocationName = (currentLocation?.Name ?? "").Trim();

            var itemsQuery = _context.Items.Where(p => p.LocationId == locationId);
            var existingMainPartNames = await itemsQuery.Select(p => p.MainPartName.Trim().ToLower()).ToListAsync();
            var existingDisplayNames = await itemsQuery.Select(p => (p.CurrentName ?? "").Trim().ToLower()).Where(s => !string.IsNullOrEmpty(s)).ToListAsync();
            var existingDrawingNos = await itemsQuery
                .Where(p => !string.IsNullOrEmpty(p.DrawingNo))
                .Select(p => p.DrawingNo!.Trim().ToLower())
                .ToListAsync();

            var typesLower = await _context.ItemTypes.Select(t => t.Name.Trim().ToLower()).ToListAsync();
            var materialsLower = await _context.Materials.Select(m => m.Name.Trim().ToLower()).ToListAsync();
            var ownerTypesLower = await _context.OwnerTypes.Select(o => o.Name.Trim().ToLower()).ToListAsync();
            var statusesLower = await _context.ItemStatuses.Select(s => s.Name.Trim().ToLower()).ToListAsync();
            var companyId = currentLocation?.CompanyId ?? 0;
            var partyNamesLower = companyId > 0
                ? await _context.Parties.Where(p => p.CompanyId == companyId && p.IsActive).Select(p => p.Name.Trim().ToLower()).ToListAsync()
                : new List<string>();

            var batchMainPartNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var batchDisplayNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var batchDrawingNos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var row in rows)
            {
                var d = row.Data;
                var partNameTrim = d.PartName?.Trim() ?? "";
                var displayNameTrim = !string.IsNullOrWhiteSpace(d.DisplayName) ? d.DisplayName.Trim() : partNameTrim;
                var partNameLower = partNameTrim.ToLower();
                var displayNameLower = displayNameTrim.ToLower();

                // 1) Required and invalid masters -> Invalid
                var invalidReasons = new List<string>();
                if (string.IsNullOrWhiteSpace(partNameTrim))
                {
                    invalidReasons.Add("Part Name is required");
                }
                // Custodian validation: Not in stock (blank name), Location (name = current location), Vendor (name = party that must exist in Party Master)
                var custodianTypeTrim = d.CustodianType?.Trim() ?? "";
                var custodianNameTrim = d.CustodianName?.Trim() ?? "";
                if (string.Equals(custodianTypeTrim, "Location", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(custodianNameTrim))
                        invalidReasons.Add("Custodian Name is required when Custodian Type is Location");
                    else if (!string.Equals(custodianNameTrim, currentLocationName, StringComparison.OrdinalIgnoreCase))
                        invalidReasons.Add($"Custodian Name (Location) '{d.CustodianName}' does not match current location (expected: {currentLocationName})");
                }
                else if (string.Equals(custodianTypeTrim, "Vendor", StringComparison.OrdinalIgnoreCase))
                {
                    if (string.IsNullOrWhiteSpace(custodianNameTrim))
                        invalidReasons.Add("Custodian Name is required when Custodian Type is Vendor");
                    else if (companyId <= 0 || !partyNamesLower.Contains(custodianNameTrim.ToLower()))
                        invalidReasons.Add($"Party '{d.CustodianName}' not found in Party Master");
                }
                // Not in stock: Custodian Name should be blank (no strict error; we'll set state to NotInStock on import regardless)
                if (string.IsNullOrWhiteSpace(d.AssetType))
                    invalidReasons.Add("Type (Asset Type) is required");
                else if (!typesLower.Contains(d.AssetType.Trim().ToLower()))
                    invalidReasons.Add($"Type '{d.AssetType}' not found in Type Master");
                if (string.IsNullOrWhiteSpace(d.Material))
                    invalidReasons.Add("Material is required");
                else if (!materialsLower.Contains(d.Material.Trim().ToLower()))
                    invalidReasons.Add($"Material '{d.Material}' not found in Material Master");
                if (string.IsNullOrWhiteSpace(d.Ownership))
                    invalidReasons.Add("Ownership is required");
                else if (!ownerTypesLower.Contains(d.Ownership.Trim().ToLower()))
                    invalidReasons.Add($"Ownership '{d.Ownership}' not found in Owner Master");
                if (string.IsNullOrWhiteSpace(d.Condition))
                    invalidReasons.Add("Condition is required");
                else if (!statusesLower.Contains(d.Condition.Trim().ToLower()))
                    invalidReasons.Add($"Condition '{d.Condition}' not found in Status Master");
                if (!string.IsNullOrWhiteSpace(d.DrawingNo))
                {
                    var drawingLower = d.DrawingNo.Trim().ToLower();
                    if (existingDrawingNos.Contains(drawingLower))
                        invalidReasons.Add("Drawing Number already exists in database");
                    else if (batchDrawingNos.Contains(drawingLower))
                        invalidReasons.Add("Duplicate Drawing Number in file");
                }
                // Track drawing numbers for file-duplicate check (add after we've used it for this row's validation)
                if (!string.IsNullOrWhiteSpace(d.DrawingNo))
                    batchDrawingNos.Add(d.DrawingNo.Trim().ToLower());

                if (invalidReasons.Count > 0)
                {
                    result.Invalid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = string.Join("; ", invalidReasons) });
                    continue;
                }

                // 2) Duplicates within file (Part Name or Display Name)
                if (batchMainPartNames.Contains(partNameLower))
                {
                    result.Duplicates.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = "Duplicate Part Name in file" });
                    continue;
                }
                if (batchDisplayNames.Contains(displayNameLower))
                {
                    result.Duplicates.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = "Duplicate Display Name in file" });
                    continue;
                }

                // 3) Already exists in database (Main Part Name or Display Name)
                if (existingMainPartNames.Contains(partNameLower))
                {
                    result.AlreadyExists.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = "Main Part Name already exists in database" });
                    continue;
                }
                if (!string.IsNullOrWhiteSpace(displayNameLower) && existingDisplayNames.Contains(displayNameLower))
                {
                    result.AlreadyExists.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = "Display Name already exists in database" });
                    continue;
                }

                result.Valid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d });
                batchMainPartNames.Add(partNameLower);
                batchDisplayNames.Add(displayNameLower);
            }

            return result;
        }

    }
}
