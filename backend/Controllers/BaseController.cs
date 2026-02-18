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
                "ManageMaster" => p.ManageMaster,
                "ViewPI" => p.ViewPI,
                "CreatePI" => p.CreatePI,
                "ApprovePI" => p.ApprovePI,
                "ViewPO" => p.ViewPO,
                "CreatePO" => p.CreatePO,
                "ApprovePO" => p.ApprovePO,
                "ViewMovement" => p.ViewMovement,
                "CreateMovement" => p.CreateMovement,
                "ViewQC" => p.ViewQC,
                "PerformQC" => p.PerformQC,
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

    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public string? Message { get; set; }
    }
}
