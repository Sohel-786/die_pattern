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
    public class MastersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MastersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("types")]
        public async Task<ActionResult<IEnumerable<TypeMaster>>> GetTypes() => await _context.TypeMasters.ToListAsync();

        [HttpPost("types")]
        public async Task<ActionResult<TypeMaster>> PostType(TypeMaster master)
        {
            _context.TypeMasters.Add(master);
            await _context.SaveChangesAsync();
            return Ok(master);
        }

        [HttpGet("materials")]
        public async Task<ActionResult<IEnumerable<MaterialMaster>>> GetMaterials() => await _context.MaterialMasters.ToListAsync();

        [HttpPost("materials")]
        public async Task<ActionResult<MaterialMaster>> PostMaterial(MaterialMaster master)
        {
            _context.MaterialMasters.Add(master);
            await _context.SaveChangesAsync();
            return Ok(master);
        }

        [HttpGet("owner-types")]
        public async Task<ActionResult<IEnumerable<OwnerTypeMaster>>> GetOwners() => await _context.OwnerTypeMasters.ToListAsync();

        [HttpPost("owner-types")]
        public async Task<ActionResult<OwnerTypeMaster>> PostOwner(OwnerTypeMaster master)
        {
            _context.OwnerTypeMasters.Add(master);
            await _context.SaveChangesAsync();
            return Ok(master);
        }

        [HttpGet("statuses")]
        public async Task<ActionResult<IEnumerable<StatusMaster>>> GetStatuses() => await _context.StatusMasters.ToListAsync();

        [HttpPost("statuses")]
        public async Task<ActionResult<StatusMaster>> PostStatus(StatusMaster master)
        {
            _context.StatusMasters.Add(master);
            await _context.SaveChangesAsync();
            return Ok(master);
        }
    }
}
