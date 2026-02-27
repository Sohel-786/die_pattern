using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("movements")]
    [ApiController]
    public class MovementsController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;

        public MovementsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator) : base(context)
        {
            _codeGenerator = codeGenerator;
        }

        [HttpGet("outward-pending-return")]
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetOutwardPendingReturn([FromQuery] int? vendorId)
        {
            var locationId = await GetCurrentLocationIdAsync();
            
            var inwardedOutwards = await _context.InwardLines
                .Where(l => l.SourceType == InwardSourceType.OutwardReturn && l.Inward!.Status == InwardStatus.Submitted && l.SourceRefId.HasValue)
                .Select(l => l.SourceRefId!.Value)
                .Distinct()
                .ToListAsync();

            var query = _context.Movements
                .Where(m => m.Type == MovementType.Outward && m.FromLocationId == locationId && !inwardedOutwards.Contains(m.Id));

            if (vendorId.HasValue && vendorId > 0)
                query = query.Where(m => m.ToPartyId == vendorId.Value);

            var movements = await query
                .Include(m => m.Item)
                .Include(m => m.ToParty)
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            var data = movements.Select(m => new MovementDto
            {
                Id = m.Id,
                MovementNo = m.MovementNo,
                Type = m.Type,
                ItemId = m.ItemId,
                ItemName = m.Item?.CurrentName,
                MainPartName = m.Item?.MainPartName,
                ToPartyId = m.ToPartyId,
                ToPartyName = m.ToParty?.Name,
                Remarks = m.Remarks,
                CreatedAt = m.CreatedAt
            }).ToList();

            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = data });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<MovementDto>>>> GetAll()
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var data = await _context.Movements
                .Where(m => m.FromLocationId == locationId || m.ToLocationId == locationId || (m.Item != null && m.Item.LocationId == locationId))
                .Include(m => m.Item)
                .Include(m => m.FromLocation)
                .Include(m => m.FromParty)
                .Include(m => m.ToLocation)
                .Include(m => m.ToParty)
                .Select(m => new MovementDto
                {
                    Id = m.Id,
                    MovementNo = m.MovementNo,
                    Type = m.Type,
                    ItemId = m.ItemId,
                    ItemName = m.Item!.CurrentName,
                    FromType = m.FromType,
                    FromName = m.FromType == HolderType.Location ? m.FromLocation!.Name : m.FromParty!.Name,
                    ToType = m.ToType,
                    ToName = m.ToType == HolderType.Location ? m.ToLocation!.Name : m.ToParty!.Name,
                    Remarks = m.Remarks,
                    Reason = m.Reason,
                    IsQCPending = m.IsQCPending,
                    IsQCApproved = m.IsQCApproved,
                    CreatedAt = m.CreatedAt
                })
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<MovementDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Movement>>> Create([FromBody] CreateMovementDto dto)
        {
            if (!await HasPermission("CreateMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == dto.ItemId && i.LocationId == locationId);
            if (item == null) return NotFound("Item not found");

            // No direct Vendor → Vendor transfer
            if (item.CurrentHolderType == HolderType.Vendor && dto.ToType == HolderType.Vendor)
                return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Vendor to Vendor transfer is not allowed." });

            if (dto.Type == MovementType.SystemReturn && string.IsNullOrWhiteSpace(dto.Reason))
                return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Reason is mandatory for System Return." });

            if (dto.Type == MovementType.Outward)
            {
                // Issue to Vendor: item must be at current location
                if (item.CurrentHolderType != HolderType.Location)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Cannot issue: item is not at a location (already at vendor or invalid state)." });
                if (item.CurrentLocationId != locationId)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Item is not at current location." });
                if (dto.ToType != HolderType.Vendor)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Outward (Issue) must be to Vendor." });
            }

            if (dto.Type == MovementType.Inward || dto.Type == MovementType.SystemReturn)
            {
                // Receive from Vendor / System Return: item must be at Vendor
                if (item.CurrentHolderType != HolderType.Vendor)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Cannot receive: item is not at vendor (must be issued first)." });
                if (dto.ToType != HolderType.Location)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Inward/System Return must be to Location." });
                if (dto.ToLocationId != locationId)
                    return BadRequest(new ApiResponse<Movement> { Success = false, Message = "Inward/System Return must be to current location." });
            }

            var movement = new Movement
            {
                MovementNo = await _codeGenerator.GenerateCode(dto.Type == MovementType.Outward ? "OUT" : "INW", locationId),
                Type = dto.Type,
                ItemId = dto.ItemId,
                
                FromType = item.CurrentHolderType,
                FromLocationId = item.CurrentLocationId,
                FromPartyId = item.CurrentPartyId,

                ToType = dto.ToType,
                ToLocationId = dto.ToLocationId,
                ToPartyId = dto.ToPartyId,

                Remarks = dto.Remarks,
                Reason = dto.Reason,
                PurchaseOrderId = dto.PurchaseOrderId,
                
                IsQCPending = (dto.Type == MovementType.Inward || dto.Type == MovementType.SystemReturn),
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            };

            // Update Item holder (if no QC pending)
            // If Inward/SystemReturn, wait for QC to update stock
            if (dto.Type == MovementType.Outward)
            {
                item.CurrentHolderType = dto.ToType;
                item.CurrentLocationId = dto.ToLocationId;
                item.CurrentPartyId = dto.ToPartyId;
                item.UpdatedAt = DateTime.Now;
            }

            _context.Movements.Add(movement);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Movement> { Data = movement });
        }
    }
}
