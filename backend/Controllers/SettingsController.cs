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
        private readonly IWebHostEnvironment _env;

        public SettingsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [AllowAnonymous]
        [HttpGet("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> GetSoftwareSettings()
        {
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { SoftwareName = "Die & Pattern Management" };
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

            if (request.SoftwareName != null) settings.SoftwareName = request.SoftwareName;

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

            // ADMIN: if a permission row exists, use it (so admin can restrict their own access); otherwise full default
            if (user.Role == Role.ADMIN)
            {
                var dbRow = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
                var adminPerms = dbRow != null
                    ? dbRow
                    : CreateDefaultPermissions(userId, Role.ADMIN);
                if (dbRow != null && string.IsNullOrEmpty(dbRow.NavigationLayout))
                    adminPerms.NavigationLayout = "SIDEBAR";
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
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = 0;
            int.TryParse(currentUserIdStr, out currentUserId);
            bool canManage = await CheckPermission("AccessSettings");
            if (!canManage && userId != currentUserId)
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
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = 0;
            int.TryParse(currentUserIdStr, out currentUserId);
            bool canManage = await CheckPermission("AccessSettings");
            if (!canManage && userId != currentUserId)
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
            permissions.AddMaster = updatedPerms.AddMaster;
            permissions.EditMaster = updatedPerms.EditMaster;
            permissions.ImportMaster = updatedPerms.ImportMaster;
            permissions.ExportMaster = updatedPerms.ExportMaster;
            
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
            permissions.EditMovement = updatedPerms.EditMovement;

            permissions.ViewTransfer = updatedPerms.ViewTransfer;
            permissions.CreateTransfer = updatedPerms.CreateTransfer;
            permissions.EditTransfer = updatedPerms.EditTransfer;
            
            permissions.ManageChanges = updatedPerms.ManageChanges;
            permissions.RevertChanges = updatedPerms.RevertChanges;
            
            permissions.ViewReports = updatedPerms.ViewReports;
            permissions.ViewPIPReport = updatedPerms.ViewPIPReport;
            permissions.ViewInwardReport = updatedPerms.ViewInwardReport;
            permissions.ViewItemLedgerReport = updatedPerms.ViewItemLedgerReport;
            permissions.AccessSettings = updatedPerms.AccessSettings;
            
            permissions.NavigationLayout = updatedPerms.NavigationLayout;

            permissions.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { 
                Data = permissions 
            });
        }

        [HttpPost("reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            // Only Admin can perform factory reset
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != nameof(Role.ADMIN)) return Forbidden();

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Wipe Transactional Data
                _context.AuditLogs.RemoveRange(_context.AuditLogs);
                _context.ItemChangeLogs.RemoveRange(_context.ItemChangeLogs);
                _context.QcItems.RemoveRange(_context.QcItems);
                _context.QcEntries.RemoveRange(_context.QcEntries);
                _context.InwardLines.RemoveRange(_context.InwardLines);
                _context.Inwards.RemoveRange(_context.Inwards);
                _context.JobWorks.RemoveRange(_context.JobWorks);
                _context.PurchaseOrderItems.RemoveRange(_context.PurchaseOrderItems);
                _context.PurchaseOrders.RemoveRange(_context.PurchaseOrders);
                _context.PurchaseIndentItems.RemoveRange(_context.PurchaseIndentItems);
                _context.PurchaseIndents.RemoveRange(_context.PurchaseIndents);
                
                // 2. Wipe Masters
                _context.Items.RemoveRange(_context.Items);
                _context.Parties.RemoveRange(_context.Parties);
                _context.Materials.RemoveRange(_context.Materials);
                _context.ItemStatuses.RemoveRange(_context.ItemStatuses);
                _context.ItemTypes.RemoveRange(_context.ItemTypes);
                _context.OwnerTypes.RemoveRange(_context.OwnerTypes);

                // 3. User related (Keep Admin 'mitul')
                _context.UserLocationAccess.RemoveRange(_context.UserLocationAccess);
                _context.UserPermissions.RemoveRange(_context.UserPermissions);
                
                var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "mitul");
                if (adminUser != null)
                {
                    adminUser.DefaultCompanyId = null;
                    adminUser.DefaultLocationId = null;
                }
                // Save immediately so admin is no longer pointing to things being deleted
                await _context.SaveChangesAsync();

                var otherUsers = _context.Users.Where(u => u.Username != "mitul");
                _context.Users.RemoveRange(otherUsers);

                // 4. Locations & Companies (Clear all; DbInitializer will re-seed the base ones)
                _context.Locations.RemoveRange(_context.Locations);
                _context.Companies.RemoveRange(_context.Companies);
                _context.AppSettings.RemoveRange(_context.AppSettings);

                await _context.SaveChangesAsync();

                // 5. Re-initialize baseline data
                DbInitializer.Initialize(_context);

                // 6. Wipe transaction attachment storage
                var root = _env.ContentRootPath ?? Directory.GetCurrentDirectory();
                var storageRoot = Path.Combine(root, "wwwroot", "storage");
                var wipeSubDirs = new[] { "inward-attachments-temp", "qc-attachments-temp", "po-quotations" };
                foreach (var sub in wipeSubDirs)
                {
                    var fullPath = Path.Combine(storageRoot, sub);
                    if (Directory.Exists(fullPath))
                        Directory.Delete(fullPath, recursive: true);
                }
                // Wipe per-company/location inward and qc attachment folders (any company subfolder that has these)
                if (Directory.Exists(storageRoot))
                {
                    foreach (var companyDir in Directory.GetDirectories(storageRoot))
                    {
                        // Skip company-logos folder
                        if (Path.GetFileName(companyDir).Equals("company-logos", StringComparison.OrdinalIgnoreCase)) continue;
                        foreach (var locationDir in Directory.GetDirectories(companyDir))
                        {
                            var inwAttach = Path.Combine(locationDir, "inward-attachments");
                            if (Directory.Exists(inwAttach)) Directory.Delete(inwAttach, recursive: true);
                            var qcAttach = Path.Combine(locationDir, "qc-attachments");
                            if (Directory.Exists(qcAttach)) Directory.Delete(qcAttach, recursive: true);
                        }
                    }
                }

                await transaction.CommitAsync();

                return Ok(new ApiResponse<string>
                {
                    Success = true,
                    Message = "System has been reset successfully. All data removed except primary admin, base company and location.",
                    Data = "Success"
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var innerMsg = ex.InnerException != null ? $"\nInner: {ex.InnerException.Message}" : "";
                return StatusCode(500, new ApiResponse<string>
                {
                    Success = false,
                    Message = $"Factory reset failed: {ex.Message}{innerMsg}"
                });
            }
        }

        [HttpGet("transfer-rules")]
        public async Task<ActionResult<ApiResponse<IEnumerable<TransferRuleLocationDto>>>> GetTransferRules()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != nameof(Role.ADMIN))
                return Forbidden();

            var locations = await _context.Locations
                .AsNoTracking()
                .Include(l => l.Company)
                .Where(l => l.IsActive)
                .OrderBy(l => l.Company != null ? l.Company.Name : "")
                .ThenBy(l => l.Name)
                .Select(l => new { l.Id, l.Name, CompanyName = l.Company != null ? l.Company.Name : null })
                .ToListAsync();

            Dictionary<int, bool> settings;
            try
            {
                settings = await _context.LocationTransferSettings
                    .AsNoTracking()
                    .ToDictionaryAsync(s => s.LocationId, s => s.AllowVendorToVendorTransfer);
            }
            catch
            {
                // Table may not exist yet if migration not applied
                settings = new Dictionary<int, bool>();
            }

            var list = locations.Select(l => new TransferRuleLocationDto
            {
                LocationId = l.Id,
                LocationName = l.Name,
                CompanyName = l.CompanyName,
                AllowVendorToVendorTransfer = settings.TryGetValue(l.Id, out var allowed) && allowed
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<TransferRuleLocationDto>> { Data = list });
        }

        [HttpPut("transfer-rules")]
        public async Task<ActionResult<ApiResponse<object>>> UpdateTransferRules([FromBody] List<UpdateTransferRuleItemDto>? items)
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != nameof(Role.ADMIN))
                return Forbidden();

            if (items == null || !items.Any())
                return Ok(new ApiResponse<object> { Data = true });

            try
            {
                var now = DateTime.Now;
                foreach (var item in items)
                {
                    var existing = await _context.LocationTransferSettings.FirstOrDefaultAsync(s => s.LocationId == item.LocationId);
                    if (existing != null)
                    {
                        existing.AllowVendorToVendorTransfer = item.AllowVendorToVendorTransfer;
                        existing.UpdatedAt = now;
                    }
                    else
                    {
                        _context.LocationTransferSettings.Add(new LocationTransferSetting
                        {
                            LocationId = item.LocationId,
                            AllowVendorToVendorTransfer = item.AllowVendorToVendorTransfer,
                            UpdatedAt = now
                        });
                    }
                }
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                var sqlEx = ex as Microsoft.Data.SqlClient.SqlException;
                for (var e = ex.InnerException; sqlEx == null && e != null; e = e.InnerException)
                    sqlEx = e as Microsoft.Data.SqlClient.SqlException;
                if (sqlEx != null && sqlEx.Number == 208)
                    return BadRequest(new ApiResponse<object> { Success = false, Message = "Transfer rules table not found. Please run database migration: dotnet ef database update" });
                throw;
            }

            return Ok(new ApiResponse<object> { Data = true });
        }

        [HttpGet("transfer-rules/current")]
        public async Task<ActionResult<ApiResponse<CurrentTransferRuleDto>>> GetCurrentTransferRule()
        {
            var locStr = Request.Headers["X-Location-Id"].FirstOrDefault();
            if (string.IsNullOrEmpty(locStr) || !int.TryParse(locStr, out int locationId))
                return BadRequest(new ApiResponse<CurrentTransferRuleDto> { Success = false, Message = "X-Location-Id header is required." });

            LocationTransferSetting? setting = null;
            try
            {
                setting = await _context.LocationTransferSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.LocationId == locationId);
            }
            catch
            {
                // Table may not exist yet if migration not applied
            }

            return Ok(new ApiResponse<CurrentTransferRuleDto>
            {
                Data = new CurrentTransferRuleDto
                {
                    AllowVendorToVendorTransfer = setting != null && setting.AllowVendorToVendorTransfer
                }
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
                "AddMaster" => permissions.AddMaster,
                "EditMaster" => permissions.EditMaster,
                "ImportMaster" => permissions.ImportMaster,
                "ExportMaster" => permissions.ExportMaster,
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
                "EditMovement" => permissions.EditMovement,
                "ViewTransfer" => permissions.ViewTransfer,
                "CreateTransfer" => permissions.CreateTransfer,
                "EditTransfer" => permissions.EditTransfer,
                "ManageChanges" => permissions.ManageChanges,
                "RevertChanges" => permissions.RevertChanges,
                "ViewReports" => permissions.ViewReports,
                "ViewPIPReport" => permissions.ViewPIPReport,
                "ViewInwardReport" => permissions.ViewInwardReport,
                "ViewItemLedgerReport" => permissions.ViewItemLedgerReport,
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
                perm.AddMaster = true;
                perm.EditMaster = true;
                perm.ImportMaster = true;
                perm.ExportMaster = true;
                
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
                perm.EditMovement = true;

                perm.ViewTransfer = true;
                perm.CreateTransfer = true;
                perm.EditTransfer = true;

                perm.ManageChanges = true;
                perm.RevertChanges = true;
                perm.ViewReports = true;
                perm.AccessSettings = true;
            }
            else if (role == Role.MANAGER)
            {
                perm.ViewDashboard = true;
                perm.ViewMaster = true;
                perm.AddMaster = true;
                perm.EditMaster = true;
                
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
                perm.ViewTransfer = true;
                perm.CreateTransfer = true;
                perm.ViewReports = true;
                perm.ViewPIPReport = true;
                perm.ViewInwardReport = true;
                perm.ViewItemLedgerReport = true;
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
                perm.ViewTransfer = true;
            }

            return perm;
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
