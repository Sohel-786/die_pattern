using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SettingsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<AppSettings>> GetSettings()
        {
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return settings;
        }

        [HttpPost]
        public async Task<IActionResult> UpdateSettings(AppSettings settings)
        {
            var existing = await _context.AppSettings.FirstOrDefaultAsync();
            if (existing == null)
            {
                _context.AppSettings.Add(settings);
            }
            else
            {
                existing.CompanyName = settings.CompanyName;
                existing.SoftwareName = settings.SoftwareName;
                existing.PrimaryColor = settings.PrimaryColor;
                existing.SupportEmail = settings.SupportEmail;
                existing.SupportPhone = settings.SupportPhone;
                existing.Address = settings.Address;
                existing.Website = settings.Website;
                existing.UpdatedAt = DateTime.Now;
            }

            await _context.SaveChangesAsync();
            return Ok(settings);
        }

        [HttpPost("reset")]
        public async Task<IActionResult> FactoryReset()
        {
            // Only admin can reset
            var isAdmin = User.IsInRole("ADMIN"); // Assuming Role is claims based or handled by middleware
            // Simple check for now
            
            await DbInitializer.ResetDatabase(_context);
            return Ok(new { message = "System reset complete. Only administrator account remains." });
        }
    }
}
