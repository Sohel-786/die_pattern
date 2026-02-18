using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;
using backend.DTOs;

namespace backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PatternDiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IExcelService _excelService;

        public PatternDiesController(ApplicationDbContext context, IExcelService excelService)
        {
            _context = context;
            _excelService = excelService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PatternDie>>> GetPatternDies()
        {
            return await _context.PatternDies
                .Include(p => p.Type)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentVendor)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PatternDie>> GetPatternDie(int id)
        {
            var patternDie = await _context.PatternDies
                .Include(p => p.Type)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentVendor)
                .Include(p => p.ChangeHistories)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (patternDie == null)
            {
                return NotFound();
            }

            return patternDie;
        }

        [HttpPost]
        public async Task<ActionResult<PatternDie>> PostPatternDie(PatternDie patternDie)
        {
            // MainPartName is permanent
            patternDie.CreatedAt = DateTime.Now;
            patternDie.UpdatedAt = DateTime.Now;
            
            // If it's a new entry, CurrentName = MainPartName initially or as provided
            if (string.IsNullOrEmpty(patternDie.CurrentName))
            {
                patternDie.CurrentName = patternDie.MainPartName;
            }

            _context.PatternDies.Add(patternDie);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPatternDie), new { id = patternDie.Id }, patternDie);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutPatternDie(int id, PatternDie patternDie)
        {
            if (id != patternDie.Id)
            {
                return BadRequest();
            }

            var existing = await _context.PatternDies.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (existing == null)
            {
                return NotFound();
            }

            // ENFORCE RULES:
            // 1. MainPartName never editable
            patternDie.MainPartName = existing.MainPartName;
            
            // 2. CurrentName editable only via change process (I'll allow it here for now, but usually it should be a separate endpoint)
            // Actually, requirements say: "Current Name (Editable only via Change Process)"
            // So I should block it here.
            patternDie.CurrentName = existing.CurrentName;

            patternDie.UpdatedAt = DateTime.Now;
            _context.Entry(patternDie).State = EntityState.Modified;
            _context.Entry(patternDie).Property(x => x.CreatedAt).IsModified = false;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PatternDieExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<ChangeHistory>>> GetHistory()
        {
            return await _context.ChangeHistories
                .Include(h => h.PatternDie)
                .Include(h => h.Changer)
                .OrderByDescending(h => h.ChangedAt)
                .ToListAsync();
        }

        [HttpPost("{id}/change")]
        public async Task<IActionResult> ChangePatternDie(int id, [FromBody] ChangeHistory change)
        {
            var patternDie = await _context.PatternDies.FindAsync(id);
            if (patternDie == null)
            {
                return NotFound();
            }

            // Record history
            change.PatternDieId = id;
            change.PreviousName = patternDie.CurrentName;
            change.PreviousRevision = patternDie.RevisionNo ?? "";
            change.ChangedAt = DateTime.Now;
            change.ChangedBy = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "0");

            _context.ChangeHistories.Add(change);

            // Update PatternDie
            patternDie.CurrentName = change.NewName;
            patternDie.RevisionNo = change.NewRevision;
            patternDie.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();

            return Ok(patternDie);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePatternDie(int id)
        {
            var patternDie = await _context.PatternDies.FindAsync(id);
            if (patternDie == null)
            {
                return NotFound();
            }

            _context.PatternDies.Remove(patternDie);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("validate-opening")]
        public async Task<ActionResult<ValidationResultDto<PatternDieOpeningImportDto>>> ValidateOpening(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");
            
            using var stream = file.OpenReadStream();
            var importResult = _excelService.ImportExcel<PatternDieOpeningImportDto>(stream);
            var validation = await PerformValidation(importResult.Data);
            validation.TotalRows = importResult.TotalRows;
            
            return Ok(validation);
        }

        [HttpPost("import-opening")]
        public async Task<ActionResult<object>> ImportOpening(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");
            
            using var stream = file.OpenReadStream();
            var importResult = _excelService.ImportExcel<PatternDieOpeningImportDto>(stream);
            var validation = await PerformValidation(importResult.Data);
            
            var newPatterns = new List<PatternDie>();
            
            var types = await _context.TypeMasters.ToDictionaryAsync(t => t.Name.ToLower(), t => t.Id);
            var materials = await _context.MaterialMasters.ToDictionaryAsync(m => m.Name.ToLower(), m => m.Id);
            var owners = await _context.OwnerTypeMasters.ToDictionaryAsync(o => o.Name.ToLower(), o => o.Id);
            var statuses = await _context.StatusMasters.ToDictionaryAsync(s => s.Name.ToLower(), s => s.Id);
            var locations = await _context.Locations.ToDictionaryAsync(l => l.Name.ToLower(), l => l.Id);
            var vendors = await _context.Parties.ToDictionaryAsync(v => v.Name.ToLower(), v => v.Id);

            foreach (var entry in validation.Valid)
            {
                var dto = entry.Data;
                newPatterns.Add(new PatternDie
                {
                    MainPartName = dto.MainPartName.Trim(),
                    CurrentName = string.IsNullOrEmpty(dto.CurrentName) ? dto.MainPartName.Trim() : dto.CurrentName.Trim(),
                    TypeId = types[dto.Type.ToLower()],
                    MaterialId = materials[dto.Material.ToLower()],
                    OwnerTypeId = owners[dto.OwnerType.ToLower()],
                    StatusId = statuses[dto.Status.ToLower()],
                    CurrentLocationId = locations[dto.CurrentLocation.ToLower()],
                    CurrentVendorId = !string.IsNullOrEmpty(dto.CurrentVendor) && vendors.ContainsKey(dto.CurrentVendor.ToLower()) 
                                      ? vendors[dto.CurrentVendor.ToLower()] : null,
                    DrawingNo = dto.DrawingNo,
                    RevisionNo = dto.RevisionNo,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
            }

            if (newPatterns.Any())
            {
                _context.PatternDies.AddRange(newPatterns);
                await _context.SaveChangesAsync();
            }

            return Ok(new 
            { 
                Imported = newPatterns.Count, 
                TotalRows = importResult.TotalRows,
                Errors = validation.Invalid.Count + validation.Duplicates.Count + validation.AlreadyExists.Count
            });
        }

        private async Task<ValidationResultDto<PatternDieOpeningImportDto>> PerformValidation(List<ExcelRow<PatternDieOpeningImportDto>> rows)
        {
            var result = new ValidationResultDto<PatternDieOpeningImportDto>();
            
            var existingNames = await _context.PatternDies.Select(p => p.MainPartName.ToLower()).ToListAsync();
            var types = await _context.TypeMasters.Select(t => t.Name.ToLower()).ToListAsync();
            var materials = await _context.MaterialMasters.Select(m => m.Name.ToLower()).ToListAsync();
            var owners = await _context.OwnerTypeMasters.Select(o => o.Name.ToLower()).ToListAsync();
            var statuses = await _context.StatusMasters.Select(s => s.Name.ToLower()).ToListAsync();
            var locations = await _context.Locations.Select(l => l.Name.ToLower()).ToListAsync();
            var vendors = await _context.Parties.Select(v => v.Name.ToLower()).ToListAsync();

            var processedNames = new HashSet<string>();

            foreach (var row in rows)
            {
                var dto = row.Data;
                var errors = new List<string>();

                if (string.IsNullOrEmpty(dto.MainPartName)) errors.Add("Main Part Name is required");
                if (string.IsNullOrEmpty(dto.Type)) errors.Add("Type is required");
                if (string.IsNullOrEmpty(dto.Material)) errors.Add("Material is required");
                if (string.IsNullOrEmpty(dto.OwnerType)) errors.Add("Owner Type is required");
                if (string.IsNullOrEmpty(dto.Status)) errors.Add("Status is required");
                if (string.IsNullOrEmpty(dto.CurrentLocation)) errors.Add("Current Location is required");

                if (errors.Any())
                {
                    result.Invalid.Add(new ValidationEntry<PatternDieOpeningImportDto> { Row = row.RowNumber, Data = dto, Message = string.Join(", ", errors) });
                    continue;
                }

                var nameLower = dto.MainPartName.Trim().ToLower();

                // Check dependencies
                if (!types.Contains(dto.Type.ToLower())) errors.Add($"Type '{dto.Type}' not found");
                if (!materials.Contains(dto.Material.ToLower())) errors.Add($"Material '{dto.Material}' not found");
                if (!owners.Contains(dto.OwnerType.ToLower())) errors.Add($"Owner Type '{dto.OwnerType}' not found");
                if (!statuses.Contains(dto.Status.ToLower())) errors.Add($"Status '{dto.Status}' not found");
                if (!locations.Contains(dto.CurrentLocation.ToLower())) errors.Add($"Location '{dto.CurrentLocation}' not found");
                if (!string.IsNullOrEmpty(dto.CurrentVendor) && !vendors.Contains(dto.CurrentVendor.ToLower())) errors.Add($"Vendor '{dto.CurrentVendor}' not found");

                if (errors.Any())
                {
                    result.Invalid.Add(new ValidationEntry<PatternDieOpeningImportDto> { Row = row.RowNumber, Data = dto, Message = string.Join(", ", errors) });
                    continue;
                }

                if (processedNames.Contains(nameLower))
                {
                    result.Duplicates.Add(new ValidationEntry<PatternDieOpeningImportDto> { Row = row.RowNumber, Data = dto, Message = "Duplicate in file" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    result.AlreadyExists.Add(new ValidationEntry<PatternDieOpeningImportDto> { Row = row.RowNumber, Data = dto, Message = "Already exists in database" });
                    processedNames.Add(nameLower);
                    continue;
                }

                result.Valid.Add(new ValidationEntry<PatternDieOpeningImportDto> { Row = row.RowNumber, Data = dto });
                processedNames.Add(nameLower);
            }

            return result;
        }

        private bool PatternDieExists(int id)
        {
            return _context.PatternDies.Any(e => e.Id == id);
        }
    }
}
