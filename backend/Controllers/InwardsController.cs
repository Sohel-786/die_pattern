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

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<Inward> { Success = false, Message = "At least one line is required." });

            var inward = new Inward
            {
                InwardNo = await _codeGenerator.GenerateCode("INWARD", locationId),
                InwardDate = dto.InwardDate ?? DateTime.Now.Date,
                LocationId = locationId,
                VendorId = dto.VendorId,
                Remarks = dto.Remarks,
                Status = InwardStatus.Draft,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var l in dto.Lines)
            {
                if (l.Quantity < 1) continue;
                
                // Validate source for each line if provided
                if (l.SourceRefId.HasValue) {
                   try { 
                       var vid = await ValidateSourceRefAsync(locationId, l.SourceType, l.SourceRefId.Value); 
                       if (inward.VendorId == null) inward.VendorId = vid;
                   }
                   catch (ArgumentException ex) { return BadRequest(new ApiResponse<Inward> { Success = false, Message = ex.Message }); }
                }

                inward.Lines.Add(new InwardLine { 
                    ItemId = l.ItemId, 
                    Quantity = l.Quantity,
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks
                });
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

            if (dto.Lines == null || dto.Lines.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one line is required." });

            inward.InwardDate = dto.InwardDate ?? inward.InwardDate;
            inward.VendorId = dto.VendorId;
            inward.Remarks = dto.Remarks;
            inward.UpdatedAt = DateTime.Now;

            _context.InwardLines.RemoveRange(inward.Lines);
            foreach (var l in dto.Lines)
            {
                if (l.Quantity < 1) continue;
                
                if (l.SourceRefId.HasValue) {
                   try { 
                       var vid = await ValidateSourceRefAsync(locationId, l.SourceType, l.SourceRefId.Value); 
                       if (inward.VendorId == null) inward.VendorId = vid;
                   }
                   catch (ArgumentException ex) { return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message }); }
                }

                inward.Lines.Add(new InwardLine { 
                    ItemId = l.ItemId, 
                    Quantity = l.Quantity,
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks
                });
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
                    Remarks = line.Remarks ?? inward.Remarks,
                    PurchaseOrderId = line.SourceType == InwardSourceType.PO ? line.SourceRefId : null,
                    InwardId = inward.Id,
                    IsQCPending = true,
                    IsQCApproved = false,
                    CreatedBy = CurrentUserId,
                    CreatedAt = DateTime.Now
                };
                _context.Movements.Add(movement);
                await _context.SaveChangesAsync();
                line.MovementId = movement.Id;

                // Update source status if necessary
                if (line.SourceType == InwardSourceType.JobWork && line.SourceRefId.HasValue)
                {
                    var jw = await _context.JobWorks.FindAsync(line.SourceRefId.Value);
                    if (jw != null)
                    {
                        jw.Status = JobWorkStatus.Completed;
                        jw.UpdatedAt = DateTime.Now;
                    }
                }
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
                
                var inwardedFromPo = await _context.InwardLines
                    .Where(l => l.SourceType == InwardSourceType.PO && l.SourceRefId == sourceRefId && l.Inward!.Status == InwardStatus.Submitted)
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
                var alreadyInwarded = await _context.InwardLines.AnyAsync(l => l.SourceType == InwardSourceType.OutwardReturn && l.SourceRefId == sourceRefId && l.Inward!.Status == InwardStatus.Submitted);
                if (alreadyInwarded) throw new ArgumentException("This Outward challan has already been inwarded.");
                vendorId = mov.ToPartyId;
            }
            else if (sourceType == InwardSourceType.JobWork)
            {
                var jw = await _context.JobWorks.FirstOrDefaultAsync(j => j.Id == sourceRefId && j.LocationId == locationId);
                if (jw == null) throw new ArgumentException("Invalid Job Work reference or not in current location.");
                if (jw.Status != JobWorkStatus.Pending) throw new ArgumentException("Only pending Job Work entries (not yet inwarded) can be used for Inward.");
                var alreadyInwarded = await _context.InwardLines.AnyAsync(l => l.SourceType == InwardSourceType.JobWork && l.SourceRefId == sourceRefId && l.Inward!.Status == InwardStatus.Submitted);
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
                    SourceType = l.SourceType,
                    SourceRefId = l.SourceRefId,
                    Remarks = l.Remarks,
                    MovementId = l.MovementId,
                    IsQCPending = l.Movement?.IsQCPending ?? false,
                    IsQCApproved = l.Movement?.IsQCApproved ?? false,
                    SourceRefDisplay = l.SourceType == InwardSourceType.PO ? $"PO-{l.SourceRefId}" : l.SourceType == InwardSourceType.OutwardReturn ? $"Outward #{l.SourceRefId}" : l.SourceType == InwardSourceType.JobWork ? $"JW-{l.SourceRefId}" : l.SourceRefId?.ToString()
                }).ToList()
            };
            return dto;
        }
    }
}
