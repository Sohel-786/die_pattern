using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("pattern-dies")]
    [ApiController]
    public class PatternDiesController : BaseController
    {
        private readonly IExcelService _excelService;

        public PatternDiesController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<PatternDieDto>>>> GetAll()
        {
            var data = await _context.PatternDies
                .Include(p => p.PatternType)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .Select(p => new PatternDieDto
                {
                    Id = p.Id,
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    PatternTypeId = p.PatternTypeId,
                    PatternTypeName = p.PatternType!.Name,
                    DrawingNo = p.DrawingNo,
                    RevisionNo = p.RevisionNo,
                    MaterialId = p.MaterialId,
                    MaterialName = p.Material!.Name,
                    OwnerTypeId = p.OwnerTypeId,
                    OwnerTypeName = p.OwnerType!.Name,
                    StatusId = p.StatusId,
                    StatusName = p.Status!.Name,
                    CurrentHolderType = p.CurrentHolderType,
                    CurrentLocationId = p.CurrentLocationId,
                    CurrentLocationName = p.CurrentLocation != null ? p.CurrentLocation.Name : null,
                    CurrentPartyId = p.CurrentPartyId,
                    CurrentPartyName = p.CurrentParty != null ? p.CurrentParty.Name : null,
                    IsActive = p.IsActive
                })
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<PatternDieDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<PatternDie>>> Create([FromBody] CreatePatternDieDto dto)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (await _context.PatternDies.AnyAsync(p => p.MainPartName.ToLower() == dto.MainPartName.Trim().ToLower()))
                return BadRequest(new ApiResponse<PatternDie> { Success = false, Message = "Main Part Name must be unique" });

            var patternDie = new PatternDie
            {
                MainPartName = dto.MainPartName.Trim(),
                CurrentName = dto.CurrentName.Trim(),
                PatternTypeId = dto.PatternTypeId,
                DrawingNo = dto.DrawingNo,
                RevisionNo = dto.RevisionNo,
                MaterialId = dto.MaterialId,
                OwnerTypeId = dto.OwnerTypeId,
                StatusId = dto.StatusId,
                CurrentHolderType = dto.CurrentHolderType,
                CurrentLocationId = dto.CurrentLocationId,
                CurrentPartyId = dto.CurrentPartyId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.PatternDies.Add(patternDie);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<PatternDie> { Data = patternDie });
        }

        [HttpPost("change-process")]
        public async Task<ActionResult<ApiResponse<PatternDie>>> ChangeProcess([FromBody] PatternChangeRequestDto dto)
        {
            if (!await HasPermission("ManageChanges")) return Forbidden();

            var patternDie = await _context.PatternDies.FindAsync(dto.PatternDieId);
            if (patternDie == null) return NotFound(new ApiResponse<PatternDie> { Success = false, Message = "Pattern/Die not found" });

            // Store history
            var log = new PatternChangeLog
            {
                PatternDieId = patternDie.Id,
                OldName = patternDie.CurrentName,
                NewName = dto.NewName,
                OldRevision = patternDie.RevisionNo ?? "",
                NewRevision = dto.NewRevision,
                ChangeType = dto.ChangeType,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            };

            // Update current
            patternDie.CurrentName = dto.NewName;
            patternDie.RevisionNo = dto.NewRevision;
            patternDie.UpdatedAt = DateTime.Now;

            _context.PatternChangeLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<PatternDie> { Data = patternDie, Message = "Change process completed successfully" });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<PatternDie>>> Update(int id, [FromBody] UpdatePatternDieDto dto)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (id != dto.Id) return BadRequest(new ApiResponse<PatternDie> { Success = false, Message = "ID mismatch" });

            var existing = await _context.PatternDies.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<PatternDie> { Success = false, Message = "Pattern/Die not found" });

            existing.StatusId = dto.StatusId;
            existing.DrawingNo = dto.DrawingNo;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<PatternDie> { Data = existing });
        }

        [HttpPost("import-opening")]
        public async Task<ActionResult<ApiResponse<object>>> ImportOpening(IFormFile file)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (file == null || file.Length == 0) return BadRequest("No file uploaded");

            using var stream = file.OpenReadStream();
            var excelResult = _excelService.ImportExcel<PatternDieImportDto>(stream);
            
            // Strict Validation
            var validation = await ValidateImport(excelResult.Data);
            
            if (validation.Valid.Any())
            {
                foreach (var row in validation.Valid)
                {
                    // Map names to IDs
                    var type = await _context.PatternTypes.FirstOrDefaultAsync(t => t.Name == row.Data.PatternType);
                    var material = await _context.Materials.FirstOrDefaultAsync(m => m.Name == row.Data.Material);
                    var ownerType = await _context.OwnerTypes.FirstOrDefaultAsync(o => o.Name == row.Data.OwnerType);
                    var status = await _context.PatternStatuses.FirstOrDefaultAsync(s => s.Name == row.Data.Status);
                    
                    int? locationId = null;
                    int? partyId = null;

                    if (row.Data.CurrentHolderType == "Location")
                        locationId = (await _context.Locations.FirstOrDefaultAsync(l => l.Name == row.Data.CurrentHolderName))?.Id;
                    else
                        partyId = (await _context.Parties.FirstOrDefaultAsync(p => p.Name == row.Data.CurrentHolderName))?.Id;

                    _context.PatternDies.Add(new PatternDie
                    {
                        MainPartName = row.Data.MainPartName,
                        CurrentName = row.Data.CurrentName,
                        PatternTypeId = type?.Id ?? 0,
                        DrawingNo = row.Data.DrawingNo,
                        RevisionNo = row.Data.RevisionNo,
                        MaterialId = material?.Id ?? 0,
                        OwnerTypeId = ownerType?.Id ?? 0,
                        StatusId = status?.Id ?? 0,
                        CurrentHolderType = row.Data.CurrentHolderType == "Location" ? HolderType.Location : HolderType.Vendor,
                        CurrentLocationId = locationId,
                        CurrentPartyId = partyId,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<object> { 
                Data = validation, 
                Message = $"{validation.Valid.Count} records imported" 
            });
        }

        private async Task<ValidationResultDto<PatternDieImportDto>> ValidateImport(List<ExcelRow<PatternDieImportDto>> rows)
        {
            var result = new ValidationResultDto<PatternDieImportDto>();
            var existingNames = await _context.PatternDies.Select(p => p.MainPartName.ToLower()).ToListAsync();
            
            var types = await _context.PatternTypes.Select(t => t.Name.ToLower()).ToListAsync();
            var materials = await _context.Materials.Select(m => m.Name.ToLower()).ToListAsync();
            var ownerTypes = await _context.OwnerTypes.Select(o => o.Name.ToLower()).ToListAsync();
            var statuses = await _context.PatternStatuses.Select(s => s.Name.ToLower()).ToListAsync();

            foreach (var row in rows)
            {
                var d = row.Data;
                var errors = new List<string>();

                if (string.IsNullOrEmpty(d.MainPartName)) errors.Add("Main Part Name is required");
                if (existingNames.Contains(d.MainPartName.ToLower())) errors.Add("Main Part Name already exists");
                if (!types.Contains(d.PatternType.ToLower())) errors.Add("Invalid Pattern Type");
                if (!materials.Contains(d.Material.ToLower())) errors.Add("Invalid Material");
                if (!ownerTypes.Contains(d.OwnerType.ToLower())) errors.Add("Invalid Owner Type");
                if (!statuses.Contains(d.Status.ToLower())) errors.Add("Invalid Status");

                if (errors.Any())
                    result.Invalid.Add(new ValidationEntry<PatternDieImportDto> { Row = row.RowNumber, Data = d, Message = string.Join(", ", errors) });
                else
                    result.Valid.Add(new ValidationEntry<PatternDieImportDto> { Row = row.RowNumber, Data = d });
            }

            return result;
        }
    }
}
