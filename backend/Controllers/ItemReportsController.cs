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

        public ItemReportsController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("inventory-status")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetInventoryStatus()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var data = await _context.Items
                .Where(p => p.LocationId == locationId)
                .Include(p => p.ItemType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .Select(p => new
                {
                    p.Id,
                    p.MainPartName,
                    p.CurrentName,
                    ItemType = p.ItemType!.Name,
                    p.RevisionNo,
                    Status = p.Status!.Name,
                    Holder = p.CurrentHolderType == HolderType.Location ? p.CurrentLocation!.Name : p.CurrentParty!.Name,
                    p.CurrentHolderType,
                    p.IsActive
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("movement-ledger")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetMovementLedger()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var data = await _context.Movements
                .Where(m => m.FromLocationId == locationId || m.ToLocationId == locationId || (m.Item != null && m.Item.LocationId == locationId))
                .Include(m => m.Item)
                .Include(m => m.FromLocation)
                .Include(m => m.FromParty)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Include(m => m.Creator)
                .OrderByDescending(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    Date = m.CreatedAt,
                    m.Type,
                    ItemName = m.Item!.CurrentName,
                    From = m.FromType == HolderType.Location ? m.FromLocation!.Name : m.FromParty!.Name,
                    To = m.ToType == HolderType.Location ? m.ToLocation!.Name : m.ToParty!.Name,
                    m.Remarks,
                    m.Reason,
                    User = m.Creator!.FirstName + " " + m.Creator.LastName,
                    m.IsQCApproved
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<object>> { Data = data });
        }

        [HttpGet("qc-summary")]
        public async Task<ActionResult<ApiResponse<object>>> GetQCSummary()
        {
            if (!await HasPermission("ViewReports")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var qcQuery = _context.QualityControls.Where(q => q.Movement != null && q.Movement.ToLocationId == locationId);
            var total = await qcQuery.CountAsync();
            var approved = await qcQuery.CountAsync(q => q.IsApproved);
            var rejected = total - approved;

            var recent = await _context.QualityControls
                .Where(q => q.Movement != null && q.Movement.ToLocationId == locationId)
                .Include(q => q.Movement)
                    .ThenInclude(m => m!.Item)
                .Include(q => q.Checker)
                .OrderByDescending(q => q.CheckedAt)
                .Take(10)
                .Select(q => new
                {
                    q.Id,
                    ItemName = q.Movement!.Item!.CurrentName,
                    q.IsApproved,
                    q.Remarks,
                    CheckedBy = q.Checker!.FirstName + " " + q.Checker.LastName,
                    Date = q.CheckedAt
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
