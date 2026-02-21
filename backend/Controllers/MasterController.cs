using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;
using net_backend.DTOs;
using net_backend.Services;

namespace net_backend.Controllers
{
    [ApiController]
    [Route("masters")]
    public class MasterController : BaseController
    {
        private readonly IExcelService _excelService;
        public MasterController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("{type}/export")]
        public async Task<IActionResult> Export(string type)
        {
            IEnumerable<object> data;
            string fileName;

            switch (type.ToLower())
            {
                case "item-types":
                    data = (await _context.ItemTypes.OrderBy(x => x.Name).ToListAsync()).Select(x => new { x.Name, IsActive = x.IsActive ? "Yes" : "No" });
                    fileName = "ItemTypes.xlsx";
                    break;
                case "materials":
                    data = (await _context.Materials.OrderBy(x => x.Name).ToListAsync()).Select(x => new { x.Name, IsActive = x.IsActive ? "Yes" : "No" });
                    fileName = "Materials.xlsx";
                    break;
                case "item-statuses":
                    data = (await _context.ItemStatuses.OrderBy(x => x.Name).ToListAsync()).Select(x => new { x.Name, IsActive = x.IsActive ? "Yes" : "No" });
                    fileName = "ItemStatuses.xlsx";
                    break;
                case "owner-types":
                    data = (await _context.OwnerTypes.OrderBy(x => x.Name).ToListAsync()).Select(x => new { x.Name, IsActive = x.IsActive ? "Yes" : "No" });
                    fileName = "OwnerTypes.xlsx";
                    break;
                default:
                    return BadRequest("Invalid master type");
            }

            var file = _excelService.GenerateExcel(data, type);
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }

        [HttpPost("{type}/validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<MasterImportDto>>>> Validate(string type, IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MasterImportDto>(stream);
                var validation = await ValidateGeneric(type, result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("{type}/import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(string type, IFormFile file)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MasterImportDto>(stream);
                var validation = await ValidateGeneric(type, result.Data);

                int imported = 0;
                foreach (var row in validation.Valid)
                {
                    var name = row.Data.Name.Trim();
                    switch (type.ToLower())
                    {
                        case "item-types": _context.ItemTypes.Add(new ItemType { Name = name, IsActive = true }); break;
                        case "materials": _context.Materials.Add(new Material { Name = name, IsActive = true }); break;
                        case "item-statuses": _context.ItemStatuses.Add(new ItemStatus { Name = name, IsActive = true }); break;
                        case "owner-types": _context.OwnerTypes.Add(new OwnerType { Name = name, IsActive = true }); break;
                    }
                    imported++;
                }

                if (imported > 0) await _context.SaveChangesAsync();

                return Ok(new ApiResponse<object>
                {
                    Data = new { imported, totalRows = result.TotalRows, errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList() },
                    Message = $"{imported} records imported successfully"
                });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" }); }
        }

        private async Task<ValidationResultDto<MasterImportDto>> ValidateGeneric(string type, List<ExcelRow<MasterImportDto>> rows)
        {
            var validation = new ValidationResultDto<MasterImportDto>();
            List<string> existingNames = type.ToLower() switch
            {
                "item-types" => await _context.ItemTypes.Select(x => x.Name.ToLower()).ToListAsync(),
                "materials" => await _context.Materials.Select(x => x.Name.ToLower()).ToListAsync(),
                "item-statuses" => await _context.ItemStatuses.Select(x => x.Name.ToLower()).ToListAsync(),
                "owner-types" => await _context.OwnerTypes.Select(x => x.Name.ToLower()).ToListAsync(),
                _ => new List<string>()
            };

            var processedInFile = new HashSet<string>();
            foreach (var row in rows)
            {
                if (string.IsNullOrWhiteSpace(row.Data.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = row.Data, Message = "Name is mandatory" });
                    continue;
                }
                var nl = row.Data.Name.Trim().ToLower();
                if (processedInFile.Contains(nl))
                {
                    validation.Duplicates.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = row.Data, Message = "Duplicate in file" });
                    continue;
                }
                if (existingNames.Contains(nl))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = row.Data, Message = "Already exists" });
                    processedInFile.Add(nl);
                    continue;
                }
                validation.Valid.Add(new ValidationEntry<MasterImportDto> { Row = row.RowNumber, Data = row.Data });
                processedInFile.Add(nl);
            }
            return validation;
        }

        // Item Types
        [HttpGet("item-types")]
        public async Task<IActionResult> GetItemTypes() => Ok(new { data = await _context.ItemTypes.OrderBy(x => x.Name).ToListAsync() });

        [HttpGet("item-types/active")]
        public async Task<IActionResult> GetActiveItemTypes() => Ok(new { data = await _context.ItemTypes.Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync() });

        [HttpPost("item-types")]
        public async Task<IActionResult> CreateItemType([FromBody] ItemType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            if (await _context.ItemTypes.AnyAsync(x => x.Name.ToLower() == item.Name.Trim().ToLower()))
                return BadRequest(new { Success = false, Message = "Item type name already exists" });
            _context.ItemTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("item-types/{id}")]
        public async Task<IActionResult> UpdateItemType(int id, [FromBody] UpdateMasterRequest request)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.ItemTypes.FindAsync(id);
            if (existing == null) return NotFound();
            
            if (request.Name != null) 
            {
                if (await _context.ItemTypes.AnyAsync(x => x.Id != id && x.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new { Success = false, Message = "Item type name already exists" });
                existing.Name = request.Name.Trim();
            }
            existing.IsActive = request.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("item-types/{id}")]
        public async Task<IActionResult> DeleteItemType(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.ItemTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Item Statuses
        [HttpGet("item-statuses")]
        public async Task<IActionResult> GetItemStatuses() => Ok(new { data = await _context.ItemStatuses.OrderBy(x => x.Name).ToListAsync() });

        [HttpGet("item-statuses/active")]
        public async Task<IActionResult> GetActiveItemStatuses() => Ok(new { data = await _context.ItemStatuses.Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync() });

        [HttpPost("item-statuses")]
        public async Task<IActionResult> CreateItemStatus([FromBody] ItemStatus item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            if (await _context.ItemStatuses.AnyAsync(x => x.Name.ToLower() == item.Name.Trim().ToLower()))
                return BadRequest(new { Success = false, Message = "Item status name already exists" });
            _context.ItemStatuses.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("item-statuses/{id}")]
        public async Task<IActionResult> UpdateItemStatus(int id, [FromBody] UpdateMasterRequest request)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.ItemStatuses.FindAsync(id);
            if (existing == null) return NotFound();
            
            if (request.Name != null) 
            {
                if (await _context.ItemStatuses.AnyAsync(x => x.Id != id && x.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new { Success = false, Message = "Item status name already exists" });
                existing.Name = request.Name.Trim();
            }
            existing.IsActive = request.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("item-statuses/{id}")]
        public async Task<IActionResult> DeleteItemStatus(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.ItemStatuses.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemStatuses.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Materials
        [HttpGet("materials")]
        public async Task<IActionResult> GetMaterials() => Ok(new { data = await _context.Materials.OrderBy(x => x.Name).ToListAsync() });

        [HttpGet("materials/active")]
        public async Task<IActionResult> GetActiveMaterials() => Ok(new { data = await _context.Materials.Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync() });

        [HttpPost("materials")]
        public async Task<IActionResult> CreateMaterial([FromBody] Material item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            if (await _context.Materials.AnyAsync(x => x.Name.ToLower() == item.Name.Trim().ToLower()))
                return BadRequest(new { Success = false, Message = "Material name already exists" });
            _context.Materials.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("materials/{id}")]
        public async Task<IActionResult> UpdateMaterial(int id, [FromBody] UpdateMasterRequest request)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.Materials.FindAsync(id);
            if (existing == null) return NotFound();
            
            if (request.Name != null) 
            {
                if (await _context.Materials.AnyAsync(x => x.Id != id && x.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new { Success = false, Message = "Material name already exists" });
                existing.Name = request.Name.Trim();
            }
            existing.IsActive = request.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("materials/{id}")]
        public async Task<IActionResult> DeleteMaterial(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.Materials.FindAsync(id);
            if (item == null) return NotFound();
            _context.Materials.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }

        // Owner Types
        [HttpGet("owner-types")]
        public async Task<IActionResult> GetOwnerTypes() => Ok(new { data = await _context.OwnerTypes.OrderBy(x => x.Name).ToListAsync() });

        [HttpGet("owner-types/active")]
        public async Task<IActionResult> GetActiveOwnerTypes() => Ok(new { data = await _context.OwnerTypes.Where(x => x.IsActive).OrderBy(x => x.Name).ToListAsync() });

        [HttpPost("owner-types")]
        public async Task<IActionResult> CreateOwnerType([FromBody] OwnerType item)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            if (await _context.OwnerTypes.AnyAsync(x => x.Name.ToLower() == item.Name.Trim().ToLower()))
                return BadRequest(new { Success = false, Message = "Owner type name already exists" });
            _context.OwnerTypes.Add(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = item });
        }

        [HttpPut("owner-types/{id}")]
        public async Task<IActionResult> UpdateOwnerType(int id, [FromBody] UpdateMasterRequest request)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var existing = await _context.OwnerTypes.FindAsync(id);
            if (existing == null) return NotFound();
            
            if (request.Name != null) 
            {
                if (await _context.OwnerTypes.AnyAsync(x => x.Id != id && x.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new { Success = false, Message = "Owner type name already exists" });
                existing.Name = request.Name.Trim();
            }
            existing.IsActive = request.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { data = existing });
        }

        [HttpDelete("owner-types/{id}")]
        public async Task<IActionResult> DeleteOwnerType(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();
            var item = await _context.OwnerTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.OwnerTypes.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { data = true });
        }
    }
}
