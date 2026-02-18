using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("parties")]
    [ApiController]
    public class PartiesController : BaseController
    {
        public PartiesController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetAll()
        {
            var parties = await _context.Parties
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = parties });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetActive()
        {
            var parties = await _context.Parties
                .Where(p => p.IsActive)
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = parties });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Party>>> Create([FromBody] Party party)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            party.CreatedAt = DateTime.Now;
            party.UpdatedAt = DateTime.Now;
            _context.Parties.Add(party);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Party> { Data = party });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Party>>> Update(int id, [FromBody] Party party)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var existing = await _context.Parties.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Party> { Success = false, Message = "Party not found" });

            existing.Name = party.Name.Trim();
            existing.PhoneNumber = party.PhoneNumber;
            existing.Email = party.Email;
            existing.Address = party.Address;
            existing.IsActive = party.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Party> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var party = await _context.Parties.FindAsync(id);
            if (party == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Party not found" });

            _context.Parties.Remove(party);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
