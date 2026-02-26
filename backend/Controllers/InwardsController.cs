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
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("INWARD", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<InwardDto>>>> GetAll(
            [FromQuery] InwardSourceType? sourceType,
            [FromQuery] InwardStatus? status)
        {
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.Inwards
                .Where(i => i.LocationId == locationId)
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
            var locationId = await GetCurrentLocationIdAsync();
            var inward = await _context.Inwards
                .Include(i => i.Location)
                .Include(i => i.Vendor)
                .Include(i => i.Creator)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Movement)
                .FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (inward == null) return NotFound();
            return Ok(new ApiResponse<InwardDto> { Data = MapToDto(inward) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Inward>>> Create([FromBody] CreateInwardDto dto)
        {
            if (!await HasPermission("CreateInward")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            int? vid = null;
            try { vid = await ValidateSourceRefAsync(locationId, dto.SourceType, dto.SourceRefId); }
            catch (ArgumentException ex) { return BadRequest(new ApiResponse<Inward> { Success = false, Message = ex.Message }); }
            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one line is required." });

            var inward = new Inward
            {
                InwardNo = await _codeGenerator.GenerateCode("INWARD", locationId),
                InwardDate = dto.InwardDate ?? DateTime.Now.Date,
                SourceType = dto.SourceType,
                SourceRefId = dto.SourceRefId,
                LocationId = locationId,
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
            var locationId = await GetCurrentLocationIdAsync();

            var inward = await _context.Inwards.Include(i => i.Lines).FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
            if (inward == null) return NotFound();
            if (inward.Status != InwardStatus.Draft)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Only draft inwards can be edited." });

            int? vid = null;
            try { vid = await ValidateSourceRefAsync(locationId, dto.SourceType, dto.SourceRefId); }
            catch (ArgumentException ex) { return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message }); }
            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one line is required." });

            inward.InwardDate = dto.InwardDate ?? inward.InwardDate;
            inward.SourceType = dto.SourceType;
            inward.SourceRefId = dto.SourceRefId;
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
            var locationId = await GetCurrentLocationIdAsync();

            var inward = await _context.Inwards
                .Include(i => i.Lines)
                    .ThenInclude(l => l.Item)
                .Include(i => i.Location)
                .FirstOrDefaultAsync(i => i.Id == id && i.LocationId == locationId);
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

        private async Task<int?> ValidateSourceRefAsync(int locationId, InwardSourceType sourceType, int sourceRefId)
        {
            int? vendorId = null;
            if (sourceType == InwardSourceType.PO)
            {
                var po = await _context.PurchaseOrders.Include(p => p.Items).ThenInclude(i => i.PurchaseIndentItem).FirstOrDefaultAsync(p => p.Id == sourceRefId && p.LocationId == locationId);
                if (po == null) throw new ArgumentException("Invalid PO reference or PO not in current location.");
                if (po.Status != PoStatus.Approved) throw new ArgumentException("Only approved POs can be used for Inward.");
                if (!po.IsActive) throw new ArgumentException("Inactive POs cannot be used for Inward.");
                var poItemIds = po.Items.Where(poi => poi.PurchaseIndentItem != null).Select(poi => poi.PurchaseIndentItem!.ItemId).ToHashSet();
                var submittedInwardIds = await _context.Inwards
                    .Where(i => i.SourceType == InwardSourceType.PO && i.SourceRefId == sourceRefId && i.Status == InwardStatus.Submitted)
                    .Select(i => i.Id)
                    .ToListAsync();
                var inwardedFromPo = await _context.InwardLines
                    .Where(l => submittedInwardIds.Contains(l.InwardId))
                    .Select(l => l.ItemId)
                    .ToListAsync();
                var inwardedSet = inwardedFromPo.ToHashSet();
                if (poItemIds.Count > 0 && poItemIds.All(id => inwardedSet.Contains(id)))
                    throw new ArgumentException("This PO is already fully inwarded.");
                vendorId = po.VendorId;
            }
            else if (sourceType == InwardSourceType.OutwardReturn)
            {
                var mov = await _context.Movements.FirstOrDefaultAsync(m => m.Id == sourceRefId && m.Type == MovementType.Outward);
                if (mov == null) throw new ArgumentException("Invalid Outward movement reference.");
                var alreadyInwarded = await _context.Inwards.AnyAsync(i => i.SourceType == InwardSourceType.OutwardReturn && i.SourceRefId == sourceRefId && i.Status == InwardStatus.Submitted);
                if (alreadyInwarded) throw new ArgumentException("This Outward challan has already been inwarded.");
                vendorId = mov.ToPartyId;
            }
            else if (sourceType == InwardSourceType.JobWork)
            {
                var jw = await _context.JobWorks.FirstOrDefaultAsync(j => j.Id == sourceRefId && j.LocationId == locationId);
                if (jw == null) throw new ArgumentException("Invalid Job Work reference or not in current location.");
                if (jw.Status != JobWorkStatus.Pending) throw new ArgumentException("Only pending Job Work entries (not yet inwarded) can be used for Inward.");
                var alreadyInwarded = await _context.Inwards.AnyAsync(i => i.SourceType == InwardSourceType.JobWork && i.SourceRefId == sourceRefId && i.Status == InwardStatus.Submitted);
                if (alreadyInwarded) throw new ArgumentException("This Job Work has already been inwarded.");
            }
            return vendorId;
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
