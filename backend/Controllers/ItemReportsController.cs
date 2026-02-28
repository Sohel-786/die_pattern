using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("item-reports")]
    [ApiController]
    public class ItemReportsController : BaseController
    {
        private readonly IExcelService _excelService;
        private readonly IItemStateService _itemState;

        public ItemReportsController(ApplicationDbContext context, IExcelService excelService, IItemStateService itemState) : base(context)
        {
            _excelService = excelService;
            _itemState = itemState;
        }

        [HttpGet("inventory-status")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetInventoryStatus()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var items = await _context.Items
                .Where(p => p.LocationId == locationId)
                .Include(p => p.ItemType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .ToListAsync();

            var data = items.Select(p => new
            {
                p.Id,
                p.MainPartName,
                p.CurrentName,
                ItemType = p.ItemType!.Name,
                p.RevisionNo,
                Status = p.Status!.Name,
                Holder = p.CurrentProcess switch {
                    ItemProcessState.NotInStock => "Not in stock",
                    ItemProcessState.Outward => p.CurrentParty?.Name ?? "Vendor",
                    ItemProcessState.InJobwork => p.CurrentParty?.Name ?? "Jobworker",
                    ItemProcessState.InPI => p.CurrentParty?.Name ?? "Under PI",
                    ItemProcessState.InPO => p.CurrentParty?.Name ?? "Under PO/Vendor",
                    _ => p.CurrentLocation?.Name ?? "Location"
                },
                CurrentProcess = _itemState.GetStateDisplay(p.CurrentProcess),
                p.IsActive
            });

            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("movement-ledger")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetMovementLedger()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var data = new List<object>(); // Movements are now handled via separate flow ledgers
            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("qc-summary")]
        public async Task<ActionResult<ApiResponse<object>>> GetQCSummary()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var qcQuery = _context.QcItems.Where(q => q.QcEntry!.LocationId == locationId);
            var total = await qcQuery.CountAsync();
            var approved = await qcQuery.CountAsync(q => q.IsApproved == true);
            var rejected = await qcQuery.CountAsync(q => q.IsApproved == false);

            var recent = await _context.QcItems
                .Where(q => q.QcEntry!.LocationId == locationId)
                .Include(q => q.QcEntry)
                    .ThenInclude(e => e!.Creator)
                .Include(q => q.InwardLine)
                    .ThenInclude(m => m!.Item)
                .OrderByDescending(q => q.QcEntry!.CreatedAt)
                .Take(10)
                .Select(q => new
                {
                    q.Id,
                    ItemName = q.InwardLine!.Item!.CurrentName,
                    IsApproved = q.IsApproved == true,
                    q.Remarks,
                    CheckedBy = q.QcEntry!.Creator!.FirstName + " " + q.QcEntry.Creator.LastName,
                    Date = q.QcEntry.CreatedAt
                })
                .ToListAsync();

            return Ok(new ApiResponse<object>
            {
                Data = new
                {
                    Total = total,
                    Approved = approved,
                    Rejected = rejected,
                    Recent = recent
                }
            });
        }
    }
}
