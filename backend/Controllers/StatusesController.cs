using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("statuses")]
    [ApiController]
    public class StatusesController : BaseController
    {
        private readonly IExcelService _excelService;
        public StatusesController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var items = await _context.ItemStatuses
                .OrderBy(s => s.Name)
                .ToListAsync();
            var data = items.Select(s => new {
                Name = s.Name,
                IsActive = s.IsActive ? "Yes" : "No"
            });

            var file = _excelService.GenerateExcel(data, "Statuses");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "statuses.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<MasterImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MasterImportDto>(stream);
                var validation = await ValidateStatuses(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<MasterImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasPermission("ManageItemStatus")) return Forbidden();
            if (file == null || file.Length == 0) return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<MasterImportDto>(stream);
                var validation = await ValidateStatuses(result.Data);
                var newItems = new List<ItemStatus>();

                foreach (var validRow in validation.Valid)
                {
                    newItems.Add(new ItemStatus { Name = validRow.Data.Name.Trim(), IsActive = true });
                }

                if (newItems.Any())
                {
                    _context.ItemStatuses.AddRange(newItems);
                    await _context.SaveChangesAsync();
                }

                return Ok(new ApiResponse<object> { Data = new { imported = newItems.Count, totalRows = result.TotalRows }, Message = $"{newItems.Count} statuses imported" });
            }
            catch (Exception ex) { return Ok(new ApiResponse<object> { Success = false, Message = ex.Message }); }
        }

        private async Task<ValidationResultDto<MasterImportDto>> ValidateStatuses(List<ExcelRow<MasterImportDto>> rows)
        {
            var validation = new ValidationResultDto<MasterImportDto>();
            var existingNames = await _context.ItemStatuses.Select(s => s.Name.ToLower()).ToListAsync();
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

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemStatus>>>> GetAll()
        {
            var items = await _context.ItemStatuses.OrderBy(s => s.Name).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ItemStatus>> { Data = items });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<ItemStatus>>>> GetActive()
        {
            var items = await _context.ItemStatuses.Where(s => s.IsActive).OrderBy(s => s.Name).ToListAsync();
            return Ok(new ApiResponse<IEnumerable<ItemStatus>> { Data = items });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ItemStatus>>> Create([FromBody] ItemStatus item)
        {
            if (!await HasPermission("ManageItemStatus")) return Forbidden();
            
            if (await _context.ItemStatuses.AnyAsync(x => x.Name.ToLower() == item.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<ItemStatus> { Success = false, Message = "Status name already exists" });
                
            _context.ItemStatuses.Add(item);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<ItemStatus> { Data = item });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<ItemStatus>>> Update(int id, [FromBody] UpdateMasterRequest request)
        {
            if (!await HasPermission("ManageItemStatus")) return Forbidden();
            var existing = await _context.ItemStatuses.FindAsync(id);
            if (existing == null) return NotFound();
            
            if (request.Name != null) 
            {
                if (await _context.ItemStatuses.AnyAsync(x => x.Id != id && x.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new ApiResponse<ItemStatus> { Success = false, Message = "Status name already exists" });
                existing.Name = request.Name.Trim();
            }
            
            existing.IsActive = request.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<ItemStatus> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageItemStatus")) return Forbidden();
            var item = await _context.ItemStatuses.FindAsync(id);
            if (item == null) return NotFound();
            _context.ItemStatuses.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
