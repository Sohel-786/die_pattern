using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("items")]
    [ApiController]
    public class ItemsController : BaseController
    {
        private readonly IExcelService _excelService;

        public ItemsController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int? itemTypeId,
            [FromQuery] int? materialId,
            [FromQuery] int? ownerTypeId,
            [FromQuery] int? statusId)
        {
            if (!await HasPermission("ManageItem")) return Forbidden();

            var query = _context.Items
                .Include(p => p.ItemType)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .AsQueryable();

            if (isActive.HasValue)
                query = query.Where(p => p.IsActive == isActive.Value);

            if (itemTypeId.HasValue && itemTypeId.Value > 0)
                query = query.Where(p => p.ItemTypeId == itemTypeId.Value);

            if (materialId.HasValue && materialId.Value > 0)
                query = query.Where(p => p.MaterialId == materialId.Value);

            if (ownerTypeId.HasValue && ownerTypeId.Value > 0)
                query = query.Where(p => p.OwnerTypeId == ownerTypeId.Value);

            if (statusId.HasValue && statusId.Value > 0)
                query = query.Where(p => p.StatusId == statusId.Value);

            if (!string.IsNullOrEmpty(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(p => 
                    p.MainPartName.ToLower().Contains(s) || 
                    p.CurrentName.ToLower().Contains(s) || 
                    (p.DrawingNo != null && p.DrawingNo.ToLower().Contains(s)));
            }

            var data = await query
                .Select(p => new ItemDto
                {
                    Id = p.Id,
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    ItemTypeId = p.ItemTypeId,
                    ItemTypeName = p.ItemType!.Name,
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

            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemDto>>>> GetActive()
        {
            var data = await _context.Items
                .Include(p => p.ItemType)
                .Include(p => p.Material)
                .Include(p => p.OwnerType)
                .Include(p => p.Status)
                .Include(p => p.CurrentLocation)
                .Include(p => p.CurrentParty)
                .Where(p => p.IsActive && !string.IsNullOrEmpty(p.DrawingNo))
                .Select(p => new ItemDto
                {
                    Id = p.Id,
                    MainPartName = p.MainPartName,
                    CurrentName = p.CurrentName,
                    ItemTypeId = p.ItemTypeId,
                    ItemTypeName = p.ItemType!.Name,
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

            return Ok(new ApiResponse<IEnumerable<ItemDto>> { Data = data });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Item>>> Create([FromBody] CreateItemDto dto)
        {
            if (!await HasPermission("ManageItem")) return Forbidden();

            if (await _context.Items.AnyAsync(p => p.MainPartName.ToLower() == dto.MainPartName.Trim().ToLower()))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Main Part Name must be unique" });
            
            if (!string.IsNullOrEmpty(dto.DrawingNo) && await _context.Items.AnyAsync(p => p.DrawingNo != null && p.DrawingNo.ToLower() == dto.DrawingNo.Trim().ToLower()))
                return BadRequest(new ApiResponse<Item> { Success = false, Message = "Drawing Number must be unique" });

            var item = new Item
            {
                MainPartName = dto.MainPartName.Trim(),
                CurrentName = dto.CurrentName.Trim(),
                ItemTypeId = dto.ItemTypeId,
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

            _context.Items.Add(item);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Item> { Data = item });
        }

        [HttpPost("change-process")]
        public async Task<ActionResult<ApiResponse<Item>>> ChangeProcess([FromBody] ItemChangeRequestDto dto)
        {
            if (!await HasPermission("ManageChanges")) return Forbidden();

            var item = await _context.Items.FindAsync(dto.ItemId);
            if (item == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            // Store history
            var log = new ItemChangeLog
            {
                ItemId = item.Id,
                OldName = item.CurrentName,
                NewName = dto.NewName,
                OldRevision = item.RevisionNo ?? "",
                NewRevision = dto.NewRevision,
                ChangeType = dto.ChangeType,
                Remarks = dto.Remarks,
                CreatedBy = CurrentUserId,
                CreatedAt = DateTime.Now
            };

            // Update current
            item.CurrentName = dto.NewName;
            item.RevisionNo = dto.NewRevision;
            item.UpdatedAt = DateTime.Now;

            _context.ItemChangeLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<Item> { Data = item, Message = "Change process completed successfully" });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Item>>> Update(int id, [FromBody] UpdateItemDto dto)
        {
            if (!await HasPermission("ManageItem")) return Forbidden();

            if (id != dto.Id) return BadRequest(new ApiResponse<Item> { Success = false, Message = "ID mismatch" });

            var existing = await _context.Items.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Item> { Success = false, Message = "Item not found" });

            if (dto.CurrentName != null)
                existing.CurrentName = dto.CurrentName.Trim();
            if (dto.ItemTypeId > 0)
                existing.ItemTypeId = dto.ItemTypeId;
            if (dto.MaterialId > 0)
                existing.MaterialId = dto.MaterialId;
            if (dto.OwnerTypeId > 0)
                existing.OwnerTypeId = dto.OwnerTypeId;
            if (dto.StatusId > 0)
                existing.StatusId = dto.StatusId;
            if (dto.DrawingNo != null)
            {
                var drawingTrim = dto.DrawingNo.Trim();
                if (drawingTrim != existing.DrawingNo)
                {
                    if (await _context.Items.AnyAsync(p => p.Id != id && p.DrawingNo != null && p.DrawingNo.ToLower() == drawingTrim.ToLower()))
                        return BadRequest(new ApiResponse<Item> { Success = false, Message = "Drawing Number already exists" });
                    existing.DrawingNo = drawingTrim;
                }
            }
            if (dto.RevisionNo != null)
                existing.RevisionNo = dto.RevisionNo.Trim();
            existing.CurrentHolderType = dto.CurrentHolderType;
            existing.CurrentLocationId = dto.CurrentHolderType == HolderType.Location && dto.CurrentLocationId > 0 ? dto.CurrentLocationId : null;
            existing.CurrentPartyId = dto.CurrentHolderType == HolderType.Vendor && dto.CurrentPartyId > 0 ? dto.CurrentPartyId : null;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Item> { Data = existing });
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            if (!await HasPermission("ManageItem")) return Forbidden();

            var items = await _context.Items
                .Include(i => i.ItemType)
                .Include(i => i.Material)
                .Include(i => i.OwnerType)
                .Include(i => i.Status)
                .Include(i => i.CurrentLocation)
                .Include(i => i.CurrentParty)
                .ToListAsync();

            var data = items.Select(i => new {
                PartName = i.MainPartName,
                DisplayName = i.CurrentName,
                AssetType = i.ItemType?.Name,
                DrawingNo = i.DrawingNo,
                Revision = i.RevisionNo,
                Material = i.Material?.Name,
                Ownership = i.OwnerType?.Name,
                Status = i.Status?.Name,
                CustodianType = i.CurrentHolderType.ToString(),
                CustodianName = i.CurrentHolderType == HolderType.Location ? i.CurrentLocation?.Name : i.CurrentParty?.Name
            });

            var file = _excelService.GenerateExcel(data, "Die Pattern Masters");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "die_pattern_masters.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<ItemImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");
            using var stream = file.OpenReadStream();
            var excelResult = _excelService.ImportExcel<ItemImportDto>(stream);
            var validation = await ValidateImport(excelResult.Data);
            validation.TotalRows = excelResult.TotalRows;
            return Ok(new ApiResponse<ValidationResultDto<ItemImportDto>> { Data = validation });
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasPermission("ManageItem")) return Forbidden();
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");

            using var stream = file.OpenReadStream();
            var excelResult = _excelService.ImportExcel<ItemImportDto>(stream);
            var validation = await ValidateImport(excelResult.Data);

            if (validation.Valid.Any())
            {
                foreach (var row in validation.Valid)
                {
                    var type = await _context.ItemTypes.FirstOrDefaultAsync(t => t.Name == row.Data.AssetType);
                    var material = await _context.Materials.FirstOrDefaultAsync(m => m.Name == row.Data.Material);
                    var ownerType = await _context.OwnerTypes.FirstOrDefaultAsync(o => o.Name == row.Data.Ownership);
                    var status = await _context.ItemStatuses.FirstOrDefaultAsync(s => s.Name == row.Data.Status);
                    
                    int? locationId = null;
                    int? partyId = null;

                    if (row.Data.CustodianType == "Location")
                        locationId = (await _context.Locations.FirstOrDefaultAsync(l => l.Name == row.Data.CustodianName))?.Id;
                    else
                        partyId = (await _context.Parties.FirstOrDefaultAsync(p => p.Name == row.Data.CustodianName))?.Id;

                    _context.Items.Add(new Item
                    {
                        MainPartName = row.Data.PartName.Trim(),
                        CurrentName = !string.IsNullOrEmpty(row.Data.DisplayName) ? row.Data.DisplayName.Trim() : row.Data.PartName.Trim(),
                        ItemTypeId = type?.Id ?? 0,
                        DrawingNo = row.Data.DrawingNo?.Trim(),
                        RevisionNo = row.Data.Revision?.Trim() ?? "0",
                        MaterialId = material?.Id ?? 0,
                        OwnerTypeId = ownerType?.Id ?? 0,
                        StatusId = status?.Id ?? 0,
                        CurrentHolderType = row.Data.CustodianType.Equals("Location", StringComparison.OrdinalIgnoreCase) ? HolderType.Location : HolderType.Vendor,
                        CurrentLocationId = locationId,
                        CurrentPartyId = partyId,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now,
                        IsActive = true
                    });
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<object> { 
                Data = new { imported = validation.Valid.Count, totalRows = excelResult.TotalRows }, 
                Message = $"{validation.Valid.Count} records imported successfully" 
            });
        }

        private async Task<ValidationResultDto<ItemImportDto>> ValidateImport(List<ExcelRow<ItemImportDto>> rows)
        {
            var result = new ValidationResultDto<ItemImportDto>();
            var existingNames = await _context.Items.Select(p => p.MainPartName.ToLower()).ToListAsync();
            var existingDrawingNos = await _context.Items
                .Where(p => !string.IsNullOrEmpty(p.DrawingNo))
                .Select(p => p.DrawingNo!.ToLower())
                .ToListAsync();
            
            var types = await _context.ItemTypes.Select(t => t.Name.ToLower()).ToListAsync();
            var materials = await _context.Materials.Select(m => m.Name.ToLower()).ToListAsync();
            var ownerTypes = await _context.OwnerTypes.Select(o => o.Name.ToLower()).ToListAsync();
            var statuses = await _context.ItemStatuses.Select(s => s.Name.ToLower()).ToListAsync();
            
            var batchMainPartNames = new HashSet<string>();
            var batchDrawingNos = new HashSet<string>();

            // Fetch lookup data for validation
            var locationNames = await _context.Locations.Select(l => l.Name.ToLower()).ToListAsync();
            var partyNames = await _context.Parties.Select(p => p.Name.ToLower()).ToListAsync();

            foreach (var row in rows)
            {
                var d = row.Data;
                var errors = new List<string>();

                if (string.IsNullOrEmpty(d.PartName)) 
                {
                    errors.Add("Part Name is required");
                }
                else 
                {
                    var mainPartNameLower = d.PartName.Trim().ToLower();
                    if (existingNames.Contains(mainPartNameLower) || batchMainPartNames.Contains(mainPartNameLower)) 
                        errors.Add("Part Name already exists");
                    else 
                        batchMainPartNames.Add(mainPartNameLower);
                }
                
                if (!string.IsNullOrEmpty(d.DrawingNo))
                {
                    var drawingNoLower = d.DrawingNo.Trim().ToLower();
                    if (existingDrawingNos.Contains(drawingNoLower) || batchDrawingNos.Contains(drawingNoLower))
                        errors.Add("Drawing Number already exists");
                    else
                        batchDrawingNos.Add(drawingNoLower);
                }
                
                if (string.IsNullOrEmpty(d.AssetType) || !types.Contains(d.AssetType.ToLower())) errors.Add("Invalid Asset Type");
                if (string.IsNullOrEmpty(d.Material) || !materials.Contains(d.Material.ToLower())) errors.Add("Invalid Material");
                if (string.IsNullOrEmpty(d.Ownership) || !ownerTypes.Contains(d.Ownership.ToLower())) errors.Add("Invalid Ownership");
                if (string.IsNullOrEmpty(d.Status) || !statuses.Contains(d.Status.ToLower())) errors.Add("Invalid Status");

                // Custodian Validation
                if (string.IsNullOrEmpty(d.CustodianType))
                {
                    errors.Add("Custodian Type is required (Location / Vendor)");
                }
                else
                {
                    var cType = d.CustodianType.Trim().ToLower();
                    if (cType != "location" && cType != "vendor")
                    {
                        errors.Add("Custodian Type must be 'Location' or 'Vendor'");
                    }
                    else if (string.IsNullOrEmpty(d.CustodianName))
                    {
                        errors.Add("Custodian Name is required");
                    }
                    else
                    {
                        var cName = d.CustodianName.Trim().ToLower();
                        if (cType == "location" && !locationNames.Contains(cName))
                            errors.Add($"Location '{d.CustodianName}' not found");
                        else if (cType == "vendor" && !partyNames.Contains(cName))
                            errors.Add($"Vendor/Party '{d.CustodianName}' not found");
                    }
                }

                if (errors.Any())
                    result.Invalid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d, Message = string.Join(", ", errors) });
                else
                    result.Valid.Add(new ValidationEntry<ItemImportDto> { Row = row.RowNumber, Data = d });
            }

            return result;
        }
    }
}
