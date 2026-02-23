using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("users")]
    [ApiController]
    public class UsersController : BaseController
    {
        public UsersController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetAll()
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            var users = await _context.Users.ToListAsync();
            return Ok(new ApiResponse<IEnumerable<User>> { Data = users });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> GetById(int id)
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();
            return Ok(new ApiResponse<User> { Data = user });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<User>>> Create([FromBody] CreateUserRequest request)
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });

            var role = Enum.Parse<Role>(request.Role);

            // Validation for MobileNumber
            if ((role == Role.USER || role == Role.MANAGER) && string.IsNullOrEmpty(request.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for User and Manager roles." });
            }

            if (!string.IsNullOrEmpty(request.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(request.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            var user = new User
            {
                Username = request.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = role,
                IsActive = request.IsActive,
                Avatar = request.Avatar,
                MobileNumber = request.MobileNumber,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<User> { Data = user });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> Update(int id, [FromBody] UpdateUserRequest request)
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();

            if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
            {
                if (await _context.Users.AnyAsync(u => u.Username == request.Username && u.Id != id))
                {
                    return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });
                }
                user.Username = request.Username;
            }

            if (!string.IsNullOrEmpty(request.FirstName)) user.FirstName = request.FirstName;
            if (!string.IsNullOrEmpty(request.LastName)) user.LastName = request.LastName;
            if (!string.IsNullOrEmpty(request.Role)) user.Role = Enum.Parse<Role>(request.Role);
            if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
            if (!string.IsNullOrEmpty(request.Password)) user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);
            if (request.Avatar != null) user.Avatar = string.IsNullOrEmpty(request.Avatar) ? null : request.Avatar;
            if (request.MobileNumber != null) user.MobileNumber = request.MobileNumber;

            // Validation for MobileNumber
            if ((user.Role == Role.USER || user.Role == Role.MANAGER) && string.IsNullOrEmpty(user.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for User and Manager roles." });
            }

            if (!string.IsNullOrEmpty(user.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(user.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<User> { Data = user });
        }

        [HttpGet("{id}/permissions")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetPermissions(int id)
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            var permission = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == id);
            if (permission == null)
            {
                // Create default if not exists
                permission = new UserPermission { UserId = id };
                _context.UserPermissions.Add(permission);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<UserPermission> { Data = permission });
        }

        [HttpPut("{id}/permissions")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> UpdatePermissions(int id, [FromBody] UserPermission request)
        {
            if (!await HasPermission("ManageUsers")) return Forbidden();
            var permission = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == id);
            if (permission == null) return NotFound();

            // Update all boolean flags
            permission.ViewDashboard = request.ViewDashboard;
            permission.ViewMaster = request.ViewMaster;
            permission.ManageItem = request.ManageItem;
            permission.ManageItemType = request.ManageItemType;
            permission.ManageMaterial = request.ManageMaterial;
            permission.ManageItemStatus = request.ManageItemStatus;
            permission.ManageOwnerType = request.ManageOwnerType;
            permission.ManageParty = request.ManageParty;
            permission.ManageLocation = request.ManageLocation;
            permission.ManageCompany = request.ManageCompany;

            permission.ViewPI = request.ViewPI;
            permission.CreatePI = request.CreatePI;
            permission.EditPI = request.EditPI;
            permission.ApprovePI = request.ApprovePI;

            permission.ViewPO = request.ViewPO;
            permission.CreatePO = request.CreatePO;
            permission.EditPO = request.EditPO;
            permission.ApprovePO = request.ApprovePO;

            permission.ViewInward = request.ViewInward;
            permission.CreateInward = request.CreateInward;
            permission.EditInward = request.EditInward;
            
            permission.ViewQC = request.ViewQC;
            permission.CreateQC = request.CreateQC;
            permission.EditQC = request.EditQC;
            permission.ApproveQC = request.ApproveQC;

            permission.ViewMovement = request.ViewMovement;
            permission.CreateMovement = request.CreateMovement;
            
            permission.ManageChanges = request.ManageChanges;
            permission.RevertChanges = request.RevertChanges;
            permission.ViewReports = request.ViewReports;
            permission.ManageUsers = request.ManageUsers;
            permission.AccessSettings = request.AccessSettings;
            
            permission.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<UserPermission> { Data = permission });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();

            if (user.Username.ToLower() == "qc_admin")
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Main admin user cannot be deleted." });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Success = true, Data = true });
        }
    }
}
