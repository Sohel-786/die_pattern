using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("job-works")]
    [ApiController]
    public class JobWorksController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly Services.IItemStateService _itemState;

        public JobWorksController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, Services.IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _itemState = itemState;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("JW", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<JobWorkDto>>>> GetAll(
            [FromQuery] JobWorkStatus? status)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.JobWorks
                .Where(j => j.LocationId == locationId)
                .Include(j => j.Item)
                .Include(j => j.Creator)
                .OrderByDescending(j => j.CreatedAt)
                .AsQueryable();
            if (status.HasValue)
                query = query.Where(j => j.Status == status.Value);
            var list = await query.ToListAsync();
            var data = list.Select(MapToDto).ToList();
            return Ok(new ApiResponse<IEnumerable<JobWorkDto>> { Data = data });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<JobWorkDto>>> GetById(int id)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var jw = await _context.JobWorks
                .Include(j => j.Item)
                .Include(j => j.Creator)
                .FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId);
            if (jw == null) return NotFound();
            return Ok(new ApiResponse<JobWorkDto> { Data = MapToDto(jw) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<JobWork>>> Create([FromBody] CreateJobWorkDto dto)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var inStock = await _itemState.IsInStockAsync(dto.ItemId);
            if (!inStock)
                return BadRequest(new ApiResponse<JobWork> { Success = false, Message = "Item must be In stock to send for Job work. One item can only be in one process at a time (PI, PO, QC, Jobwork, Outward, or In stock)." });

            var jw = new JobWork
            {
                JobWorkNo = await _codeGenerator.GenerateCode("JW", locationId),
                ItemId = dto.ItemId,
                Description = dto.Description,
                Status = JobWorkStatus.Pending,
                LocationId = locationId,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.JobWorks.Add(jw);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<JobWork> { Data = jw });
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateStatus(int id, [FromBody] UpdateJobWorkStatusDto dto)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var jw = await _context.JobWorks.FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId);
            if (jw == null) return NotFound();
            jw.Status = dto.Status;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private static JobWorkDto MapToDto(JobWork j)
        {
            return new JobWorkDto
            {
                Id = j.Id,
                JobWorkNo = j.JobWorkNo,
                ItemId = j.ItemId,
                ItemName = j.Item?.CurrentName,
                Description = j.Description,
                Status = j.Status,
                CreatedAt = j.CreatedAt
            };
        }
    }
}
