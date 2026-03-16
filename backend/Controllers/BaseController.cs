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
        private const string PermissionCacheKey = "__perm_ctx";

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
                    // When no authenticated user is present, treat as "anonymous" with no permissions.
                    // Permission checks will fail gracefully (returning 403) instead of throwing.
                    return 0;
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

        /// <summary>Allowed (CompanyId, LocationId) pairs for current user. Admin and non-admin both use UserLocationAccess only.</summary>
        protected async Task<HashSet<(int companyId, int locationId)>> GetAllowedLocationIdsAsync()
        {
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

        private async Task<(Role role, UserPermission? permission)> GetPermissionContextAsync()
        {
            if (HttpContext.Items.TryGetValue(PermissionCacheKey, out var cached) &&
                cached is ValueTuple<Role, UserPermission?> tuple)
            {
                return tuple;
            }

            var user = await _context.Users
                .Include(u => u.Permission)
                .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

            var ctx = (user?.Role ?? Role.USER, user?.Permission);
            HttpContext.Items[PermissionCacheKey] = ctx;
            return ctx;
        }

        protected async Task<bool> HasPermission(string permission)
        {
            var (role, p) = await GetPermissionContextAsync();
            if (p == null && role != Role.ADMIN) return false;
            if (role == Role.ADMIN) return true;

            var perm = p!;
            return permission switch
            {
                "ViewDashboard" => perm.ViewDashboard,
                "ViewMaster" => perm.ViewMaster,
                "AddMaster" => perm.AddMaster,
                "EditMaster" => perm.EditMaster,
                "ImportMaster" => perm.ImportMaster,
                "ExportMaster" => perm.ExportMaster,
                "ManageItem" => perm.ManageItem,
                "ManageItemType" => perm.ManageItemType,
                "ManageMaterial" => perm.ManageMaterial,
                "ManageItemStatus" => perm.ManageItemStatus,
                "ManageOwnerType" => perm.ManageOwnerType,
                "ManageParty" => perm.ManageParty,
                "ManageLocation" => perm.ManageLocation,
                "ManageCompany" => perm.ManageCompany,
                "ViewPI" => perm.ViewPI,
                "CreatePI" => perm.CreatePI,
                "EditPI" => perm.EditPI,
                "ApprovePI" => perm.ApprovePI,
                "ViewPO" => perm.ViewPO,
                "CreatePO" => perm.CreatePO,
                "EditPO" => perm.EditPO,
                "ApprovePO" => perm.ApprovePO,
                "ViewInward" => perm.ViewInward,
                "CreateInward" => perm.CreateInward,
                "EditInward" => perm.EditInward,
                "ViewQC" => perm.ViewQC,
                "CreateQC" => perm.CreateQC,
                "EditQC" => perm.EditQC,
                "ApproveQC" => perm.ApproveQC,
                "ViewMovement" => perm.ViewMovement,
                "CreateMovement" => perm.CreateMovement,
                "EditMovement" => perm.EditMovement,
                "ViewTransfer" => perm.ViewTransfer,
                "CreateTransfer" => perm.CreateTransfer,
                "EditTransfer" => perm.EditTransfer,
                "ManageChanges" => perm.ManageChanges,
                "RevertChanges" => perm.RevertChanges,
                "ViewReports" => perm.ViewReports,
                "ViewPIPReport" => perm.ViewPIPReport,
                "ViewInwardReport" => perm.ViewInwardReport,
                "ViewItemLedgerReport" => perm.ViewItemLedgerReport,
                "AccessSettings" => perm.AccessSettings,
                _ => false
            };
        }

        protected async Task<bool> HasAllPermissions(params string[] permissions)
        {
            foreach (var perm in permissions)
            {
                if (!await HasPermission(perm)) return false;
            }
            return true;
        }

        /// <summary>Master create requires both AddMaster and module manage permission.</summary>
        protected async Task<bool> CanCreateMaster(string managePermission)
            => await HasAllPermissions("ViewMaster", "AddMaster", managePermission);

        /// <summary>Master edit requires both EditMaster and module manage permission.</summary>
        protected async Task<bool> CanEditMaster(string managePermission)
            => await HasAllPermissions("ViewMaster", "EditMaster", managePermission);

        protected ActionResult Forbidden()
        {
            return StatusCode(403, new { success = false, message = "Access denied: Missing required permission." });
        }
    }
}
