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
    public class PartiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PartiesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Party>>> GetParties() => await _context.Parties.ToListAsync();

        [HttpPost]
        public async Task<ActionResult<Party>> PostParty(Party party)
        {
            party.IsActive = true;
            _context.Parties.Add(party);
            await _context.SaveChangesAsync();
            return Ok(party);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutParty(int id, Party party)
        {
            if (id != party.Id) return BadRequest();
            _context.Entry(party).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteParty(int id)
        {
            var party = await _context.Parties.FindAsync(id);
            if (party == null) return NotFound();
            _context.Parties.Remove(party);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
