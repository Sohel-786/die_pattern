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
        private const string LocationIdHeader = "X-Location-Id";
        private const string CompanyIdHeader = "X-Company-Id";

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

        /// <summary>Resolves and validates current request location/company from headers. Returns (CompanyId, LocationId) or throws.</summary>
        protected async Task<(int companyId, int locationId)> GetCurrentLocationAndCompanyAsync()
        {
            var locStr = Request.Headers[LocationIdHeader].FirstOrDefault();
            var compStr = Request.Headers[CompanyIdHeader].FirstOrDefault();
            if (string.IsNullOrEmpty(locStr) || !int.TryParse(locStr, out int locationId) ||
                string.IsNullOrEmpty(compStr) || !int.TryParse(compStr, out int companyId))
            {
                var single = await GetSingleLocationAccessAsync();
                if (single.HasValue)
                    return (single.Value.companyId, single.Value.locationId);
                throw new UnauthorizedAccessException("X-Location-Id and X-Company-Id headers are required when user has multiple locations.");
            }
            var allowed = await GetAllowedLocationIdsAsync();
            if (!allowed.Contains((companyId, locationId)))
                throw new UnauthorizedAccessException("You do not have access to this location.");
            return (companyId, locationId);
        }

        protected async Task<int> GetCurrentLocationIdAsync()
        {
            var (_, locationId) = await GetCurrentLocationAndCompanyAsync();
            return locationId;
        }

        protected async Task<int> GetCurrentCompanyIdAsync()
        {
            var (companyId, _) = await GetCurrentLocationAndCompanyAsync();
            return companyId;
        }

        /// <summary>Allowed (CompanyId, LocationId) pairs for current user. Admin: all locations in system.</summary>
        protected async Task<HashSet<(int companyId, int locationId)>> GetAllowedLocationIdsAsync()
        {
            if (await IsAdmin())
            {
                var fromLocs = await _context.Locations.Select(l => new { l.CompanyId, l.Id }).ToListAsync();
                var set = new HashSet<(int, int)>();
                foreach (var x in fromLocs) set.Add((x.CompanyId, x.Id));
                return set;
            }
            var list = await _context.UserLocationAccess
                .Where(ula => ula.UserId == CurrentUserId)
                .Select(ula => new { ula.CompanyId, ula.LocationId })
                .ToListAsync();
            var result = new HashSet<(int, int)>();
            foreach (var x in list) result.Add((x.CompanyId, x.LocationId));
            return result;
        }

        /// <summary>If user has exactly one location access, return it; else null.</summary>
        private async Task<(int companyId, int locationId)?> GetSingleLocationAccessAsync()
        {
            if (await IsAdmin())
                return null;
            var list = await _context.UserLocationAccess
                .Where(ula => ula.UserId == CurrentUserId)
                .Select(ula => new { ula.CompanyId, ula.LocationId })
                .ToListAsync();
            if (list.Count != 1) return null;
            var x = list[0];
            return (x.CompanyId, x.LocationId);
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
