using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("inwards")]
    [ApiController]
    public class InwardsController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;

        public InwardsController(ApplicationDbContext context, ICodeGeneratorService codeGenerator) : base(context)
        {
            _codeGenerator = codeGenerator;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var code = await _codeGenerator.GenerateCode("INWARD");
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<InwardDto>>>> GetAll(
            [FromQuery] InwardSourceType? sourceType,
            [FromQuery] InwardStatus? status)
        {
            var query = _context.Inwards
                .Include(i => i.Location)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Movement)
                .OrderByDescending(i => i.CreatedAt)
                .AsQueryable();

            if (sourceType.HasValue)
                query = query.Where(i => i.SourceType == sourceType.Value);
            if (status.HasValue)
                query = query.Where(i => i.Status == status.Value);

            var list = await query.ToListAsync();
            var data = list.Select(i => MapToDto(i)).ToList();
            return Ok(new ApiResponse<IEnumerable<InwardDto>> { Data = data });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<InwardDto>>> GetById(int id)
        {
            var inward = await _context.Inwards
                .Include(i => i.Location)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Movement)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (inward == null) return NotFound();
            return Ok(new ApiResponse<InwardDto> { Data = MapToDto(inward) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Inward>>> Create([FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();

            int? vid = null;
            try { ValidateSourceRef(dto.SourceType, dto.SourceRefId, out vid); }
            catch (ArgumentException ex) { return BadRequest(new ApiResponse<Inward> { Success = false, Message = ex.Message }); }
            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one line is required." });

            var inward = new Inward
            {
                InwardNo = await _codeGenerator.GenerateCode("INWARD"),
                InwardDate = dto.InwardDate ?? DateTime.Now.Date,
                SourceType = dto.SourceType,
                SourceRefId = dto.SourceRefId,
                LocationId = dto.LocationId,
                VendorId = dto.VendorId ?? vid,
                Remarks = dto.Remarks,
                Status = InwardStatus.Draft,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var line in dto.Lines)
            {
                if (line.Quantity < 1) continue;
                inward.Lines.Add(new InwardLine { ItemId = line.ItemId, Quantity = line.Quantity });
            }

            if (inward.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one valid line is required." });

            _context.Inwards.Add(inward);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<Inward> { Data = inward });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("EditInward")) return Forbidden();

            var inward = await _context.Inwards.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id);
            if (inward == null) return NotFound();
            if (inward.Status != InwardStatus.Draft)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft inwards can be edited." });

            int? vid = null;
            try { ValidateSourceRef(dto.SourceType, dto.SourceRefId, out vid); }
            catch (ArgumentException ex) { return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message }); }
            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one line is required." });

            inward.InwardDate = dto.InwardDate ?? inward.InwardDate;
            inward.SourceType = dto.SourceType;
            inward.SourceRefId = dto.SourceRefId;
            inward.LocationId = dto.LocationId;
            inward.VendorId = dto.VendorId ?? vid;
            inward.Remarks = dto.Remarks;
            inward.UpdatedAt = DateTime.Now;

            _context.InwardLines.RemoveRange(inward.Lines);
            foreach (var line in dto.Lines)
            {
                if (line.Quantity < 1) continue;
                inward.Lines.Add(new InwardLine { ItemId = line.ItemId, Quantity = line.Quantity });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("{id}/submit")]
        public async Task<ActionResult<ApiResponse<bool>>> Submit(int id)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();

            var inward = await _context.Inwards
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .Include(i => i.Location)
                .FirstOrDefaultAsync(i => i.Id == id);
            if (inward == null) return NotFound();
            if (inward.Status != InwardStatus.Draft)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft inwards can be submitted." });

            foreach (var line in inward.Lines)
            {
                var movement = new Movement
                {
                    Type = MovementType.Inward,
                    ItemId = line.ItemId,
                    FromType = HolderType.Vendor,
                    FromPartyId = inward.VendorId,
                    ToType = HolderType.Location,
                    ToLocationId = inward.LocationId,
                    ToPartyId = null,
                    Remarks = inward.Remarks,
                    PurchaseOrderId = inward.SourceType == InwardSourceType.PO ? inward.SourceRefId : null,
                    InwardId = inward.Id,
                    IsQCPending = true,
                    IsQCApproved = false,
                    CreatedBy = CurrentUserId,
                    CreatedAt = DateTime.Now
                };
                _context.Movements.Add(movement);
                await _context.SaveChangesAsync();
                line.MovementId = movement.Id;
            }

            inward.Status = InwardStatus.Submitted;
            inward.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private void ValidateSourceRef(InwardSourceType sourceType, int sourceRefId, out int? vendorId)
        {
            vendorId = null;
            if (sourceType == InwardSourceType.PO)
            {
                var po = _context.PurchaseOrders.FirstOrDefault(p => p.Id == sourceRefId);
                if (po == null) throw new ArgumentException("Invalid PO reference.");
                vendorId = po.VendorId;
            }
            else if (sourceType == InwardSourceType.OutwardReturn)
            {
                var mov = _context.Movements.FirstOrDefault(m => m.Id == sourceRefId && m.Type == MovementType.Outward);
                if (mov == null) throw new ArgumentException("Invalid Outward movement reference.");
                vendorId = mov.ToPartyId;
            }
            else if (sourceType == InwardSourceType.JobWork)
            {
                if (!_context.JobWorks.Any(j => j.Id == sourceRefId))
                    throw new ArgumentException("Invalid Job Work reference.");
            }
        }

        private static InwardDto MapToDto(Inward i)
        {
            var dto = new InwardDto
            {
                Id = i.Id,
                InwardNo = i.InwardNo,
                InwardDate = i.InwardDate,
                SourceType = i.SourceType,
                SourceRefId = i.SourceRefId,
                LocationId = i.LocationId,
                LocationName = i.Location?.Name,
                VendorId = i.VendorId,
                VendorName = i.Vendor?.Name,
                Remarks = i.Remarks,
                Status = i.Status,
                CreatedBy = i.CreatedBy,
                CreatorName = i.Creator != null ? i.Creator.FirstName + " " + i.Creator.LastName : null,
                CreatedAt = i.CreatedAt,
                Lines = i.Lines.Select(l => new InwardLineDto
                {
                    Id = l.Id,
                    InwardId = l.InwardId,
                    ItemId = l.ItemId,
                    ItemName = l.Item?.CurrentName,
                    MainPartName = l.Item?.MainPartName,
                    Quantity = l.Quantity,
                    MovementId = l.MovementId,
                    IsQCPending = l.Movement?.IsQCPending ?? false,
                    IsQCApproved = l.Movement?.IsQCApproved ?? false
                }).ToList()
            };
            dto.SourceRefDisplay = i.SourceType == InwardSourceType.PO ? $"PO-{i.SourceRefId}" : i.SourceType == InwardSourceType.OutwardReturn ? $"Outward #{i.SourceRefId}" : i.SourceType == InwardSourceType.JobWork ? $"JW-{i.SourceRefId}" : i.SourceRefId.ToString();
            return dto;
        }
    }
}
