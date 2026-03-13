using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("reports")]
    [ApiController]
    public class ReportsController : BaseController
    {
        private readonly IExcelService _excelService;
        private readonly IItemSnapshotBackfillService _snapshotService;

        public ReportsController(ApplicationDbContext context, IExcelService excelService, IItemSnapshotBackfillService snapshotService) : base(context)
        {
            _excelService = excelService;
            _snapshotService = snapshotService;
        }

        /// <summary>Paginated Purchase Indent report. Requires ViewReports.</summary>
        [HttpGet("purchase-indents")]
        public async Task<ActionResult<ApiResponse<object>>> GetPurchaseIndentsReport(
            [FromQuery] string? search = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var query = _context.PurchaseIndents
                .Where(pi => pi.Items.Any(i => i.Item != null && i.Item.LocationId == locationId))
                .Include(pi => pi.Creator)
                .Include(pi => pi.Approver)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(pi =>
                    pi.PiNo.Contains(term) ||
                    (pi.Creator != null && (pi.Creator.FirstName + " " + pi.Creator.LastName).Contains(term)) ||
                    (pi.Approver != null && (pi.Approver.FirstName + " " + pi.Approver.LastName).Contains(term)));
            }
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseIndentStatus>(status, true, out var st))
                query = query.Where(pi => pi.Status == st);
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fromDate))
                query = query.Where(pi => pi.CreatedAt >= fromDate);
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var toDate))
                query = query.Where(pi => pi.CreatedAt <= toDate.AddDays(1));

            var total = await query.CountAsync();
            var list = await query
                .OrderByDescending(pi => pi.CreatedAt)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(pi => new PIReportRowDto
                {
                    Id = pi.Id,
                    PiNo = pi.PiNo,
                    Type = pi.Type.ToString(),
                    Status = pi.Status.ToString(),
                    CreatedAt = pi.CreatedAt,
                    ApprovedAt = pi.ApprovedAt,
                    CreatorName = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : null,
                    ApproverName = pi.Approver != null ? pi.Approver.FirstName + " " + pi.Approver.LastName : null,
                    ItemCount = pi.Items.Count,
                    ReqDateOfDelivery = pi.ReqDateOfDelivery.HasValue ? pi.ReqDateOfDelivery.Value.ToString("yyyy-MM-dd") : null,
                    MtcReq = pi.MtcReq
                })
                .ToListAsync();

            return Ok(new ApiResponse<object>
            {
                Data = new { data = list, total, page, limit }
            });
        }

        /// <summary>Paginated Inward report. Requires ViewReports.</summary>
        [HttpGet("inwards")]
        public async Task<ActionResult<ApiResponse<object>>> GetInwardsReport(
            [FromQuery] string? search = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] int? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 25)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var query = _context.Inwards
                .Where(inv => inv.LocationId == locationId)
                .Include(inv => inv.Creator)
                .Include(inv => inv.Location)
                .Include(inv => inv.Vendor)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(inv =>
                    inv.InwardNo.Contains(term) ||
                    (inv.Vendor != null && inv.Vendor.Name.Contains(term)) ||
                    (inv.Creator != null && (inv.Creator.FirstName + " " + inv.Creator.LastName).Contains(term)));
            }
            if (status.HasValue)
                query = query.Where(inv => (int)inv.Status == status.Value);
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fromDate))
                query = query.Where(inv => inv.InwardDate >= fromDate);
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var toDate))
                query = query.Where(inv => inv.InwardDate <= toDate.AddDays(1));

            var total = await query.CountAsync();
            var list = await query
                .OrderByDescending(inv => inv.InwardDate)
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(inv => new InwardReportRowDto
                {
                    Id = inv.Id,
                    InwardNo = inv.InwardNo,
                    InwardDate = inv.InwardDate,
                    Status = inv.Status.ToString(),
                    LocationName = inv.Location != null ? inv.Location.Name : null,
                    VendorName = inv.Vendor != null ? inv.Vendor.Name : null,
                    LineCount = inv.Lines.Count,
                    CreatorName = inv.Creator != null ? inv.Creator.FirstName + " " + inv.Creator.LastName : null,
                    CreatedAt = inv.CreatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponse<object>
            {
                Data = new { data = list, total, page, limit }
            });
        }

        /// <summary>Item Ledger: full history for one item (location-scoped, no company/location/party filters). Requires ViewReports.</summary>
        [HttpGet("item-ledger")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemLedger(
            [FromQuery] int itemId,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var item = await _context.Items
                .Include(i => i.ItemType)
                .FirstOrDefaultAsync(i => i.Id == itemId && i.LocationId == locationId);
            if (item == null) return NotFound();

            var rows = await BuildItemLedgerRowsAsync(itemId);

            var fromDate = !string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fd) ? fd : (DateTime?)null;
            var toDate = !string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var td) ? td : (DateTime?)null;

            if (fromDate.HasValue) rows = rows.Where(r => r.EventDate >= fromDate.Value).ToList();
            if (toDate.HasValue) rows = rows.Where(r => r.EventDate <= toDate.Value.AddDays(1)).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                rows = rows.Where(r =>
                    (r.ReferenceNo != null && r.ReferenceNo.ToLowerInvariant().Contains(term)) ||
                    (r.ItemNameAtEvent != null && r.ItemNameAtEvent.ToLowerInvariant().Contains(term)) ||
                    (r.LocationName != null && r.LocationName.ToLowerInvariant().Contains(term)) ||
                    (r.PartyName != null && r.PartyName.ToLowerInvariant().Contains(term)) ||
                    (r.FromToDisplay != null && r.FromToDisplay.ToLowerInvariant().Contains(term)) ||
                    (r.Description != null && r.Description.ToLowerInvariant().Contains(term)) ||
                    (r.PreparedBy != null && r.PreparedBy.ToLowerInvariant().Contains(term)) ||
                    (r.AuthorizedBy != null && r.AuthorizedBy.ToLowerInvariant().Contains(term))).ToList();
            }

            rows = rows.OrderByDescending(r => r.EventDate).ToList();
            var total = rows.Count;
            var paged = rows.Skip((page - 1) * limit).Take(limit).ToList();

            return Ok(new ApiResponse<object>
            {
                Data = new
                {
                    item = new { id = item.Id, currentName = item.CurrentName, mainPartName = item.MainPartName, itemTypeName = item.ItemType != null ? item.ItemType.Name : null },
                    data = paged,
                    total,
                    page,
                    limit
                }
            });
        }

        [HttpGet("export/purchase-indents")]
        public async Task<IActionResult> ExportPurchaseIndents(
            [FromQuery] string? search = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? status = null)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var query = _context.PurchaseIndents
                .Where(pi => pi.Items.Any(i => i.Item != null && i.Item.LocationId == locationId))
                .Include(pi => pi.Creator)
                .Include(pi => pi.Approver)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(pi =>
                    pi.PiNo.Contains(term) ||
                    (pi.Creator != null && (pi.Creator.FirstName + " " + pi.Creator.LastName).Contains(term)) ||
                    (pi.Approver != null && (pi.Approver.FirstName + " " + pi.Approver.LastName).Contains(term)));
            }
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PurchaseIndentStatus>(status, true, out var st))
                query = query.Where(pi => pi.Status == st);
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fromDate))
                query = query.Where(pi => pi.CreatedAt >= fromDate);
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var toDate))
                query = query.Where(pi => pi.CreatedAt <= toDate.AddDays(1));

            var list = await query
                .OrderByDescending(pi => pi.CreatedAt)
                .Select(pi => new PIReportRowDto
                {
                    Id = pi.Id,
                    PiNo = pi.PiNo,
                    Type = pi.Type.ToString(),
                    Status = pi.Status.ToString(),
                    CreatedAt = pi.CreatedAt,
                    ApprovedAt = pi.ApprovedAt,
                    CreatorName = pi.Creator != null ? pi.Creator.FirstName + " " + pi.Creator.LastName : null,
                    ApproverName = pi.Approver != null ? pi.Approver.FirstName + " " + pi.Approver.LastName : null,
                    ItemCount = pi.Items.Count,
                    ReqDateOfDelivery = pi.ReqDateOfDelivery.HasValue ? pi.ReqDateOfDelivery.Value.ToString("yyyy-MM-dd") : null,
                    MtcReq = pi.MtcReq
                })
                .ToListAsync();

            var bytes = _excelService.GenerateExcel(list, "Purchase Indents", "Purchase Indent Report");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "PI_Report_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".xlsx");
        }

        [HttpGet("export/inwards")]
        public async Task<IActionResult> ExportInwards(
            [FromQuery] string? search = null,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] int? status = null)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var query = _context.Inwards
                .Where(inv => inv.LocationId == locationId)
                .Include(inv => inv.Creator)
                .Include(inv => inv.Location)
                .Include(inv => inv.Vendor)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(inv =>
                    inv.InwardNo.Contains(term) ||
                    (inv.Vendor != null && inv.Vendor.Name.Contains(term)) ||
                    (inv.Creator != null && (inv.Creator.FirstName + " " + inv.Creator.LastName).Contains(term)));
            }
            if (status.HasValue) query = query.Where(inv => (int)inv.Status == status.Value);
            if (!string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fromDate))
                query = query.Where(inv => inv.InwardDate >= fromDate);
            if (!string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var toDate))
                query = query.Where(inv => inv.InwardDate <= toDate.AddDays(1));

            var list = await query
                .OrderByDescending(inv => inv.InwardDate)
                .Select(inv => new InwardReportRowDto
                {
                    Id = inv.Id,
                    InwardNo = inv.InwardNo,
                    InwardDate = inv.InwardDate,
                    Status = inv.Status.ToString(),
                    LocationName = inv.Location != null ? inv.Location.Name : null,
                    VendorName = inv.Vendor != null ? inv.Vendor.Name : null,
                    LineCount = inv.Lines.Count,
                    CreatorName = inv.Creator != null ? inv.Creator.FirstName + " " + inv.Creator.LastName : null,
                    CreatedAt = inv.CreatedAt
                })
                .ToListAsync();

            var bytes = _excelService.GenerateExcel(list, "Inwards", "Inward Report");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Inward_Report_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".xlsx");
        }

        [HttpGet("export/item-ledger")]
        public async Task<IActionResult> ExportItemLedger(
            [FromQuery] int itemId,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] string? search = null)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var item = await _context.Items
                .Include(i => i.ItemType)
                .FirstOrDefaultAsync(i => i.Id == itemId && i.LocationId == locationId);
            if (item == null) return NotFound();

            var rows = await BuildItemLedgerRowsAsync(itemId);

            var fromDate = !string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fd) ? fd : (DateTime?)null;
            var toDate = !string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var td) ? td : (DateTime?)null;
            if (fromDate.HasValue) rows = rows.Where(r => r.EventDate >= fromDate.Value).ToList();
            if (toDate.HasValue) rows = rows.Where(r => r.EventDate <= toDate.Value.AddDays(1)).ToList();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                rows = rows.Where(r =>
                    (r.ReferenceNo != null && r.ReferenceNo.ToLowerInvariant().Contains(term)) ||
                    (r.ItemNameAtEvent != null && r.ItemNameAtEvent.ToLowerInvariant().Contains(term)) ||
                    (r.LocationName != null && r.LocationName.ToLowerInvariant().Contains(term)) ||
                    (r.PartyName != null && r.PartyName.ToLowerInvariant().Contains(term)) ||
                    (r.FromToDisplay != null && r.FromToDisplay.ToLowerInvariant().Contains(term)) ||
                    (r.Description != null && r.Description.ToLowerInvariant().Contains(term)) ||
                    (r.PreparedBy != null && r.PreparedBy.ToLowerInvariant().Contains(term)) ||
                    (r.AuthorizedBy != null && r.AuthorizedBy.ToLowerInvariant().Contains(term))).ToList();
            }
            rows = rows.OrderByDescending(r => r.EventDate).ToList();

            var bytes = _excelService.GenerateItemLedgerExcel(rows, "Item Ledger - " + item.CurrentName + " (" + item.MainPartName + ")");
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Item_Ledger_" + item.Id + "_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".xlsx");
        }

        /// <summary>Builds ledger rows for one item (location-scoped via item). No date or search applied.</summary>
        private async Task<List<ItemLedgerRowDto>> BuildItemLedgerRowsAsync(int itemId)
        {
            var rows = new List<ItemLedgerRowDto>();

            // PI: Prepared By (Creator), Authorized By (Approver)
            var piEvents = await _context.PurchaseIndentItems
                .Where(pii => pii.ItemId == itemId && pii.PurchaseIndent != null && pii.PurchaseIndent.IsActive)
                .Include(pii => pii.PurchaseIndent).ThenInclude(pi => pi!.Creator)
                .Include(pii => pii.PurchaseIndent).ThenInclude(pi => pi!.Approver)
                .Select(pii => new ItemLedgerRowDto
                {
                    EventDate = pii.PurchaseIndent!.CreatedAt,
                    EventType = "PI Indented",
                    ItemNameAtEvent = pii.ItemNameSnapshot,
                    ReferenceNo = pii.PurchaseIndent.PiNo,
                    LocationName = null,
                    PartyName = null,
                    FromToDisplay = null,
                    Description = pii.PurchaseIndent.Status.ToString(),
                    PreparedBy = pii.PurchaseIndent.Creator != null ? pii.PurchaseIndent.Creator.FirstName + " " + pii.PurchaseIndent.Creator.LastName : null,
                    AuthorizedBy = pii.PurchaseIndent.Approver != null ? pii.PurchaseIndent.Approver.FirstName + " " + pii.PurchaseIndent.Approver.LastName : null
                })
                .ToListAsync();
            rows.AddRange(piEvents);

            // PO: Prepared By, Authorized By
            var poEvents = await _context.PurchaseOrderItems
                .Where(poi => poi.PurchaseIndentItem != null && poi.PurchaseIndentItem.ItemId == itemId
                    && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                .Include(poi => poi.PurchaseOrder).ThenInclude(po => po!.Creator)
                .Include(poi => poi.PurchaseOrder).ThenInclude(po => po!.Approver)
                .Select(poi => new ItemLedgerRowDto
                {
                    EventDate = poi.PurchaseOrder!.CreatedAt,
                    EventType = "PO Created",
                    ItemNameAtEvent = poi.PurchaseIndentItem!.ItemNameSnapshot,
                    ReferenceNo = poi.PurchaseOrder.PoNo,
                    LocationName = null,
                    PartyName = null,
                    FromToDisplay = null,
                    Description = poi.PurchaseOrder.Status.ToString(),
                    PreparedBy = poi.PurchaseOrder.Creator != null ? poi.PurchaseOrder.Creator.FirstName + " " + poi.PurchaseOrder.Creator.LastName : null,
                    AuthorizedBy = poi.PurchaseOrder.Approver != null ? poi.PurchaseOrder.Approver.FirstName + " " + poi.PurchaseOrder.Approver.LastName : null
                })
                .ToListAsync();
            rows.AddRange(poEvents);

            // Inward: Location, Party (Vendor), Prepared By
            var invEvents = await _context.InwardLines
                .Where(il => il.ItemId == itemId && il.Inward != null && il.Inward.IsActive)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Creator)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Location)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Vendor)
                .Select(il => new ItemLedgerRowDto
                {
                    EventDate = il.Inward!.CreatedAt,
                    EventType = "Inward",
                    ItemNameAtEvent = il.ItemNameSnapshot,
                    ReferenceNo = il.Inward.InwardNo,
                    LocationName = il.Inward.Location != null ? il.Inward.Location.Name : null,
                    PartyName = il.Inward.Vendor != null ? il.Inward.Vendor.Name : null,
                    FromToDisplay = null,
                    Description = null,
                    PreparedBy = il.Inward.Creator != null ? il.Inward.Creator.FirstName + " " + il.Inward.Creator.LastName : null,
                    AuthorizedBy = null
                })
                .ToListAsync();
            rows.AddRange(invEvents);

            // QC: Location, Party, Prepared By, Authorized By
            var qcEvents = await _context.QcItems
                .Where(qi => qi.InwardLine != null && qi.InwardLine.ItemId == itemId && qi.QcEntry != null && qi.QcEntry.IsActive)
                .Include(qi => qi.QcEntry).ThenInclude(qe => qe!.Location)
                .Include(qi => qi.QcEntry).ThenInclude(qe => qe!.Party)
                .Include(qi => qi.QcEntry).ThenInclude(qe => qe!.Creator)
                .Include(qi => qi.QcEntry).ThenInclude(qe => qe!.Approver)
                .Select(qi => new ItemLedgerRowDto
                {
                    EventDate = qi.QcEntry!.ApprovedAt ?? qi.QcEntry.CreatedAt,
                    EventType = "QC",
                    ItemNameAtEvent = qi.InwardLine!.ItemNameSnapshot,
                    ReferenceNo = qi.QcEntry.QcNo,
                    LocationName = qi.QcEntry.Location != null ? qi.QcEntry.Location.Name : null,
                    PartyName = qi.QcEntry.Party != null ? qi.QcEntry.Party.Name : null,
                    FromToDisplay = null,
                    Description = qi.IsApproved == true ? "Approved" : qi.IsApproved == false ? "Rejected" : "Pending",
                    PreparedBy = qi.QcEntry.Creator != null ? qi.QcEntry.Creator.FirstName + " " + qi.QcEntry.Creator.LastName : null,
                    AuthorizedBy = qi.QcEntry.Approver != null ? qi.QcEntry.Approver.FirstName + " " + qi.QcEntry.Approver.LastName : null
                })
                .ToListAsync();
            rows.AddRange(qcEvents);

            // Job Work: Location, Party (ToParty), Prepared By
            var jwEvents = await _context.JobWorkItems
                .Where(jwi => jwi.ItemId == itemId && jwi.JobWork != null && jwi.JobWork.IsActive)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Creator)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.ToParty)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Location)
                .Select(jwi => new ItemLedgerRowDto
                {
                    EventDate = jwi.JobWork!.CreatedAt,
                    EventType = "Job Work",
                    ItemNameAtEvent = jwi.OriginalNameSnapshot,
                    ReferenceNo = jwi.JobWork.JobWorkNo,
                    LocationName = jwi.JobWork.Location != null ? jwi.JobWork.Location.Name : null,
                    PartyName = jwi.JobWork.ToParty != null ? jwi.JobWork.ToParty.Name : null,
                    FromToDisplay = null,
                    Description = jwi.JobWork.Status.ToString(),
                    PreparedBy = jwi.JobWork.Creator != null ? jwi.JobWork.Creator.FirstName + " " + jwi.JobWork.Creator.LastName : null,
                    AuthorizedBy = null
                })
                .ToListAsync();
            rows.AddRange(jwEvents);

            // Transfer: From–To display, Location, Prepared By (PartyName null, use FromToDisplay)
            var trEvents = await _context.TransferItems
                .Where(ti => ti.ItemId == itemId && ti.Transfer != null && ti.Transfer.IsActive)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Location)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.FromParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.ToParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Creator)
                .ToListAsync();

            foreach (var ti in trEvents)
            {
                var t = ti.Transfer!;
                var fromName = t.FromPartyId.HasValue && t.FromParty != null ? t.FromParty.Name : (t.Location != null ? t.Location.Name : "—");
                var toName = t.ToPartyId.HasValue && t.ToParty != null ? t.ToParty.Name : (t.Location != null ? t.Location.Name : "—");
                rows.Add(new ItemLedgerRowDto
                {
                    EventDate = t.CreatedAt,
                    EventType = "Transfer",
                    ItemNameAtEvent = ti.ItemNameSnapshot,
                    ReferenceNo = t.TransferNo,
                    LocationName = t.Location != null ? t.Location.Name : null,
                    PartyName = null,
                    FromToDisplay = fromName + " → " + toName,
                    Description = t.Remarks,
                    PreparedBy = t.Creator != null ? t.Creator.FirstName + " " + t.Creator.LastName : null,
                    AuthorizedBy = null
                });
            }

            // Production fallback: resolve display name at event time when snapshot is null (e.g. old records before backfill)
            foreach (var row in rows.Where(r => string.IsNullOrEmpty(r.ItemNameAtEvent)))
            {
                row.ItemNameAtEvent = await _snapshotService.GetDisplayNameAtTimeAsync(itemId, row.EventDate);
            }

            return rows;
        }
    }
}
