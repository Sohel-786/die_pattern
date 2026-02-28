using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("outwards")]
    [ApiController]
    public class OutwardsController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly Services.IItemStateService _itemState;

        public OutwardsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, Services.IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _itemState = itemState;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("OUT", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<OutwardDto>>>> GetAll(
            [FromQuery] int? partyId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.Outwards
                .Where(o => o.LocationId == locationId)
                .Include(o => o.Party)
                .Include(o => o.Creator)
                .Include(o => o.Lines)
                    .ThenInclude(l => l.Item)
                .OrderByDescending(o => o.CreatedAt)
                .AsQueryable();

            if (partyId.HasValue)
                query = query.Where(o => o.PartyId == partyId.Value);
            
            if (startDate.HasValue)
                query = query.Where(o => o.OutwardDate >= startDate.Value.Date);
            
            if (endDate.HasValue)
                query = query.Where(o => o.OutwardDate <= endDate.Value.Date);

            var list = await query.ToListAsync();
            var data = list.Select(MapToDto).ToList();
            return Ok(new ApiResponse<IEnumerable<OutwardDto>> { Data = data });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<OutwardDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var outward = await _context.Outwards
                .Include(o => o.Party)
                .Include(o => o.Creator)
                .Include(o => o.Lines)
                    .ThenInclude(l => l.Item)
                .FirstOrDefaultAsync(o => o.Id == id && o.LocationId == locationId);

            if (outward == null) return NotFound();
            return Ok(new ApiResponse<OutwardDto> { Data = MapToDto(outward) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Outward>>> Create([FromBody] CreateOutwardDto dto)
        {
            if (!await HasPermission("CreateMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.Lines == null || !dto.Lines.Any())
                return BadRequest(new ApiResponse<Outward> { Success = false, Message = "At least one item is required for outward." });

            // Validate all items are in stock
            foreach (var line in dto.Lines)
            {
                var inStock = await _itemState.IsInStockAsync(line.ItemId);
                if (!inStock)
                {
                    var item = await _context.Items.FindAsync(line.ItemId);
                    return BadRequest(new ApiResponse<Outward> { Success = false, Message = $"Item '{item?.CurrentName ?? line.ItemId.ToString()}' is not in stock and cannot be sent outward." });
                }
            }

            var outward = new Outward
            {
                OutwardNo = await _codeGenerator.GenerateCode("OUT", locationId),
                OutwardDate = dto.OutwardDate ?? DateTime.Now.Date,
                LocationId = locationId,
                PartyId = dto.PartyId,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                IsActive = true
            };

            foreach (var lineDto in dto.Lines)
            {
                outward.Lines.Add(new OutwardLine
                {
                    ItemId = lineDto.ItemId,
                    Quantity = lineDto.Quantity,
                    Remarks = lineDto.Remarks
                });

                // Update Item State
                var item = await _context.Items.FindAsync(lineDto.ItemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.Outward;
                    item.CurrentPartyId = dto.PartyId;
                    item.CurrentLocationId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.Outwards.Add(outward);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Outward> { Data = outward });
        }

        private static OutwardDto MapToDto(Outward o)
        {
            return new OutwardDto
            {
                Id = o.Id,
                OutwardNo = o.OutwardNo,
                OutwardDate = o.OutwardDate,
                PartyId = o.PartyId,
                PartyName = o.Party?.Name,
                Remarks = o.Remarks,
                CreatedBy = o.CreatedBy,
                CreatorName = o.Creator != null ? o.Creator.FirstName + " " + o.Creator.LastName : null,
                IsActive = o.IsActive,
                CreatedAt = o.CreatedAt,
                Lines = o.Lines.Select(l => new OutwardLineDto
                {
                    Id = l.Id,
                    OutwardId = l.OutwardId,
                    ItemId = l.ItemId,
                    ItemName = l.Item?.CurrentName,
                    MainPartName = l.Item?.MainPartName,
                    ItemTypeName = l.Item?.ItemType?.Name,
                    MaterialName = l.Item?.Material?.Name,
                    DrawingNo = l.Item?.DrawingNo,
                    RevisionNo = l.Item?.RevisionNo,
                    Quantity = l.Quantity,
                    Remarks = l.Remarks
                }).ToList()
            };
        }
    }
}
