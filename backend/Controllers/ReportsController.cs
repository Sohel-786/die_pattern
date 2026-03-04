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

        public ReportsController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
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

        /// <summary>Item Ledger: full history for one item (active entries only), ordered by date. Requires ViewReports.</summary>
        [HttpGet("item-ledger")]
        public async Task<ActionResult<ApiResponse<object>>> GetItemLedger(
            [FromQuery] int itemId,
            [FromQuery] string? dateFrom = null,
            [FromQuery] string? dateTo = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 50)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var item = await _context.Items
                .Include(i => i.ItemType)
                .FirstOrDefaultAsync(i => i.Id == itemId && i.LocationId == locationId);
            if (item == null) return NotFound();

            var fromDate = !string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fd) ? fd : (DateTime?)null;
            var toDate = !string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var td) ? td : (DateTime?)null;

            var rows = new List<ItemLedgerRowDto>();

            // PI: PurchaseIndentItem where ItemId = itemId, PI IsActive
            var piEvents = await _context.PurchaseIndentItems
                .Where(pii => pii.ItemId == itemId && pii.PurchaseIndent != null && pii.PurchaseIndent.IsActive)
                .Include(pii => pii.PurchaseIndent).ThenInclude(pi => pi!.Creator)
                .Select(pii => new ItemLedgerRowDto
                {
                    EventDate = pii.PurchaseIndent!.CreatedAt,
                    EventType = "PI Indented",
                    ReferenceNo = pii.PurchaseIndent.PiNo,
                    LocationName = null,
                    PartyName = null,
                    Description = pii.PurchaseIndent.Status.ToString(),
                    ByUser = pii.PurchaseIndent.Creator != null ? pii.PurchaseIndent.Creator.FirstName + " " + pii.PurchaseIndent.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(piEvents);

            // PO: PurchaseOrderItem -> PurchaseIndentItem.ItemId = itemId, PO IsActive
            var poEvents = await _context.PurchaseOrderItems
                .Where(poi => poi.PurchaseIndentItem != null && poi.PurchaseIndentItem.ItemId == itemId
                    && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                .Select(poi => new ItemLedgerRowDto
                {
                    EventDate = poi.PurchaseOrder!.CreatedAt,
                    EventType = "PO Created",
                    ReferenceNo = poi.PurchaseOrder.PoNo,
                    LocationName = null,
                    PartyName = null,
                    Description = poi.PurchaseOrder.Status.ToString(),
                    ByUser = null
                })
                .ToListAsync();
            rows.AddRange(poEvents);

            // Inward: InwardLine where ItemId = itemId, Inward IsActive
            var invEvents = await _context.InwardLines
                .Where(il => il.ItemId == itemId && il.Inward != null && il.Inward.IsActive)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Creator)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Location)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Vendor)
                .Select(il => new ItemLedgerRowDto
                {
                    EventDate = il.Inward!.InwardDate,
                    EventType = "Inward",
                    ReferenceNo = il.Inward.InwardNo,
                    LocationName = il.Inward.Location != null ? il.Inward.Location.Name : null,
                    PartyName = il.Inward.Vendor != null ? il.Inward.Vendor.Name : null,
                    Description = null,
                    ByUser = il.Inward.Creator != null ? il.Inward.Creator.FirstName + " " + il.Inward.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(invEvents);

            // QC: QcItem -> InwardLine.ItemId = itemId, QcEntry IsActive
            var qcEvents = await _context.QcItems
                .Where(qi => qi.InwardLine != null && qi.InwardLine.ItemId == itemId && qi.QcEntry != null && qi.QcEntry.IsActive)
                .Select(qi => new ItemLedgerRowDto
                {
                    EventDate = qi.QcEntry!.ApprovedAt ?? qi.QcEntry.CreatedAt,
                    EventType = "QC",
                    ReferenceNo = qi.QcEntry.QcNo,
                    LocationName = null,
                    PartyName = null,
                    Description = qi.IsApproved == true ? "Approved" : qi.IsApproved == false ? "Rejected" : "Pending",
                    ByUser = null
                })
                .ToListAsync();
            rows.AddRange(qcEvents);

            // JobWork: JobWorkItem where ItemId = itemId, JobWork IsActive
            var jwEvents = await _context.JobWorkItems
                .Where(jwi => jwi.ItemId == itemId && jwi.JobWork != null && jwi.JobWork.IsActive)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Creator)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.ToParty)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Location)
                .Select(jwi => new ItemLedgerRowDto
                {
                    EventDate = jwi.JobWork!.CreatedAt,
                    EventType = "Job Work",
                    ReferenceNo = jwi.JobWork.JobWorkNo,
                    LocationName = jwi.JobWork.Location != null ? jwi.JobWork.Location.Name : null,
                    PartyName = jwi.JobWork.ToParty != null ? jwi.JobWork.ToParty.Name : null,
                    Description = jwi.JobWork.Status.ToString(),
                    ByUser = jwi.JobWork.Creator != null ? jwi.JobWork.Creator.FirstName + " " + jwi.JobWork.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(jwEvents);

            // Transfer: TransferItem where ItemId = itemId, Transfer IsActive
            var trEvents = await _context.TransferItems
                .Where(ti => ti.ItemId == itemId && ti.Transfer != null && ti.Transfer.IsActive)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Location)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.FromParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.ToParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Creator)
                .Select(ti => new ItemLedgerRowDto
                {
                    EventDate = ti.Transfer!.TransferDate,
                    EventType = "Transfer",
                    ReferenceNo = ti.Transfer.TransferNo,
                    LocationName = ti.Transfer.Location != null ? ti.Transfer.Location.Name : null,
                    PartyName = ti.Transfer.ToParty != null ? ti.Transfer.ToParty.Name : (ti.Transfer.FromParty != null ? ti.Transfer.FromParty.Name : null),
                    Description = ti.Transfer.Remarks,
                    ByUser = ti.Transfer.Creator != null ? ti.Transfer.Creator.FirstName + " " + ti.Transfer.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(trEvents);

            if (fromDate.HasValue) rows = rows.Where(r => r.EventDate >= fromDate.Value).ToList();
            if (toDate.HasValue) rows = rows.Where(r => r.EventDate <= toDate.Value.AddDays(1)).ToList();
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
            [FromQuery] string? dateTo = null)
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var item = await _context.Items
                .Include(i => i.ItemType)
                .FirstOrDefaultAsync(i => i.Id == itemId && i.LocationId == locationId);
            if (item == null) return NotFound();

            // Reuse same ledger building logic (simplified: get all rows without paging)
            var rows = await BuildItemLedgerRows(itemId, dateFrom, dateTo);
            var bytes = _excelService.GenerateExcel(rows, "Item Ledger", "Item Ledger - " + item.CurrentName);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Item_Ledger_" + item.Id + "_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".xlsx");
        }

        private async Task<List<ItemLedgerRowDto>> BuildItemLedgerRows(int itemId, string? dateFrom, string? dateTo)
        {
            var fromDate = !string.IsNullOrWhiteSpace(dateFrom) && DateTime.TryParse(dateFrom, out var fd) ? fd : (DateTime?)null;
            var toDate = !string.IsNullOrWhiteSpace(dateTo) && DateTime.TryParse(dateTo, out var td) ? td : (DateTime?)null;

            var rows = new List<ItemLedgerRowDto>();

            var piEvents = await _context.PurchaseIndentItems
                .Where(pii => pii.ItemId == itemId && pii.PurchaseIndent != null && pii.PurchaseIndent.IsActive)
                .Include(pii => pii.PurchaseIndent).ThenInclude(pi => pi!.Creator)
                .Select(pii => new ItemLedgerRowDto
                {
                    EventDate = pii.PurchaseIndent!.CreatedAt,
                    EventType = "PI Indented",
                    ReferenceNo = pii.PurchaseIndent.PiNo,
                    LocationName = null,
                    PartyName = null,
                    Description = pii.PurchaseIndent.Status.ToString(),
                    ByUser = pii.PurchaseIndent.Creator != null ? pii.PurchaseIndent.Creator.FirstName + " " + pii.PurchaseIndent.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(piEvents);

            var poEvents = await _context.PurchaseOrderItems
                .Where(poi => poi.PurchaseIndentItem != null && poi.PurchaseIndentItem.ItemId == itemId
                    && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                .Select(poi => new ItemLedgerRowDto
                {
                    EventDate = poi.PurchaseOrder!.CreatedAt,
                    EventType = "PO Created",
                    ReferenceNo = poi.PurchaseOrder.PoNo,
                    LocationName = null,
                    PartyName = null,
                    Description = poi.PurchaseOrder.Status.ToString(),
                    ByUser = null
                })
                .ToListAsync();
            rows.AddRange(poEvents);

            var invEvents = await _context.InwardLines
                .Where(il => il.ItemId == itemId && il.Inward != null && il.Inward.IsActive)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Creator)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Location)
                .Include(il => il.Inward).ThenInclude(inv => inv!.Vendor)
                .Select(il => new ItemLedgerRowDto
                {
                    EventDate = il.Inward!.InwardDate,
                    EventType = "Inward",
                    ReferenceNo = il.Inward.InwardNo,
                    LocationName = il.Inward.Location != null ? il.Inward.Location.Name : null,
                    PartyName = il.Inward.Vendor != null ? il.Inward.Vendor.Name : null,
                    Description = null,
                    ByUser = il.Inward.Creator != null ? il.Inward.Creator.FirstName + " " + il.Inward.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(invEvents);

            var qcEvents = await _context.QcItems
                .Where(qi => qi.InwardLine != null && qi.InwardLine.ItemId == itemId && qi.QcEntry != null && qi.QcEntry.IsActive)
                .Select(qi => new ItemLedgerRowDto
                {
                    EventDate = qi.QcEntry!.ApprovedAt ?? qi.QcEntry.CreatedAt,
                    EventType = "QC",
                    ReferenceNo = qi.QcEntry.QcNo,
                    LocationName = null,
                    PartyName = null,
                    Description = qi.IsApproved == true ? "Approved" : qi.IsApproved == false ? "Rejected" : "Pending",
                    ByUser = null
                })
                .ToListAsync();
            rows.AddRange(qcEvents);

            var jwEvents = await _context.JobWorkItems
                .Where(jwi => jwi.ItemId == itemId && jwi.JobWork != null && jwi.JobWork.IsActive)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Creator)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.ToParty)
                .Include(jwi => jwi.JobWork).ThenInclude(jw => jw!.Location)
                .Select(jwi => new ItemLedgerRowDto
                {
                    EventDate = jwi.JobWork!.CreatedAt,
                    EventType = "Job Work",
                    ReferenceNo = jwi.JobWork.JobWorkNo,
                    LocationName = jwi.JobWork.Location != null ? jwi.JobWork.Location.Name : null,
                    PartyName = jwi.JobWork.ToParty != null ? jwi.JobWork.ToParty.Name : null,
                    Description = jwi.JobWork.Status.ToString(),
                    ByUser = jwi.JobWork.Creator != null ? jwi.JobWork.Creator.FirstName + " " + jwi.JobWork.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(jwEvents);

            var trEvents = await _context.TransferItems
                .Where(ti => ti.ItemId == itemId && ti.Transfer != null && ti.Transfer.IsActive)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Location)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.FromParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.ToParty)
                .Include(ti => ti.Transfer).ThenInclude(t => t!.Creator)
                .Select(ti => new ItemLedgerRowDto
                {
                    EventDate = ti.Transfer!.TransferDate,
                    EventType = "Transfer",
                    ReferenceNo = ti.Transfer.TransferNo,
                    LocationName = ti.Transfer.Location != null ? ti.Transfer.Location.Name : null,
                    PartyName = ti.Transfer.ToParty != null ? ti.Transfer.ToParty.Name : (ti.Transfer.FromParty != null ? ti.Transfer.FromParty.Name : null),
                    Description = ti.Transfer.Remarks,
                    ByUser = ti.Transfer.Creator != null ? ti.Transfer.Creator.FirstName + " " + ti.Transfer.Creator.LastName : null
                })
                .ToListAsync();
            rows.AddRange(trEvents);

            if (fromDate.HasValue) rows = rows.Where(r => r.EventDate >= fromDate.Value).ToList();
            if (toDate.HasValue) rows = rows.Where(r => r.EventDate <= toDate.Value.AddDays(1)).ToList();
            return rows.OrderByDescending(r => r.EventDate).ToList();
        }
    }
}
