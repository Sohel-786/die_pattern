using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("dashboard")]
    [ApiController]
    public class DashboardController : BaseController
    {
        private readonly IExcelService _excelService;

        public DashboardController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        /// <summary>Metrics for opened company only: locations of current company, location-wise counts (items at that location), at-vendor count, pending PI/PO counts.</summary>
        [HttpGet("metrics")]
        public async Task<ActionResult<ApiResponse<object>>> GetMetrics([FromQuery] int? locationId)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var allowed = await GetAllowedLocationIdsAsync();
            var companyLocationIds = allowed.Where(x => x.companyId == companyId).Select(x => x.locationId).ToHashSet();

            var locations = await _context.Locations
                .Where(l => l.CompanyId == companyId && companyLocationIds.Contains(l.Id) && l.IsActive)
                .OrderBy(l => l.Name)
                .Select(l => new { l.Id, l.Name })
                .ToListAsync();

            var locationWiseCount = new List<object>();
            int totalAtLocation = 0;
            var inHouseStates = new[] { ItemProcessState.InStock, ItemProcessState.InQC, ItemProcessState.InwardDone };
            foreach (var loc in locations)
            {
                var count = await _context.Items.CountAsync(p =>
                    p.LocationId == loc.Id && inHouseStates.Contains(p.CurrentProcess) && p.IsActive);
                
                // If filtering by locationId, only sum up if it matches
                if (!locationId.HasValue || locationId.Value == 0 || locationId.Value == loc.Id)
                {
                    totalAtLocation += count;
                }
                locationWiseCount.Add(new { locationId = loc.Id, locationName = loc.Name, count });
            }

            var itemsAtVendorQuery = _context.Items.Where(p =>
                companyLocationIds.Contains(p.LocationId ?? 0) &&
                (p.CurrentProcess == ItemProcessState.InJobwork || p.CurrentProcess == ItemProcessState.AtVendor) &&
                p.IsActive);
            
            if (locationId.HasValue && locationId.Value > 0)
                itemsAtVendorQuery = itemsAtVendorQuery.Where(p => p.LocationId == locationId.Value);

            var itemsAtVendor = await itemsAtVendorQuery.CountAsync();

            var pendingPIQuery = _context.PurchaseIndents.Where(pi =>
                pi.IsActive && (
                    pi.Status == PurchaseIndentStatus.Pending ||
                    pi.Status == PurchaseIndentStatus.Rejected ||
                    (pi.Status == PurchaseIndentStatus.Approved &&
                     pi.Items.Any(i => !_context.PurchaseOrderItems.Any(
                         poi => poi.PurchaseIndentItemId == i.Id &&
                                poi.PurchaseOrder != null &&
                                poi.PurchaseOrder.IsActive)))
                ));
            
            if (locationId.HasValue && locationId.Value > 0)
            {
                pendingPIQuery = pendingPIQuery.Where(pi => pi.Items.Any(i => i.Item != null && i.Item.LocationId == locationId.Value));
            }
            else
            {
                pendingPIQuery = pendingPIQuery.Where(pi => pi.Items.Any(i => i.Item != null && companyLocationIds.Contains(i.Item.LocationId ?? 0)));
            }
            
            var pendingPI = await pendingPIQuery.CountAsync();

            var pendingPOQuery = _context.PurchaseOrders.Where(po =>
                po.LocationId != null && companyLocationIds.Contains(po.LocationId.Value) &&
                po.IsActive && 
                (po.Status == PoStatus.Pending || 
                 po.Status == PoStatus.Rejected ||
                 (po.Status == PoStatus.Approved && 
                  po.Items.Any(i => !_context.InwardLines.Any(il => 
                      il.SourceType == InwardSourceType.PO && 
                      il.SourceRefId == po.Id && 
                      i.PurchaseIndentItem != null && il.ItemId == i.PurchaseIndentItem.ItemId && 
                      il.Inward != null && il.Inward.IsActive))
                 )
                ));
            
            if (locationId.HasValue && locationId.Value > 0)
                pendingPOQuery = pendingPOQuery.Where(po => po.LocationId == locationId.Value);

            var pendingPO = await pendingPOQuery.CountAsync();

            var result = new
            {
                summary = new
                {
                    total = totalAtLocation,
                    atVendor = itemsAtVendor,
                    pendingPI,
                    pendingPO
                },
                locationWiseCount
            };

            return Ok(new ApiResponse<object> { Data = result });
        }

        /// <summary>Items at a specific location (CurrentLocationId == locationId, InStock). Only locations of current company.</summary>
        [HttpGet("location-wise-items")]
        public async Task<ActionResult<ApiResponse<object>>> GetLocationWiseItems(
            [FromQuery] int locationId,
            [FromQuery] string? search,
            [FromQuery] int? itemTypeId,
            [FromQuery] int? statusId,
            [FromQuery] int? currentProcessId,
            [FromQuery] string? itemIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var allowed = await GetAllowedLocationIdsAsync();
            var companyLocationIds = allowed.Where(x => x.companyId == companyId).Select(x => x.locationId).ToHashSet();
            if (!companyLocationIds.Contains(locationId))
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid or unauthorized location." });

            var query = _context.Items
                .AsNoTracking()
                .Include(p => p.ItemType)
                .Include(p => p.Status)
                .Include(p => p.Location) // home location (registered location)
                .Where(p => p.LocationId == locationId && p.IsActive);

            if (currentProcessId.HasValue)
            {
                var processState = (ItemProcessState)currentProcessId.Value;
                query = query.Where(p => p.CurrentProcess == processState);
            }
            else
            {
                // Default view: only items considered "at location"
                query = query.Where(p =>
                    p.CurrentProcess == ItemProcessState.InStock ||
                    p.CurrentProcess == ItemProcessState.InQC ||
                    p.CurrentProcess == ItemProcessState.InwardDone);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    (p.MainPartName != null && p.MainPartName.ToLower().Contains(term)) ||
                    (p.CurrentName != null && p.CurrentName.ToLower().Contains(term)) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(term)));
            }
            if (itemTypeId.HasValue && itemTypeId.Value > 0)
                query = query.Where(p => p.ItemTypeId == itemTypeId.Value);
            if (statusId.HasValue && statusId.Value > 0)
                query = query.Where(p => p.StatusId == statusId.Value);


            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0)
                query = query.Where(p => itemIdList.Contains(p.Id));

            var list = await query
                .OrderByDescending(p => p.Id)
                .Select(p => new LocationWiseItemRowDto
                {
                    Id = p.Id,
                    LocationName = p.Location != null ? p.Location.Name : "",
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    StatusName = p.Status != null ? p.Status.Name : null,
                    CurrentProcess = p.CurrentProcess.ToString(),
                    IsActive = p.IsActive
                })
                .ToListAsync();

            return Ok(new ApiResponse<object> { Data = list });
        }

        /// <summary>Items at vendor (InJobwork or AtVendor) with optional filters.</summary>
        [HttpGet("items-at-vendor")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemsAtVendor(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? vendorIds,
            [FromQuery] string? itemIds,
            [FromQuery] int? itemTypeId)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.Items
                .AsNoTracking()
                .Include(p => p.ItemType)
                .Include(p => p.CurrentParty)
                .Where(p => p.LocationId != null && allowedLocationIds.Contains(p.LocationId.Value)
                    && (p.CurrentProcess == ItemProcessState.InJobwork || p.CurrentProcess == ItemProcessState.AtVendor)
                    && p.IsActive);

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(p => p.LocationId == locationId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    (p.MainPartName != null && p.MainPartName.ToLower().Contains(term)) ||
                    (p.CurrentName != null && p.CurrentName.ToLower().Contains(term)) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(term)));
            }

            var vendorIdList = (vendorIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (vendorIdList.Count > 0)
                query = query.Where(p => p.CurrentPartyId != null && vendorIdList.Contains(p.CurrentPartyId.Value));

            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0)
                query = query.Where(p => itemIdList.Contains(p.Id));

            if (itemTypeId.HasValue && itemTypeId.Value > 0)
                query = query.Where(p => p.ItemTypeId == itemTypeId.Value);

            var list = await query
                .OrderByDescending(p => p.Id)
                .Select(p => new ItemAtVendorRowDto
                {
                    Id = p.Id,
                    VendorName = p.CurrentParty != null ? p.CurrentParty.Name : null,
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    CurrentProcess = p.CurrentProcess == ItemProcessState.InJobwork ? "In Jobwork" : "At Vendor"
                })
                .ToListAsync();

            return Ok(new ApiResponse<object> { Data = list });
        }

        /// <summary>Pending PIs (not approved) for current company locations. Full DTO for table and actions.</summary>
        [HttpGet("pending-pi")]
        public async Task<ActionResult<ApiResponse<object>>> GetPendingPI(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? createdDateFrom,
            [FromQuery] string? createdDateTo,
            [FromQuery] string? itemIds,
            [FromQuery] string? status)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseIndents
                .Where(pi => pi.IsActive);

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Pending);
                }
                else if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Approved &&
                        pi.Items.Any(i => !_context.PurchaseOrderItems.Any(
                            poi => poi.PurchaseIndentItemId == i.Id &&
                                   poi.PurchaseOrder != null &&
                                   poi.PurchaseOrder.IsActive)));
                }
                else if (status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Rejected);
                }
            }
            else
            {
                // Default "All" view for the Pending section: Show what's actionable
                query = query.Where(pi => 
                    pi.Status == PurchaseIndentStatus.Pending ||
                    pi.Status == PurchaseIndentStatus.Rejected ||
                    (pi.Status == PurchaseIndentStatus.Approved &&
                     pi.Items.Any(i => !_context.PurchaseOrderItems.Any(
                         poi => poi.PurchaseIndentItemId == i.Id &&
                                poi.PurchaseOrder != null &&
                                poi.PurchaseOrder.IsActive)))
                );
            }


            if (locationId.HasValue && locationId.Value > 0)
            {
                query = query.Where(pi => pi.Items.Any(i => i.Item != null && i.Item.LocationId == locationId.Value));
            }
            else
            {
                query = query.Where(pi => pi.Items.Any(i => i.Item != null && allowedLocationIds.Contains(i.Item.LocationId ?? 0)));
            }

            query = query.OrderByDescending(pi => pi.CreatedAt)
                .Include(pi => pi.Creator)
                .Include(pi => pi.Approver)
                .Include(pi => pi.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(pi => pi.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .AsQueryable();

            var searchTrim = (search ?? "").Trim();
            if (!string.IsNullOrEmpty(searchTrim))
            {
                searchTrim = searchTrim.ToLowerInvariant();
                query = query.Where(p =>
                    p.PiNo.ToLower().Contains(searchTrim) ||
                    (p.Creator != null && (p.Creator.FirstName + " " + p.Creator.LastName).ToLower().Contains(searchTrim)) ||
                    (p.Remarks != null && p.Remarks.ToLower().Contains(searchTrim)));
            }

            if (!string.IsNullOrWhiteSpace(createdDateFrom) && DateTime.TryParse(createdDateFrom, out var dateFrom))
                query = query.Where(p => p.CreatedAt.Date >= dateFrom.Date);
            if (!string.IsNullOrWhiteSpace(createdDateTo) && DateTime.TryParse(createdDateTo, out var dateTo))
                query = query.Where(p => p.CreatedAt.Date <= dateTo.Date);

            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0)
                query = query.Where(p => p.Items.Any(i => itemIdList.Contains(i.ItemId)));

            var list = await query.ToListAsync();

            var data = list.Select(p => new PurchaseIndentDto
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
            }).ToList();

            return Ok(new ApiResponse<object> { Data = data });
        }

        /// <summary>Pending POs for current company locations. Full DTO for table and actions.</summary>
        [HttpGet("pending-po")]
        public async Task<ActionResult<ApiResponse<object>>> GetPendingPO(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? poDateFrom,
            [FromQuery] string? poDateTo,
            [FromQuery] string? vendorIds,
            [FromQuery] string? status)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseOrders
                .Where(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value) && po.IsActive);

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Pending);
                }
                else if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Approved &&
                         po.Items.Any(i => !_context.InwardLines.Any(il =>
                             il.SourceType == InwardSourceType.PO &&
                             il.SourceRefId == po.Id &&
                             i.PurchaseIndentItem != null && il.ItemId == i.PurchaseIndentItem.ItemId &&
                             il.Inward != null && il.Inward.IsActive)));
                }
                else if (status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Rejected);
                }
            }
            else
            {
                query = query.Where(po => 
                    po.Status == PoStatus.Pending ||
                    po.Status == PoStatus.Rejected ||
                    (po.Status == PoStatus.Approved &&
                     po.Items.Any(i => !_context.InwardLines.Any(il =>
                         il.SourceType == InwardSourceType.PO &&
                         il.SourceRefId == po.Id &&
                         i.PurchaseIndentItem != null && il.ItemId == i.PurchaseIndentItem.ItemId &&
                         il.Inward != null && il.Inward.IsActive)))
                );
            }

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(po => po.LocationId == locationId.Value);

            query = query.OrderByDescending(po => po.CreatedAt)
                .Include(po => po.Vendor)
                .Include(po => po.Creator)
                .Include(po => po.Approver)
                .Include(po => po.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.ItemType)
                .Include(po => po.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.Item)
                            .ThenInclude(it => it!.Material)
                .Include(po => po.Items)
                    .ThenInclude(i => i.PurchaseIndentItem)
                        .ThenInclude(pii => pii!.PurchaseIndent)
                .AsQueryable();

            var searchTrim = (search ?? "").Trim();
            if (!string.IsNullOrEmpty(searchTrim))
            {
                searchTrim = searchTrim.ToLowerInvariant();
                query = query.Where(p =>
                    p.PoNo.ToLower().Contains(searchTrim) ||
                    (p.Vendor != null && p.Vendor.Name.ToLower().Contains(searchTrim)) ||
                    (p.Remarks != null && p.Remarks.ToLower().Contains(searchTrim)) ||
                    (p.Creator != null && (p.Creator.FirstName + " " + p.Creator.LastName).ToLower().Contains(searchTrim)));
            }

            if (!string.IsNullOrWhiteSpace(poDateFrom) && DateTime.TryParse(poDateFrom, out var dateFrom))
                query = query.Where(p => p.CreatedAt.Date >= dateFrom.Date);
            if (!string.IsNullOrWhiteSpace(poDateTo) && DateTime.TryParse(poDateTo, out var dateTo))
                query = query.Where(p => p.CreatedAt.Date <= dateTo.Date);

            var vendorIdList = (vendorIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (vendorIdList.Count > 0)
                query = query.Where(p => vendorIdList.Contains(p.VendorId));

            var pos = await query.ToListAsync();
            var poIds = pos.Select(p => p.Id).ToList();
            
            // Pre-fetch Inward and QC details for all items in these POs
            var inwardLines = await _context.InwardLines
                .Include(l => l.Inward)
                .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && poIds.Contains(l.SourceRefId.Value) && l.Inward != null && l.Inward.IsActive)
                .ToListAsync();

            var inwardLineIds = inwardLines.Select(l => l.Id).ToList();
            var qcItems = await _context.QcItems
                .Include(q => q.QcEntry)
                .Where(q => inwardLineIds.Contains(q.InwardLineId) && q.QcEntry != null && q.QcEntry.IsActive)
                .ToListAsync();

            var hasInwardSet = inwardLines.Select(l => l.SourceRefId!.Value).Distinct().ToHashSet();

            var data = pos.Select(po =>
            {
                var dto = new PODto { HasInward = hasInwardSet.Contains(po.Id) };
                PurchaseOrdersController.MapToDto(po, dto);
                
                dto.Items = po.Items.Select(i => {
                    var line = inwardLines.FirstOrDefault(l => l.SourceRefId == po.Id && l.ItemId == (i.PurchaseIndentItem != null ? i.PurchaseIndentItem.ItemId : 0));
                    var qc = line != null ? qcItems.FirstOrDefault(q => q.InwardLineId == line.Id) : null;
                    
                    return new POItemDto
                    {
                        Id = i.Id,
                        PurchaseIndentItemId = i.PurchaseIndentItemId,
                        ItemId = i.PurchaseIndentItem?.ItemId ?? 0,
                        MainPartName = i.PurchaseIndentItem?.Item?.MainPartName,
                        CurrentName = i.PurchaseIndentItem?.Item?.CurrentName,
                        ItemTypeName = i.PurchaseIndentItem?.Item?.ItemType?.Name,
                        DrawingNo = i.PurchaseIndentItem?.Item?.DrawingNo,
                        RevisionNo = i.PurchaseIndentItem?.Item?.RevisionNo,
                        MaterialName = i.PurchaseIndentItem?.Item?.Material?.Name,
                        PiNo = i.PurchaseIndentItem?.PurchaseIndent?.PiNo ?? "N/A",
                        PiDate = i.PurchaseIndentItem?.PurchaseIndent?.CreatedAt,
                        Rate = i.Rate,
                        IsInwarded = line != null,
                        InwardNo = line?.Inward?.InwardNo,
                        InwardDate = line?.Inward?.InwardDate,
                        QCNo = qc?.QcEntry?.QcNo,
                        QCDate = qc?.QcEntry?.CreatedAt
                    };
                }).ToList();

                return dto;
            }).ToList();

            return Ok(new ApiResponse<object> { Data = data });
        }

        // ---------- Export endpoints (same filters as list; export filtered data only) ----------

        [HttpGet("export/location-wise-items")]
        public async Task<IActionResult> ExportLocationWiseItems(
            [FromQuery] int locationId,
            [FromQuery] string? search,
            [FromQuery] int? itemTypeId,
            [FromQuery] int? statusId,
            [FromQuery] int? currentProcessId,
            [FromQuery] string? itemIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var allowed = await GetAllowedLocationIdsAsync();
            var companyLocationIds = allowed.Where(x => x.companyId == companyId).Select(x => x.locationId).ToHashSet();
            if (!companyLocationIds.Contains(locationId))
                return BadRequest("Invalid or unauthorized location.");

            var query = _context.Items
                .AsNoTracking()
                .Include(p => p.ItemType)
                .Include(p => p.Status)
                .Include(p => p.Location) // home location (registered location)
                .Where(p => p.LocationId == locationId && p.IsActive);

            if (currentProcessId.HasValue)
            {
                var processState = (ItemProcessState)currentProcessId.Value;
                query = query.Where(p => p.CurrentProcess == processState);
            }
            else
            {
                query = query.Where(p =>
                    p.CurrentProcess == ItemProcessState.InStock ||
                    p.CurrentProcess == ItemProcessState.InQC ||
                    p.CurrentProcess == ItemProcessState.InwardDone);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    (p.MainPartName != null && p.MainPartName.ToLower().Contains(term)) ||
                    (p.CurrentName != null && p.CurrentName.ToLower().Contains(term)) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(term)));
            }
            if (itemTypeId.HasValue && itemTypeId.Value > 0) query = query.Where(p => p.ItemTypeId == itemTypeId.Value);
            if (statusId.HasValue && statusId.Value > 0) query = query.Where(p => p.StatusId == statusId.Value);

            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0) query = query.Where(p => itemIdList.Contains(p.Id));

            var rows = await query.OrderByDescending(p => p.Id)
                .Select(p => new LocationWiseItemRowDto
                {
                    Id = p.Id,
                    LocationName = p.Location != null ? p.Location.Name : "",
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    StatusName = p.Status != null ? p.Status.Name : null,
                    CurrentProcess = p.CurrentProcess.ToString(),
                    IsActive = p.IsActive
                }).ToListAsync();

            var location = await _context.Locations.FirstOrDefaultAsync(l => l.Id == locationId);
            var locName = location?.Name ?? "Selected Location";

            var bytes = _excelService.GenerateLocationWiseItemsExcel(rows, locName);
            var fileName = $"Location_Wise_Items_{locName.Replace(" ", "_")}_{DateTime.Now:ddMMyy_HHmm}.xlsx";
            
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("export/items-at-vendor")]
        public async Task<IActionResult> ExportItemsAtVendor(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? vendorIds,
            [FromQuery] string? itemIds,
            [FromQuery] int? itemTypeId)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.Items
                .AsNoTracking()
                .Include(p => p.ItemType)
                .Include(p => p.CurrentParty)
                .Where(p => p.LocationId != null && allowedLocationIds.Contains(p.LocationId.Value)
                    && (p.CurrentProcess == ItemProcessState.InJobwork || p.CurrentProcess == ItemProcessState.AtVendor)
                    && p.IsActive);

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(p => p.LocationId == locationId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(p =>
                    (p.MainPartName != null && p.MainPartName.ToLower().Contains(term)) ||
                    (p.CurrentName != null && p.CurrentName.ToLower().Contains(term)) ||
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(term)));
            }
            var vendorIdList = (vendorIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (vendorIdList.Count > 0) query = query.Where(p => p.CurrentPartyId != null && vendorIdList.Contains(p.CurrentPartyId.Value));
            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0) query = query.Where(p => itemIdList.Contains(p.Id));
            if (itemTypeId.HasValue && itemTypeId.Value > 0) query = query.Where(p => p.ItemTypeId == itemTypeId.Value);

            var rows = await query.OrderByDescending(p => p.Id)
                .Select(p => new ItemAtVendorRowDto
                {
                    Id = p.Id,
                    VendorName = p.CurrentParty != null ? p.CurrentParty.Name : null,
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    CurrentProcess = p.CurrentProcess == ItemProcessState.InJobwork ? "In Jobwork" : "At Vendor"
                }).ToListAsync();

            string locName = "All Locations";
            if (locationId.HasValue && locationId.Value > 0)
            {
                var loc = await _context.Locations.FirstOrDefaultAsync(l => l.Id == locationId.Value);
                if (loc != null) locName = loc.Name;
            }

            var bytes = _excelService.GenerateItemsAtVendorExcel(rows, locName);
            var fileName = $"Patterns_At_Vendor_{locName.Replace(" ", "_")}_{DateTime.Now:ddMMyy_HHmm}.xlsx";
            
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("export/pending-pi")]
        public async Task<IActionResult> ExportPendingPI(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? createdDateFrom,
            [FromQuery] string? createdDateTo,
            [FromQuery] string? itemIds,
            [FromQuery] string? status)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            // Same expanded filter as GetPendingPI
            var query = _context.PurchaseIndents
                .Where(pi => pi.IsActive);

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Pending);
                }
                else if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Approved &&
                        pi.Items.Any(i => !_context.PurchaseOrderItems.Any(
                            poi => poi.PurchaseIndentItemId == i.Id &&
                                   poi.PurchaseOrder != null &&
                                   poi.PurchaseOrder.IsActive)));
                }
                else if (status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(pi => pi.Status == PurchaseIndentStatus.Rejected);
                }
            }
            else
            {
                query = query.Where(pi => 
                    pi.Status == PurchaseIndentStatus.Pending ||
                    pi.Status == PurchaseIndentStatus.Rejected ||
                    (pi.Status == PurchaseIndentStatus.Approved &&
                     pi.Items.Any(i => !_context.PurchaseOrderItems.Any(
                         poi => poi.PurchaseIndentItemId == i.Id &&
                                poi.PurchaseOrder != null &&
                                poi.PurchaseOrder.IsActive)))
                );
            }

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(pi => pi.Items.Any(i => i.Item != null && i.Item.LocationId == locationId.Value));
            else
                query = query.Where(pi => pi.Items.Any(i => i.Item != null && allowedLocationIds.Contains(i.Item.LocationId ?? 0)));

            query = query.OrderByDescending(pi => pi.CreatedAt)
                .Include(pi => pi.Creator)
                .Include(pi => pi.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .AsQueryable();

            var searchTrim = (search ?? "").Trim();
            if (!string.IsNullOrEmpty(searchTrim))
            {
                searchTrim = searchTrim.ToLowerInvariant();
                query = query.Where(p =>
                    p.PiNo.ToLower().Contains(searchTrim) ||
                    (p.Creator != null && (p.Creator.FirstName + " " + p.Creator.LastName).ToLower().Contains(searchTrim)) ||
                    (p.Remarks != null && p.Remarks.ToLower().Contains(searchTrim)));
            }
            if (!string.IsNullOrWhiteSpace(createdDateFrom) && DateTime.TryParse(createdDateFrom, out var dateFrom))
                query = query.Where(p => p.CreatedAt.Date >= dateFrom.Date);
            if (!string.IsNullOrWhiteSpace(createdDateTo) && DateTime.TryParse(createdDateTo, out var dateTo))
                query = query.Where(p => p.CreatedAt.Date <= dateTo.Date);
            var itemIdList = (itemIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
            if (itemIdList.Count > 0) query = query.Where(p => p.Items.Any(i => itemIdList.Contains(i.ItemId)));

            var piList = await query.ToListAsync();

            // Build item-level rows — only items NOT in any active PO
            var rows = new List<PendingPIRowDto>();
            foreach (var pi in piList)
            {
                var piStatus = pi.Status switch {
                    PurchaseIndentStatus.Approved => "PI Approved",
                    PurchaseIndentStatus.Rejected => "PI Rejected",
                    _ => "Approval Pending"
                };
                foreach (var item in pi.Items)
                {
                    bool isInActivePO = _context.PurchaseOrderItems.Any(
                        poi => poi.PurchaseIndentItemId == item.Id &&
                               poi.PurchaseOrder != null &&
                               poi.PurchaseOrder.IsActive);
                    if (isInActivePO) continue; // skip items already in a PO

                    rows.Add(new PendingPIRowDto
                    {
                        Id = pi.Id,
                        PiNo = pi.PiNo,
                        PiDate = pi.CreatedAt,
                        PiStatus = piStatus,
                        Type = pi.Type.ToString(),
                        CreatorName = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : "Unknown",
                        Remarks = pi.Remarks,
                        MainPartName = item.Item?.MainPartName ?? "",
                        CurrentName = item.Item?.CurrentName,
                        DrawingNo = item.Item?.DrawingNo,
                        ItemTypeName = item.Item?.ItemType?.Name
                    });
                }
            }

            string locName = "All Locations";
            if (locationId.HasValue && locationId.Value > 0)
            {
                var loc = await _context.Locations.FirstOrDefaultAsync(l => l.Id == locationId.Value);
                if (loc != null) locName = loc.Name;
            }

            var bytes = _excelService.GeneratePendingPIExcel(rows, locName);
            var fileName = $"Pending_PI_{locName.Replace(" ", "_")}_{DateTime.Now:ddMMyy_HHmm}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpGet("export/pending-po")]
        public async Task<IActionResult> ExportPendingPO(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? poDateFrom,
            [FromQuery] string? poDateTo,
            [FromQuery] string? vendorIds,
            [FromQuery] string? status)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseOrders
                .Where(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value) && po.IsActive);

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                if (status.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Pending);
                }
                else if (status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Approved &&
                         po.Items.Any(i => !_context.InwardLines.Any(il =>
                             il.SourceType == InwardSourceType.PO &&
                             il.SourceRefId == po.Id &&
                             i.PurchaseIndentItem != null && il.ItemId == i.PurchaseIndentItem.ItemId &&
                             il.Inward != null && il.Inward.IsActive)));
                }
                else if (status.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(po => po.Status == PoStatus.Rejected);
                }
            }
            else
            {
                query = query.Where(po => 
                    po.Status == PoStatus.Pending ||
                    po.Status == PoStatus.Rejected ||
                    (po.Status == PoStatus.Approved &&
                     po.Items.Any(i => !_context.InwardLines.Any(il =>
                         il.SourceType == InwardSourceType.PO &&
                         il.SourceRefId == po.Id &&
                         i.PurchaseIndentItem != null && il.ItemId == i.PurchaseIndentItem.ItemId &&
                         il.Inward != null && il.Inward.IsActive)))
                );
            }

    if (locationId.HasValue && locationId.Value > 0)
        query = query.Where(po => po.LocationId == locationId.Value);

    query = query.OrderByDescending(po => po.CreatedAt)
        .Include(po => po.Vendor)
        .Include(po => po.Creator)
        .Include(po => po.Items)
            .ThenInclude(i => i.PurchaseIndentItem)
                .ThenInclude(pii => pii!.Item)
                    .ThenInclude(it => it!.ItemType)
        .Include(po => po.Items)
            .ThenInclude(i => i.PurchaseIndentItem)
                .ThenInclude(pii => pii!.Item)
                    .ThenInclude(it => it!.Material)
        .Include(po => po.Items)
            .ThenInclude(i => i.PurchaseIndentItem)
                .ThenInclude(pii => pii!.PurchaseIndent)
        .AsQueryable();

    var searchTrim = (search ?? "").Trim();
    if (!string.IsNullOrEmpty(searchTrim))
    {
        searchTrim = searchTrim.ToLowerInvariant();
        query = query.Where(p =>
            p.PoNo.ToLower().Contains(searchTrim) ||
            (p.Vendor != null && p.Vendor.Name.ToLower().Contains(searchTrim)) ||
            (p.Remarks != null && p.Remarks.ToLower().Contains(searchTrim)) ||
            (p.Creator != null && (p.Creator.FirstName + " " + p.Creator.LastName).ToLower().Contains(searchTrim)));
    }
    if (!string.IsNullOrWhiteSpace(poDateFrom) && DateTime.TryParse(poDateFrom, out var dateFrom))
        query = query.Where(p => p.CreatedAt.Date >= dateFrom.Date);
    if (!string.IsNullOrWhiteSpace(poDateTo) && DateTime.TryParse(poDateTo, out var dateTo))
        query = query.Where(p => p.CreatedAt.Date <= dateTo.Date);
    var vendorIdList = (vendorIds ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(s => int.TryParse(s, out var id) ? id : 0).Where(id => id > 0).ToList();
    if (vendorIdList.Count > 0) query = query.Where(p => vendorIdList.Contains(p.VendorId));
    var poList = await query.ToListAsync();
    var allPoIds = poList.Select(p => p.Id).ToList();
    var allInwardLines = await _context.InwardLines
        .Include(l => l.Inward)
        .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId.HasValue && allPoIds.Contains(l.SourceRefId.Value) && l.Inward != null && l.Inward.IsActive)
        .ToListAsync();

    var list = new List<PendingPORowDto>();
    foreach (var po in poList)
    {
        var poStatus = po.Status switch {
            PoStatus.Approved => "PO Approved",
            PoStatus.Rejected => "PO Rejected",
            _ => "Approval Pending"
        };
        foreach (var item in po.Items)
        {
            if (item.PurchaseIndentItem == null) continue;

            bool isInwarded = allInwardLines.Any(il =>
                il.SourceRefId == po.Id &&
                il.ItemId == item.PurchaseIndentItem.ItemId);
            
            if (isInwarded) continue;

            var gstPercent = po.GstPercent ?? 18;
            var taxAmount = (item.Rate * gstPercent) / 100;

            list.Add(new PendingPORowDto
            {
                Id = po.Id,
                PoNo = po.PoNo,
                PoDate = po.CreatedAt,
                PoStatus = poStatus,
                VendorName = po.Vendor?.Name ?? "",
                DeliveryDate = po.DeliveryDate,
                Remarks = po.Remarks,
                PiNo = item.PurchaseIndentItem.PurchaseIndent?.PiNo,
                PiDate = item.PurchaseIndentItem.PurchaseIndent?.CreatedAt,
                MainPartName = item.PurchaseIndentItem.Item?.MainPartName ?? "",
                CurrentName = item.PurchaseIndentItem.Item?.CurrentName,
                DrawingNo = item.PurchaseIndentItem.Item?.DrawingNo,
                RevisionNo = item.PurchaseIndentItem.Item?.RevisionNo,
                ItemTypeName = item.PurchaseIndentItem.Item?.ItemType?.Name,
                MaterialName = item.PurchaseIndentItem.Item?.Material?.Name,
                CreatorName = po.Creator != null ? po.Creator.FirstName + " " + po.Creator.LastName : "Unknown",
                Rate = item.Rate,
                GstPercent = gstPercent,
                TaxAmount = taxAmount,
                TotalAmount = item.Rate + taxAmount
            });
        }
    }

            string locName = "All Locations";
            if (locationId.HasValue && locationId.Value > 0)
            {
                var loc = await _context.Locations.FirstOrDefaultAsync(l => l.Id == locationId.Value);
                if (loc != null) locName = loc.Name;
            }

            var bytes = _excelService.GeneratePendingPOExcel(list, locName);
            var fileName = $"Pending_PO_{locName.Replace(" ", "_")}_{DateTime.Now:ddMMyy_HHmm}.xlsx";
            
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
    }
}
