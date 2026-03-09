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
                    p.CurrentLocationId == loc.Id && inHouseStates.Contains(p.CurrentProcess) && p.IsActive);
                
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
                pi.Status == PurchaseIndentStatus.Pending && pi.IsActive);
            
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
                po.Status == PoStatus.Pending && po.IsActive);
            
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
                .Include(p => p.CurrentLocation)
                .Where(p => p.CurrentLocationId == locationId && (p.CurrentProcess == ItemProcessState.InStock || p.CurrentProcess == ItemProcessState.InQC || p.CurrentProcess == ItemProcessState.InwardDone) && p.IsActive);

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
                .OrderBy(p => p.MainPartName)
                .Select(p => new LocationWiseItemRowDto
                {
                    Id = p.Id,
                    LocationName = p.CurrentLocation != null ? p.CurrentLocation.Name : "",
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    StatusName = p.Status != null ? p.Status.Name : null
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
                .OrderBy(p => p.CurrentParty != null ? p.CurrentParty.Name : "")
                .ThenBy(p => p.MainPartName)
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
            [FromQuery] string? itemIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseIndents
                .Where(pi => pi.Status == PurchaseIndentStatus.Pending && pi.IsActive);

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
            [FromQuery] string? vendorIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseOrders
                .Where(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value)
                    && po.Status == PoStatus.Pending && po.IsActive);

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(po => po.LocationId == locationId.Value);

            query = query.OrderByDescending(po => po.CreatedAt)
                .Include(po => po.Vendor)
                .Include(po => po.Creator)
                .Include(po => po.Approver)
                .Include(po => po.Items)
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
            var poIdsWithInward = await _context.InwardLines
                .Where(il => il.SourceType == InwardSourceType.PO && il.SourceRefId.HasValue && poIds.Contains(il.SourceRefId.Value) && il.Inward != null && il.Inward.IsActive)
                .Select(il => il.SourceRefId!.Value)
                .Distinct()
                .ToListAsync();
            var hasInwardSet = poIdsWithInward.ToHashSet();

            var data = pos.Select(po =>
            {
                var dto = new PODto();
                PurchaseOrdersController.MapToDto(po, dto);
                dto.HasInward = hasInwardSet.Contains(po.Id);
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
                .Include(p => p.CurrentLocation)
                .Where(p => p.CurrentLocationId == locationId && p.CurrentProcess == ItemProcessState.InStock && p.IsActive);

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

            var rows = await query.OrderBy(p => p.MainPartName)
                .Select(p => new LocationWiseItemRowDto
                {
                    Id = p.Id,
                    LocationName = p.CurrentLocation != null ? p.CurrentLocation.Name : "",
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    DrawingNo = p.DrawingNo,
                    ItemTypeName = p.ItemType != null ? p.ItemType.Name : null,
                    StatusName = p.Status != null ? p.Status.Name : null
                }).ToListAsync();

            var bytes = _excelService.GenerateLocationWiseItemsExcel(rows);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Dashboard_Location_Wise_Items.xlsx");
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

            var rows = await query.OrderBy(p => p.CurrentParty != null ? p.CurrentParty.Name : "").ThenBy(p => p.MainPartName)
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

            var bytes = _excelService.GenerateItemsAtVendorExcel(rows);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Dashboard_Patterns_At_Vendor.xlsx");
        }

        [HttpGet("export/pending-pi")]
        public async Task<IActionResult> ExportPendingPI(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? createdDateFrom,
            [FromQuery] string? createdDateTo,
            [FromQuery] string? itemIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseIndents
                .Where(pi => pi.Status == PurchaseIndentStatus.Pending && pi.IsActive);

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
                .Include(pi => pi.Items).ThenInclude(i => i.Item).ThenInclude(it => it!.ItemType)
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

            var list = await query.Select(p => new
            {
                p.Id,
                p.PiNo,
                p.Type,
                p.Status,
                p.Remarks,
                p.CreatedAt,
                CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : "Unknown",
                ItemCount = p.Items.Count
            }).ToListAsync();

            var bytes = _excelService.GeneratePendingPIExcel(list.Select(x => new PendingPIRowDto
            {
                Id = x.Id,
                PiNo = x.PiNo,
                Type = x.Type.ToString(),
                Status = x.Status.ToString(),
                Remarks = x.Remarks,
                CreatedAt = x.CreatedAt,
                CreatorName = x.CreatorName,
                ItemCount = x.ItemCount
            }));
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Dashboard_Pending_PI.xlsx");
        }

        [HttpGet("export/pending-po")]
        public async Task<IActionResult> ExportPendingPO(
            [FromQuery] int? locationId,
            [FromQuery] string? search,
            [FromQuery] string? poDateFrom,
            [FromQuery] string? poDateTo,
            [FromQuery] string? vendorIds)
        {
            if (!await HasPermission("ViewDashboard")) return Forbidden();
            var allowed = await GetAllowedLocationIdsAsync();
            var allowedLocationIds = allowed.Select(x => x.locationId).ToHashSet();

            var query = _context.PurchaseOrders
                .Where(po => po.LocationId != null && allowedLocationIds.Contains(po.LocationId.Value)
                    && po.Status == PoStatus.Pending && po.IsActive);

            if (locationId.HasValue && locationId.Value > 0)
                query = query.Where(po => po.LocationId == locationId.Value);

            query = query.OrderByDescending(po => po.CreatedAt)
                .Include(po => po.Vendor)
                .Include(po => po.Creator)
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

            var list = await query.Select(p => new PendingPORowDto
            {
                Id = p.Id,
                PoNo = p.PoNo,
                VendorName = p.Vendor != null ? p.Vendor.Name : null,
                Status = p.Status.ToString(),
                Remarks = p.Remarks,
                CreatedAt = p.CreatedAt,
                CreatorName = p.Creator != null ? p.Creator.FirstName + " " + p.Creator.LastName : null
            }).ToListAsync();

            var bytes = _excelService.GeneratePendingPOExcel(list);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Dashboard_Pending_PO.xlsx");
        }
    }
}
