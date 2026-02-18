using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using backend.Data;
using backend.DTOs;
using backend.Models;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            var user = await _context.Users
                .Include(u => u.Permission)
                .FirstOrDefaultAsync(u => u.Username == loginDto.Username && u.IsActive);

            if (user == null || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.Password))
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            var token = GenerateJwtToken(user);

            Response.Cookies.Append("access_token", token, new CookieOptions
            {
                HttpOnly = true,
                Secure = false, // Set to true in production
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7)
            });

            return Ok(new
            {
                user = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    Permission = user.Permission == null ? null : new UserPermissionDto
                    {
                        ViewDashboard = user.Permission.ViewDashboard,
                        ViewMaster = user.Permission.ViewMaster,
                        ViewPI = user.Permission.ViewPI,
                        ViewPO = user.Permission.ViewPO,
                        ViewMovement = user.Permission.ViewMovement,
                        ViewReports = user.Permission.ViewReports,
                        ManageUsers = user.Permission.ManageUsers,
                        AccessSettings = user.Permission.AccessSettings
                    }
                }
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("access_token");
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized();
            }

            var user = await _context.Users
                .Include(u => u.Permission)
                .FirstOrDefaultAsync(u => u.Id == int.Parse(userIdClaim));

            if (user == null)
            {
                return Unauthorized();
            }

            return Ok(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role.ToString(),
                Permission = user.Permission == null ? null : new UserPermissionDto
                {
                    ViewDashboard = user.Permission.ViewDashboard,
                    ViewMaster = user.Permission.ViewMaster,
                    ViewPI = user.Permission.ViewPI,
                    ViewPO = user.Permission.ViewPO,
                    ViewMovement = user.Permission.ViewMovement,
                    ViewReports = user.Permission.ViewReports,
                    ManageUsers = user.Permission.ManageUsers,
                    AccessSettings = user.Permission.AccessSettings
                }
            });
        }

        private string GenerateJwtToken(User user)
        {
            var jwtKey = _configuration["Jwt:Key"] ?? "YourSuperSecretKeyWithAtLeast32Characters";
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "DPMS",
                audience: _configuration["Jwt:Audience"] ?? "DPMS_Client",
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
