using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Security.Claims;

namespace net_backend.Controllers
{
    [Route("settings")]
    [ApiController]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> GetSoftwareSettings()
        {
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { CompanyName = "QC Pattern System" };
                _context.AppSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPatch("software")]
        [HttpPut("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UpdateSoftwareSettings([FromBody] UpdateSettingsRequest request)
        {
            if (!await CheckPermission("AccessSettings"))
                return Forbidden();

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }

            if (request.CompanyName != null) settings.CompanyName = request.CompanyName;
            if (request.SoftwareName != null) settings.SoftwareName = request.SoftwareName;
            if (request.PrimaryColor != null) settings.PrimaryColor = request.PrimaryColor;

            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpGet("permissions/me")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetMyPermissions()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized(new ApiResponse<UserPermission> { Success = false, Message = "User ID not found" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });

            // ADMIN always receives full permissions so UI (e.g. Approve PO) shows correctly regardless of DB row
            if (user.Role == Role.ADMIN)
            {
                var adminPerms = CreateDefaultPermissions(userId, Role.ADMIN);
                return Ok(new ApiResponse<UserPermission> { Success = true, Data = adminPerms });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                permissions = CreateDefaultPermissions(user.Id, user.Role);
                _context.UserPermissions.Add(permissions);
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<UserPermission> { Success = true, Data = permissions });
        }

        [HttpGet("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<object>>> GetUserPermissions(int userId)
        {
            if (!await CheckPermission("ManageUsers")) // or AccessSettings
                return Forbidden();

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            
            if (targetUser == null)
            {
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                permissions = CreateDefaultPermissions(userId, targetUser.Role);
            }

            return Ok(new ApiResponse<object> { 
                Data = new {
                    Permissions = permissions
                }
            });
        }

        [HttpPut("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<object>>> UpdatePermissions(int userId, [FromBody] UpdateUserPermissionsRequest request)
        {
            if (!await CheckPermission("ManageUsers"))
                return Forbidden();

            if (request.Permissions == null)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Permissions data is required" });

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            
            if (targetUser == null)
            {
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (permissions == null)
            {
                permissions = new UserPermission { UserId = userId };
                _context.UserPermissions.Add(permissions);
            }

            var updatedPerms = request.Permissions;

            // Update fields manually
            permissions.ViewDashboard = updatedPerms.ViewDashboard;
            
            permissions.ViewMaster = updatedPerms.ViewMaster;
            permissions.ManageItem = updatedPerms.ManageItem;
            permissions.ManageItemType = updatedPerms.ManageItemType;
            permissions.ManageMaterial = updatedPerms.ManageMaterial;
            permissions.ManageItemStatus = updatedPerms.ManageItemStatus;
            permissions.ManageOwnerType = updatedPerms.ManageOwnerType;
            permissions.ManageParty = updatedPerms.ManageParty;
            permissions.ManageLocation = updatedPerms.ManageLocation;
            permissions.ManageCompany = updatedPerms.ManageCompany;
            
            permissions.ViewPI = updatedPerms.ViewPI;
            permissions.CreatePI = updatedPerms.CreatePI;
            permissions.EditPI = updatedPerms.EditPI;
            permissions.ApprovePI = updatedPerms.ApprovePI;
            
            permissions.ViewPO = updatedPerms.ViewPO;
            permissions.CreatePO = updatedPerms.CreatePO;
            permissions.EditPO = updatedPerms.EditPO;
            permissions.ApprovePO = updatedPerms.ApprovePO;

            permissions.ViewInward = updatedPerms.ViewInward;
            permissions.CreateInward = updatedPerms.CreateInward;
            permissions.EditInward = updatedPerms.EditInward;
            
            permissions.ViewQC = updatedPerms.ViewQC;
            permissions.CreateQC = updatedPerms.CreateQC;
            permissions.EditQC = updatedPerms.EditQC;
            permissions.ApproveQC = updatedPerms.ApproveQC;

            permissions.ViewMovement = updatedPerms.ViewMovement;
            permissions.CreateMovement = updatedPerms.CreateMovement;
            
            permissions.ManageChanges = updatedPerms.ManageChanges;
            permissions.RevertChanges = updatedPerms.RevertChanges;
            
            permissions.ViewReports = updatedPerms.ViewReports;
            
            permissions.ManageUsers = updatedPerms.ManageUsers;
            permissions.AccessSettings = updatedPerms.AccessSettings;
            
            permissions.NavigationLayout = updatedPerms.NavigationLayout;

            permissions.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { 
                Data = permissions 
            });
        }

        [HttpPost("software/logo")]
        public async Task<ActionResult<object>> UpdateLogo([FromForm] IFormFile logo)
        {
            if (!await CheckPermission("AccessSettings"))
                return Forbidden();

            if (logo == null || logo.Length == 0)
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "No logo file uploaded" });

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { CompanyName = "QC Pattern System" };
                _context.AppSettings.Add(settings);
            }

            var fileName = $"logo-{Guid.NewGuid()}{Path.GetExtension(logo.FileName)}";
            var uploads = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "storage", "settings");
            Directory.CreateDirectory(uploads);
            var filePath = Path.Combine(uploads, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await logo.CopyToAsync(fileStream);
            }

            var relativePath = $"settings/{fileName}";
            settings.CompanyLogo = relativePath;
            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new { 
                Success = true, 
                Data = settings, 
                LogoUrl = $"/storage/{relativePath}" 
            });
        }

        private async Task<bool> CheckPermission(string permissionKey)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return false;
            
            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            
            // Sys admin fallback
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == nameof(Role.ADMIN)) return true;

            if (permissions == null) return false;

            return permissionKey switch
            {
                "ViewDashboard" => permissions.ViewDashboard,
                "ViewMaster" => permissions.ViewMaster,
                "ManageItem" => permissions.ManageItem,
                "ManageItemType" => permissions.ManageItemType,
                "ManageMaterial" => permissions.ManageMaterial,
                "ManageItemStatus" => permissions.ManageItemStatus,
                "ManageOwnerType" => permissions.ManageOwnerType,
                "ManageParty" => permissions.ManageParty,
                "ManageLocation" => permissions.ManageLocation,
                "ManageCompany" => permissions.ManageCompany,
                "ViewPI" => permissions.ViewPI,
                "CreatePI" => permissions.CreatePI,
                "EditPI" => permissions.EditPI,
                "ApprovePI" => permissions.ApprovePI,
                "ViewPO" => permissions.ViewPO,
                "CreatePO" => permissions.CreatePO,
                "EditPO" => permissions.EditPO,
                "ApprovePO" => permissions.ApprovePO,
                "ViewInward" => permissions.ViewInward,
                "CreateInward" => permissions.CreateInward,
                "EditInward" => permissions.EditInward,
                "ViewQC" => permissions.ViewQC,
                "CreateQC" => permissions.CreateQC,
                "EditQC" => permissions.EditQC,
                "ApproveQC" => permissions.ApproveQC,
                "ViewMovement" => permissions.ViewMovement,
                "CreateMovement" => permissions.CreateMovement,
                "ManageChanges" => permissions.ManageChanges,
                "RevertChanges" => permissions.RevertChanges,
                "ViewReports" => permissions.ViewReports,
                "ManageUsers" => permissions.ManageUsers,
                "AccessSettings" => permissions.AccessSettings,
                _ => false
            };
        }

        private UserPermission CreateDefaultPermissions(int userId, Role role)
        {
            var perm = new UserPermission
            {
                UserId = userId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            if (role == Role.ADMIN)
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ManageItem = true;
                perm.ManageItemType = true;
                perm.ManageMaterial = true;
                perm.ManageItemStatus = true;
                perm.ManageOwnerType = true;
                perm.ManageParty = true;
                perm.ManageLocation = true;
                perm.ManageCompany = true;

                perm.ViewPI = true;
                perm.CreatePI = true;
                perm.EditPI = true;
                perm.ApprovePI = true;

                perm.ViewPO = true;
                perm.CreatePO = true;
                perm.EditPO = true;
                perm.ApprovePO = true;

                perm.ViewInward = true;
                perm.CreateInward = true;
                perm.EditInward = true;

                perm.ViewQC = true;
                perm.CreateQC = true;
                perm.EditQC = true;
                perm.ApproveQC = true;

                perm.ViewMovement = true;
                perm.CreateMovement = true;
                perm.ManageChanges = true;
                perm.RevertChanges = true;
                perm.ViewReports = true;
                perm.ManageUsers = true;
                perm.AccessSettings = true;
            }
            else if (role == Role.MANAGER)
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ManageItem = true;
                perm.ManageItemType = true;
                perm.ManageMaterial = true;
                perm.ManageItemStatus = true;
                perm.ManageOwnerType = true;
                perm.ManageParty = true;
                perm.ManageLocation = true;
                perm.ManageCompany = true;

                perm.ViewPI = true;
                perm.CreatePI = true;
                perm.EditPI = true;

                perm.ViewPO = true;
                perm.CreatePO = true;
                perm.EditPO = true;

                perm.ViewInward = true;
                perm.CreateInward = true;

                perm.ViewQC = true;
                perm.CreateQC = true;
                perm.EditQC = true;

                perm.ViewMovement = true;
                perm.CreateMovement = true;
                perm.ViewReports = true;
            }
            else
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.ViewPI = true;
                perm.ViewPO = true;
                perm.ViewInward = true;
                perm.ViewQC = true;
                perm.ViewMovement = true;
            }

            return perm;
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
