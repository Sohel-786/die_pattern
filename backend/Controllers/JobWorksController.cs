using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using net_backend.Utils;

namespace net_backend.Controllers
{
    [Route("api/job-works")]
    [ApiController]
    public class JobWorksController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly Services.IItemStateService _itemState;

        public JobWorksController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, Services.IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _itemState = itemState;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            if (!await HasPermission("CreateMovement") && !await HasPermission("EditMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("JW", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<JobWorkDto>>>> GetPending([FromQuery] int? vendorId, [FromQuery] int? excludeInwardId)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            
            // JW items that are NOT yet Inwarded
            var query = _context.JobWorkItems
                .Include(i => i.JobWork)
                    .ThenInclude(jw => jw!.ToParty)
                .Include(i => i.JobWork)
                    .ThenInclude(jw => jw!.Location)
                .Include(i => i.Item)
                .Where(i => i.JobWork!.LocationId == locationId && i.JobWork.Location!.CompanyId == companyId && i.JobWork.IsActive)
                .AsQueryable();

            if (vendorId.HasValue && vendorId > 0)
                query = query.Where(i => i.JobWork!.ToPartyId == vendorId.Value);

            var list = await query.ToListAsync();

            // Filter out items already fully inwarded (excluding those in the current inward being edited)
            var inwardLinesQuery = _context.InwardLines
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.Inward!.IsActive && l.SourceRefId.HasValue);

            if (excludeInwardId.HasValue && excludeInwardId.Value > 0)
                inwardLinesQuery = inwardLinesQuery.Where(l => l.InwardId != excludeInwardId.Value);

            var inwardedItems = await inwardLinesQuery
                .Select(l => new { jwId = l.SourceRefId!.Value, itemId = l.ItemId })
                .ToListAsync();

            var inwardedSet = new HashSet<string>(inwardedItems.Select(x => $"{x.jwId}_{x.itemId}"));

            var data = list
                .Where(i => !inwardedSet.Contains($"{i.JobWorkId}_{i.ItemId}"))
                .GroupBy(i => i.JobWorkId)
                .Select(g => {
                    var first = g.First();
                    return new JobWorkDto
                    {
                        Id = g.Key,
                        JobWorkNo = first.JobWork!.JobWorkNo,
                        ToPartyId = first.JobWork.ToPartyId,
                        ToPartyName = first.JobWork.ToParty?.Name,
                        Status = first.JobWork.Status,
                        CreatedAt = first.JobWork.CreatedAt,
                        Items = g.Select(i => new JobWorkItemDto { 
                            Id = i.Id, 
                            ItemId = i.ItemId, 
                            ItemName = i.OriginalNameSnapshot ?? i.Item?.CurrentName, 
                            MainPartName = i.Item?.MainPartName,
                            Rate = i.Rate,
                            GstPercent = i.GstPercent,
                            WillChangeName = i.WillChangeName,
                            ProposedNewName = i.ProposedNewName,
                            OriginalNameSnapshot = i.OriginalNameSnapshot ?? i.Item?.CurrentName
                        }).ToList()
                    };
                }).ToList();

            return Ok(new ApiResponse<IEnumerable<JobWorkDto>> { Data = data });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<JobWorkDto>>>> GetAll(
            [FromQuery] JobWorkStatus? status, 
            [FromQuery] string? search,
            [FromQuery] List<int>? partyIds,
            [FromQuery] List<int>? creatorIds,
            [FromQuery] List<int>? itemIds,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var query = _context.JobWorks
                .Include(j => j.Creator)
                .Include(j => j.ToParty)
                .Include(j => j.Location)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.ItemType)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.Material)
                .Where(j => j.LocationId == locationId && j.Location!.CompanyId == companyId)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(j => j.Status == status.Value);
            
            // SECURITY: Only Admin can see inactive entries. For others, force only active records.
            if (!await IsAdmin())
            {
                query = query.Where(j => j.IsActive);
            }
            else if (isActive.HasValue)
            {
                query = query.Where(j => j.IsActive == isActive.Value);
            }

            if (partyIds != null && partyIds.Any())
                query = query.Where(j => partyIds.Contains(j.ToPartyId));

            if (creatorIds != null && creatorIds.Any())
                query = query.Where(j => creatorIds.Contains(j.CreatedBy));

            if (itemIds != null && itemIds.Any())
                query = query.Where(j => j.Items.Any(i => itemIds.Contains(i.ItemId)));

            if (startDate.HasValue)
                query = query.Where(j => j.CreatedAt >= startDate.Value.Date);

            if (endDate.HasValue)
            {
                var ed = endDate.Value.Date.AddDays(1);
                query = query.Where(j => j.CreatedAt < ed);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(j => 
                    j.JobWorkNo.ToLower().Contains(s) || 
                    (j.ToParty != null && j.ToParty.Name.ToLower().Contains(s)) ||
                    j.Items.Any(i => i.Item != null && (i.Item.CurrentName.ToLower().Contains(s) || i.Item.MainPartName.ToLower().Contains(s)))
                );
            }

            var ordered = query.OrderByDescending(j => j.CreatedAt);
            var totalCount = await ordered.CountAsync();
            var (skip, take) = PaginationHelper.GetSkipTake(page, pageSize);
            var list = await ordered.Skip(skip).Take(take).ToListAsync();

            var jobWorkIds = list.Select(j => j.Id).ToList();
            var inwardLines = await _context.InwardLines
                .Include(l => l.Inward)
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId.HasValue && jobWorkIds.Contains(l.SourceRefId.Value) && l.Inward!.IsActive)
                .ToListAsync();

            var lineIds = inwardLines.Select(l => l.Id).ToList();
            var qcItems = await _context.QcItems
                .Include(q => q.QcEntry)
                .Where(q => lineIds.Contains(q.InwardLineId))
                .ToListAsync();

            var data = list.Select(jw => MapToDto(jw, inwardLines, qcItems)).ToList();
            return Ok(new ApiResponse<IEnumerable<JobWorkDto>> { Data = data, TotalCount = totalCount });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<JobWorkDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var jw = await _context.JobWorks
                .Include(j => j.ToParty)
                .Include(j => j.Creator)
                .Include(j => j.Location)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.ItemType)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.Material)
                .FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId && j.Location!.CompanyId == companyId);
            
            if (jw == null) return NotFound();
            if (!jw.IsActive && !await IsAdmin()) return NotFound();

            var inwardLines = await _context.InwardLines
                .Include(l => l.Inward)
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == id && l.Inward!.IsActive)
                .ToListAsync();

            var lineIds = inwardLines.Select(l => l.Id).ToList();
            var qcItems = await _context.QcItems
                .Include(q => q.QcEntry)
                .Where(q => lineIds.Contains(q.InwardLineId))
                .ToListAsync();

            return Ok(new ApiResponse<JobWorkDto> { Data = MapToDto(jw, inwardLines, qcItems) });
        }

        [HttpGet("{id}/print")]
        public async Task<ActionResult<ApiResponse<JobWorkPrintDto>>> GetPrint(int id)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var jw = await _context.JobWorks
                .Include(j => j.ToParty)
                .Include(j => j.Creator)
                .Include(j => j.Location)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId && j.Location!.CompanyId == companyId);

            if (jw == null) return NotFound();
            if (!jw.IsActive && !await IsAdmin()) return NotFound();

            var company = await _context.Companies.FindAsync(companyId);
            var companyName = company?.Name ?? "";
            var companyAddress = string.Join(", ", new[] { company?.Address, company?.City, company?.State, company?.Pincode }.Where(s => !string.IsNullOrWhiteSpace(s)));
            var companyGst = company?.GstNo ?? "";

            var docNo = "-";
            var revNo = "-";
            DateTime? revDate = null;
            var appliedDoc = await _context.DocumentControls
                .Where(d => d.DocumentType == DocumentType.JobWork && d.IsActive && d.IsApplied)
                .FirstOrDefaultAsync();
            if (appliedDoc != null) { docNo = appliedDoc.DocumentNo; revNo = appliedDoc.RevisionNo; revDate = appliedDoc.RevisionDate; }

            var srNo = 0;
            var rows = jw.Items.OrderBy(i => i.Id).Select(i => new JobWorkPrintRowDto
            {
                SrNo = ++srNo,
                PartNo = i.Item?.MainPartName ?? "-",
                ProductName = i.OriginalNameSnapshot ?? i.Item?.CurrentName ?? i.Item?.MainPartName ?? "-",
                ItemTypeName = i.Item?.ItemType?.Name ?? "-",
                MaterialName = i.Item?.Material?.Name ?? "-",
                DrawingNo = i.Item?.DrawingNo ?? "-",
                RevisionNo = i.Item?.RevisionNo ?? "0",
                Rate = i.Rate,
                GstPercent = i.GstPercent,
                Remarks = i.Remarks ?? "",
                WillChangeName = i.WillChangeName,
                ProposedNewName = i.ProposedNewName
            }).ToList();

            var dto = new JobWorkPrintDto
            {
                CompanyName = companyName,
                CompanyAddress = companyAddress,
                CompanyGstNo = companyGst,
                DocumentNo = docNo,
                RevisionNo = revNo,
                RevisionDate = revDate,
                JobWorkNo = jw.JobWorkNo,
                CreatedAt = jw.CreatedAt,
                ToPartyCode = jw.ToParty?.PartyCode ?? "",
                ToPartyName = jw.ToParty?.Name ?? "",
                ToPartyAddress = jw.ToParty?.Address ?? "",
                ToPartyGstNo = jw.ToParty?.GstNo ?? "",
                Description = jw.Description ?? "",
                Remarks = jw.Remarks ?? "",
                PreparedBy = jw.Creator != null ? jw.Creator.FirstName + " " + jw.Creator.LastName : "",
                Rows = rows
            };

            return Ok(new ApiResponse<JobWorkPrintDto> { Data = dto });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<JobWork>>> Create([FromBody] CreateJobWorkDto dto)
        {
            if (!await HasPermission("CreateMovement")) return Forbidden();
            
            var userId = CurrentUserId;
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            
            var company = await _context.Companies.FindAsync(companyId);
            var location = await _context.Locations.FindAsync(locationId);
            
            if (company == null || location == null) 
                return BadRequest(new ApiResponse<JobWork> { Success = false, Message = "Invalid company or location session." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new ApiResponse<JobWork> { Success = false, Message = "At least one item is required." });

            var companyName = company.Name;
            var locationName = location.Name;
            
            // Clean names for folder path
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars())).Trim();
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars())).Trim();

            foreach (var itemDto in dto.Items)
            {
                var state = await _itemState.GetStateAsync(itemDto.ItemId);
                if (state != ItemProcessState.InStock)
                {
                    var stateDisplay = _itemState.GetStateDisplay(state);
                    return BadRequest(new ApiResponse<JobWork> { Success = false, Message = $"Item must be In Stock to send for Job Work. Current state: {stateDisplay}. One item can only be in one process at a time." });
                }
                if (itemDto.WillChangeName)
                {
                    var proposed = (itemDto.ProposedNewName ?? "").Trim();
                    if (string.IsNullOrEmpty(proposed))
                        return BadRequest(new ApiResponse<JobWork> { Success = false, Message = "When 'Will change display name' is selected, New Display Name is required." });
                    if (await _context.Items.AnyAsync(i => i.LocationId == locationId && i.Id != itemDto.ItemId && (i.CurrentName.ToLower() == proposed.ToLower() || i.MainPartName.ToLower() == proposed.ToLower())))
                        return BadRequest(new ApiResponse<JobWork> { Success = false, Message = $"Display name '{proposed}' is already used by another item in this location. Choose a unique name." });
                }
            }

            var nextCode = await _codeGenerator.GenerateCode("JW", locationId);
            var jobWorkNo = nextCode ?? $"JW-{Guid.NewGuid().ToString().Substring(0, 8)}";

            // Process attachments: move temp -> final on save/update boundary.
            var finalAttachmentUrls = new List<string>();
            if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
            {
                var webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                finalAttachmentUrls = await AttachmentStorageMover.MoveTempUrlsToFinalAsync(
                    webRootPath,
                    dto.AttachmentUrls,
                    moduleKey: "job-work",
                    companyDir: companyName,
                    locationDir: locationName,
                    entryKey: jobWorkNo);
            }

            var jw = new JobWork
            {
                JobWorkNo = jobWorkNo,
                ToPartyId = dto.ToPartyId,
                Description = dto.Description,
                Remarks = dto.Remarks,
                Status = JobWorkStatus.Pending,
                LocationId = locationId,
                IsActive = true,
                AttachmentUrlsJson = QuotationUrlsHelper.ToJson(finalAttachmentUrls),
                CreatedBy = userId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var itemDto in dto.Items)
            {
                var item = await _context.Items.FindAsync(itemDto.ItemId);
                jw.Items.Add(new JobWorkItem
                {
                    ItemId = itemDto.ItemId,
                    Rate = itemDto.Rate,
                    GstPercent = itemDto.GstPercent,
                    Remarks = itemDto.Remarks,
                    WillChangeName = itemDto.WillChangeName,
                    ProposedNewName = itemDto.WillChangeName ? (itemDto.ProposedNewName ?? "").Trim() : null,
                    OriginalNameSnapshot = item?.CurrentName
                });

                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InJobwork;
                    item.CurrentPartyId = dto.ToPartyId;
                    item.CurrentLocationId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.JobWorks.Add(jw);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<JobWork> { Data = jw });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreateJobWorkDto dto)
        {
            if (!await HasAllPermissions("ViewMovement", "EditMovement")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var jw = await _context.JobWorks
                .Include(j => j.Items)
                .Include(j => j.Location)
                .FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId && j.Location!.CompanyId == companyId);
            if (jw == null) return NotFound();

            if (!jw.IsActive)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Inactive Job Work entries cannot be updated. Please reactivate the entry first if you need to make changes." });

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            _ = CurrentUserId;

            var company = await _context.Companies.FindAsync(companyId);
            var location = await _context.Locations.FindAsync(locationId);

            var companyName = (company?.Name ?? "General");
            var locationName = (location?.Name ?? "General");
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars())).Trim();
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars())).Trim();

            // Process attachments: move temp -> final on save/update boundary.
            var finalAttachmentUrls = new List<string>();
            if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
            {
                var webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                finalAttachmentUrls = await AttachmentStorageMover.MoveTempUrlsToFinalAsync(
                    webRootPath,
                    dto.AttachmentUrls,
                    moduleKey: "job-work",
                    companyDir: companyName,
                    locationDir: locationName,
                    entryKey: jw.JobWorkNo);
            }

            // Check for inwarded items to prevent their removal or editing of sensitive fields
            var inwardedItems = await _context.InwardLines
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == id && l.Inward!.IsActive)
                .Select(l => l.ItemId)
                .ToListAsync();
            var inwardedSet = new HashSet<int>(inwardedItems);
            
            if (inwardedItems.Any())
            {
                if (jw.ToPartyId != dto.ToPartyId)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot change Party because one or more items have already been inwarded." });
                if (jw.Description != dto.Description)
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot change Purpose because one or more items have already been inwarded." });
            }

            jw.ToPartyId = dto.ToPartyId;
            jw.Description = dto.Description;
            jw.Remarks = dto.Remarks;
            jw.AttachmentUrlsJson = QuotationUrlsHelper.ToJson(finalAttachmentUrls);
            jw.UpdatedAt = DateTime.Now;

            // Update items and their states
            var oldItems = jw.Items.ToList();
            var oldItemIds = oldItems.Select(i => i.ItemId).ToList();
            var newItemIds = dto.Items.Select(i => i.ItemId).ToList();

            // 1. Validate: removed items must NOT be inwarded
            var removedItemIds = oldItemIds.Except(newItemIds).ToList();
            if (removedItemIds.Any(rId => inwardedSet.Contains(rId)))
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "One or more items already have an active Inward and cannot be removed." });
            }
            
            // 1b. Validate: modified inwarded items cannot have Rate, GST, Remarks, or display-name change fields changed
            foreach (var newItem in dto.Items)
            {
                var existingItem = oldItems.FirstOrDefault(oi => oi.ItemId == newItem.ItemId);
                if (existingItem != null && inwardedSet.Contains(newItem.ItemId))
                {
                    if (existingItem.Rate != newItem.Rate || existingItem.GstPercent != newItem.GstPercent || existingItem.Remarks != newItem.Remarks)
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Cannot update Rate, GST, or Remarks of item '{newItem.ItemId}' because its inward is already done." });
                    if (existingItem.WillChangeName != newItem.WillChangeName || (existingItem.ProposedNewName ?? "") != (newItem.ProposedNewName ?? "").Trim())
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot change 'Will change display name' or 'New Display Name' for items that are already inwarded." });
                }
                if (!inwardedSet.Contains(newItem.ItemId) && newItem.WillChangeName)
                {
                    var proposed = (newItem.ProposedNewName ?? "").Trim();
                    if (string.IsNullOrEmpty(proposed))
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = "When 'Will change display name' is selected, New Display Name is required." });
                    if (await _context.Items.AnyAsync(i => i.LocationId == locationId && i.Id != newItem.ItemId && (i.CurrentName.ToLower() == proposed.ToLower() || i.MainPartName.ToLower() == proposed.ToLower())))
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Display name '{proposed}' is already used by another item in this location. Choose a unique name." });
                }
            }

            // 2. Handle Item removals: move back to InStock
            foreach (var rId in removedItemIds)
            {
                var item = await _context.Items.FindAsync(rId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InStock;
                    item.CurrentPartyId = null;
                    item.CurrentLocationId = jw.LocationId;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            // 3. Handle Item additions: check if InStock, then move to InJobwork; validate display-name change for new items
            var addedItemIds = newItemIds.Except(oldItemIds).ToList();
            foreach (var itemDto in dto.Items.Where(x => addedItemIds.Contains(x.ItemId)))
            {
                if (itemDto.WillChangeName)
                {
                    var proposed = (itemDto.ProposedNewName ?? "").Trim();
                    if (string.IsNullOrEmpty(proposed))
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = "When 'Will change display name' is selected, New Display Name is required." });
                    if (await _context.Items.AnyAsync(i => i.LocationId == locationId && i.Id != itemDto.ItemId && (i.CurrentName.ToLower() == proposed.ToLower() || i.MainPartName.ToLower() == proposed.ToLower())))
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Display name '{proposed}' is already used by another item in this location. Choose a unique name." });
                }
                var item = await _context.Items.FindAsync(itemDto.ItemId);
                if (item != null)
                {
                    if (item.CurrentProcess != ItemProcessState.InStock)
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item '{item.MainPartName}' is not in stock (current state: {item.CurrentProcess})." });

                    item.CurrentProcess = ItemProcessState.InJobwork;
                    item.CurrentPartyId = dto.ToPartyId;
                    item.CurrentLocationId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            // 4. Update staying items party
            var stayingItemIds = newItemIds.Intersect(oldItemIds).ToList();
            foreach (var sId in stayingItemIds)
            {
                var item = await _context.Items.FindAsync(sId);
                if (item != null)
                {
                    item.CurrentPartyId = dto.ToPartyId;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            // 5. Rebuild JobWorkItems list
            _context.JobWorkItems.RemoveRange(jw.Items);
            foreach (var itemDto in dto.Items)
            {
                var isItemInwarded = inwardedSet.Contains(itemDto.ItemId);
                var existingItem = oldItems.FirstOrDefault(oi => oi.ItemId == itemDto.ItemId);
                var item = await _context.Items.FindAsync(itemDto.ItemId);

                bool willChange = (isItemInwarded && existingItem != null) ? existingItem.WillChangeName : itemDto.WillChangeName;
                string? proposedNew = (isItemInwarded && existingItem != null) ? existingItem.ProposedNewName : (itemDto.WillChangeName ? (itemDto.ProposedNewName ?? "").Trim() : null);
                string? originalSnap = (existingItem != null && !string.IsNullOrEmpty(existingItem.OriginalNameSnapshot)) ? existingItem.OriginalNameSnapshot : item?.CurrentName;

                jw.Items.Add(new JobWorkItem
                {
                    ItemId = itemDto.ItemId,
                    Rate = (isItemInwarded && existingItem != null) ? existingItem.Rate : itemDto.Rate,
                    GstPercent = (isItemInwarded && existingItem != null) ? existingItem.GstPercent : itemDto.GstPercent,
                    Remarks = (isItemInwarded && existingItem != null) ? existingItem.Remarks : itemDto.Remarks,
                    WillChangeName = willChange,
                    ProposedNewName = proposedNew,
                    OriginalNameSnapshot = originalSnap
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleActive(int id, [FromQuery] bool active)
        {
            if (!await IsAdmin()) return Forbidden();
            if (!await HasAllPermissions("ViewMovement", "EditMovement")) return Forbidden();
            var jw = await _context.JobWorks.Include(j => j.Items).ThenInclude(i => i.Item).FirstOrDefaultAsync(j => j.Id == id);
            if (jw == null) return NotFound();

            if (active == jw.IsActive) return Ok(new ApiResponse<bool> { Data = true });

            if (!active)
            {
                // Rule 1: Cannot inactivate if any item is already inwarded (Standard check)
                var inwardedItems = await _context.InwardLines
                    .Where(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == id && l.Inward!.IsActive)
                    .AnyAsync();

                if (inwardedItems)
                {
                    return BadRequest(new ApiResponse<bool> { Success = false, Message = "Cannot inactivate Job Work because one or more items have already been inwarded." });
                }

                // Rule 1b: PRODUCTION-LEVEL TRACEABILITY: 
                // Cannot deactivate if a LATER active transaction exists for any item.
                foreach (var jwi in jw.Items)
                {
                    var (hasDescendant, txInfo) = await _itemState.CheckForDescendantTransactionsAsync(jwi.ItemId, jw.CreatedAt, jw.Id, "JobWork");
                    if (hasDescendant)
                    {
                        var item = await _context.Items.FindAsync(jwi.ItemId);
                        return BadRequest(new ApiResponse<bool>
                        {
                            Success = false,
                            Message = $"Cannot deactivate Job Work {jw.JobWorkNo}: Item '{item?.MainPartName}' has a subsequent active operation: {txInfo}. You must deactivate the latest operation first."
                        });
                    }
                }

                // Rule 2: Move items back to InStock (only if they are still tied to this process)
                foreach (var jwi in jw.Items)
                {
                    var item = jwi.Item;
                    if (item != null)
                    {
                        // Safety: Only revert if the item's current state confirms it belongs to this Job Work process
                        if (item.CurrentProcess == ItemProcessState.InJobwork && item.CurrentPartyId == jw.ToPartyId)
                        {
                            item.CurrentProcess = ItemProcessState.InStock;
                            item.CurrentPartyId = null;
                            item.CurrentLocationId = jw.LocationId;
                            item.UpdatedAt = DateTime.Now;
                        }
                    }
                }
            }
            else
            {
                // Rule 3: Reactivating - check if all items are safely "InStock"
                foreach (var jwi in jw.Items)
                {
                    var item = jwi.Item;
                    if (item != null)
                    {
                        if (item.CurrentProcess != ItemProcessState.InStock)
                        {
                            return BadRequest(new ApiResponse<bool> 
                            { 
                                Success = false, 
                                Message = $"Item '{item.MainPartName}' is currently in another process ({item.CurrentProcess}) and cannot be pulled back into this Job Work. Please complete or cancel the other process first." 
                            });
                        }
                    }
                }

                // Rule 3b: Traceability - block reactivation if any item has already been inwarded from a *different* Job Work (completed flow)
                foreach (var jwi in jw.Items)
                {
                    var item = jwi.Item;
                    if (item == null) continue;

                    var inwardedFromOtherJw = await _context.InwardLines
                        .Where(l => l.ItemId == item.Id && l.SourceType == InwardSourceType.JobWork && l.SourceRefId != null && l.SourceRefId != id && l.Inward != null && l.Inward.IsActive)
                        .Select(l => l.SourceRefId)
                        .FirstOrDefaultAsync();

                    if (inwardedFromOtherJw.HasValue && inwardedFromOtherJw.Value != id)
                    {
                        var otherJw = await _context.JobWorks.AsNoTracking().FirstOrDefaultAsync(j => j.Id == inwardedFromOtherJw.Value);
                        var otherNo = otherJw?.JobWorkNo ?? inwardedFromOtherJw.Value.ToString();
                        return BadRequest(new ApiResponse<bool>
                        {
                            Success = false,
                            Message = $"Item '{item.MainPartName}' has already been inwarded from Job Work {otherNo}. Cannot reactivate this Job Work — one item can only complete one Job Work flow at a time. Inactivate the other Job Work (without inward) first if you need to use this entry again."
                        });
                    }
                }

                // Rule 4: Move items back to InJobwork
                foreach (var jwi in jw.Items)
                {
                    var item = jwi.Item;
                    if (item != null)
                    {
                        item.CurrentProcess = ItemProcessState.InJobwork;
                        item.CurrentPartyId = jw.ToPartyId;
                        item.CurrentLocationId = null;
                        item.UpdatedAt = DateTime.Now;
                    }
                }
            }

            jw.IsActive = active;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            
            var company = await _context.Companies.FindAsync(companyId);
            var location = await _context.Locations.FindAsync(locationId);
            
            if (company == null || location == null) return BadRequest("Invalid company/location session.");

            var companyName = company.Name;
            var locationName = location.Name;
            
            // Clean names for folder path
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars())).Trim();
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars())).Trim();

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var isImage = ImageOptimizer.IsImageExtension(ext);
            var isPdf = ext == ".pdf";

            if (string.IsNullOrEmpty(ext) || (!isImage && !isPdf))
                return BadRequest("Only PDF and image files (PNG, JPG, JPEG, GIF, WEBP) are allowed.");

            // Temp upload (entry number not known yet). Images are converted to WebP before storing.
            var tempGuid = Guid.NewGuid().ToString("N");
            var tempDirRel = Path.Combine("storage", companyName, locationName, "job-work", "temp", "files", tempGuid);
            var webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadPath = Path.Combine(webRootPath, tempDirRel);
            Directory.CreateDirectory(uploadPath);

            var fileName = isImage ? $"{tempGuid}.webp" : $"{tempGuid}{ext}";
            var filePath = Path.Combine(uploadPath, fileName);

            if (isImage)
            {
                await using var readStream = file.OpenReadStream();
                await ImageOptimizer.OptimizeImageToWebpAsync(readStream, filePath);
            }
            else
            {
                await using var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
                await file.CopyToAsync(stream);
            }

            var url = AttachmentStoragePaths.UrlFromRelPath(tempDirRel + Path.DirectorySeparatorChar + fileName);
            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        [HttpDelete("attachment")]
        public ActionResult<ApiResponse<bool>> DeleteAttachment([FromQuery] string url)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest();
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", url.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private static JobWorkDto MapToDto(JobWork j, List<InwardLine>? inwardLines = null, List<QualityControlItem>? qcItems = null)
        {
            return new JobWorkDto
            {
                Id = j.Id,
                JobWorkNo = j.JobWorkNo,
                ToPartyId = j.ToPartyId,
                ToPartyName = j.ToParty?.Name,
                Description = j.Description,
                Remarks = j.Remarks,
                Status = j.Status,
                IsActive = j.IsActive,
                AttachmentUrls = QuotationUrlsHelper.FromJson(j.AttachmentUrlsJson),
                CreatorName = j.Creator != null ? $"{j.Creator.FirstName} {j.Creator.LastName}" : null,
                CreatedAt = j.CreatedAt,
                Items = j.Items.Select(i => {
                    var line = inwardLines?.OrderByDescending(l => l.Id).FirstOrDefault(l => l.SourceRefId == j.Id && l.ItemId == i.ItemId);
                    // Get the most recent QC item for this inward line - prefer finalised entries (Approved/Rejected) over pending
                    var qc = line != null
                        ? qcItems?.Where(q => q.InwardLineId == line.Id)
                                  .OrderByDescending(q => q.QcEntry?.Status == QcStatus.Approved || q.QcEntry?.Status == QcStatus.Rejected ? 1 : 0)
                                  .ThenByDescending(q => q.Id)
                                  .FirstOrDefault()
                        : null;

                    // Authoritative QC decision: use qi.IsApproved from the QC item record.
                    // InwardLine flags (IsQCPending/IsQCApproved) can get out of sync; qi.IsApproved is the source of truth.
                    bool? qcDecision = qc?.IsApproved; // null=unresolved, true=approved, false=rejected
                    bool isQCEntryFinalised = qc?.QcEntry?.Status == QcStatus.Approved || qc?.QcEntry?.Status == QcStatus.Rejected;

                    return new JobWorkItemDto
                    {
                        Id = i.Id,
                        ItemId = i.ItemId,
                        ItemName = i.OriginalNameSnapshot ?? i.Item?.CurrentName,
                        MainPartName = i.Item?.MainPartName,
                        ItemTypeName = i.Item?.ItemType?.Name,
                        MaterialName = i.Item?.Material?.Name,
                        DrawingNo = i.Item?.DrawingNo,
                        RevisionNo = i.Item?.RevisionNo,
                        Rate = i.Rate,
                        GstPercent = i.GstPercent,
                        Remarks = i.Remarks,
                        WillChangeName = i.WillChangeName,
                        ProposedNewName = i.ProposedNewName,
                        OriginalNameSnapshot = i.OriginalNameSnapshot,
                        InwardNo = line?.Inward?.InwardNo,
                        // Use CreatedAt for accurate inward/QC timestamps
                        InwardDate = line?.Inward?.CreatedAt,
                        QCNo = qc?.QcEntry?.QcNo,
                        IsQCPending = line?.IsQCPending ?? false,
                        IsQCApproved = line?.IsQCApproved ?? false,
                        QCDecision = qcDecision,
                        IsQCEntryFinalised = isQCEntryFinalised,
                        QCDate = qc?.QcEntry?.ApprovedAt ?? qc?.QcEntry?.CreatedAt,
                        IsInwarded = line != null
                    };
                }).ToList()
            };
        }
    }
}
