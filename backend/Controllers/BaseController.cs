using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Security.Claims;

namespace net_backend.Controllers
{
    public abstract class BaseController : ControllerBase
    {
        protected readonly ApplicationDbContext _context;

        protected BaseController(ApplicationDbContext context)
        {
            _context = context;
        }

        protected int CurrentUserId
        {
            get
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                {
                    throw new UnauthorizedAccessException("User not authenticated");
                }
                return userId;
            }
        }

        protected async Task<bool> IsAdmin()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            return user?.Role == Role.ADMIN;
        }

        protected async Task<bool> HasPermission(string permission)
        {
            var user = await _context.Users
                .Include(u => u.Permission)
                .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

            if (user == null) return false;
            
            if (user.Role == Role.ADMIN) return true;

            var p = user.Permission;
            if (p == null) return false;

            return permission switch
            {
                "ViewDashboard" => p.ViewDashboard,
                "ViewMaster" => p.ViewMaster,
                "ManageItem" => p.ManageItem,
                "ManageItemType" => p.ManageItemType,
                "ManageMaterial" => p.ManageMaterial,
                "ManageItemStatus" => p.ManageItemStatus,
                "ManageOwnerType" => p.ManageOwnerType,
                "ManageParty" => p.ManageParty,
                "ManageLocation" => p.ManageLocation,
                "ManageCompany" => p.ManageCompany,
                "ViewPI" => p.ViewPI,
                "CreatePI" => p.CreatePI,
                "EditPI" => p.EditPI,
                "ApprovePI" => p.ApprovePI,
                "ViewPO" => p.ViewPO,
                "CreatePO" => p.CreatePO,
                "EditPO" => p.EditPO,
                "ApprovePO" => p.ApprovePO,
                "ViewInward" => p.ViewInward,
                "CreateInward" => p.CreateInward,
                "EditInward" => p.EditInward,
                "ViewQC" => p.ViewQC,
                "CreateQC" => p.CreateQC,
                "EditQC" => p.EditQC,
                "ApproveQC" => p.ApproveQC,
                "ViewMovement" => p.ViewMovement,
                "CreateMovement" => p.CreateMovement,
                "ManageChanges" => p.ManageChanges,
                "RevertChanges" => p.RevertChanges,
                "ViewReports" => p.ViewReports,
                "ManageUsers" => p.ManageUsers,
                "AccessSettings" => p.AccessSettings,
                _ => false
            };
        }

        protected ActionResult Forbidden()
        {
            return StatusCode(403, new { success = false, message = "Access denied: Missing required permission." });
        }
    }
}
