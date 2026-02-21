using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("parties")]
    [ApiController]
    public class PartiesController : BaseController
    {
        private readonly IExcelService _excelService;
        public PartiesController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var parties = await _context.Parties
                .OrderBy(p => p.Name)
                .ToListAsync();
            var data = parties.Select(p => new {
                Name = p.Name,
                PartyCategory = p.PartyCategory ?? "",
                CustomerType = p.CustomerType ?? "",
                Address = p.Address ?? "",
                ContactPerson = p.ContactPerson ?? "",
                PhoneNumber = p.PhoneNumber ?? "",
                Email = p.Email ?? "",
                GstNo = p.GstNo ?? "",
                GstDate = p.GstDate,
                IsActive = p.IsActive ? "Yes" : "No",
                CreatedAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Parties");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "parties.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<PartyImportDto>>>> Validate(IFormFile file)
        {
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<PartyImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<PartyImportDto>(stream);
                var validation = await ValidateParties(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<PartyImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<PartyImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (file == null || file.Length == 0)
                return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var result = _excelService.ImportExcel<PartyImportDto>(stream);
                    var validation = await ValidateParties(result.Data);
                    var newParties = new List<Party>();

                    foreach (var validRow in validation.Valid)
                    {
                        newParties.Add(new Party
                        {
                            Name = validRow.Data.Name.Trim(),
                            PartyCategory = validRow.Data.PartyCategory!,
                            CustomerType = validRow.Data.CustomerType!,
                            Address = validRow.Data.Address!,
                            ContactPerson = validRow.Data.ContactPerson!,
                            PhoneNumber = validRow.Data.PhoneNumber!,
                            Email = validRow.Data.Email,
                            GstNo = validRow.Data.GstNo!,
                            GstDate = validRow.Data.GstDate,
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }

                    if (newParties.Any())
                    {
                        _context.Parties.AddRange(newParties);
                        await _context.SaveChangesAsync();
                    }

                    var finalResult = new
                    {
                        imported = newParties.Count,
                        totalRows = result.TotalRows,
                        errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList()
                    };

                    return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newParties.Count} parties imported successfully" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" });
            }
        }

        private async Task<ValidationResultDto<PartyImportDto>> ValidateParties(List<ExcelRow<PartyImportDto>> rows)
        {
            var validation = new ValidationResultDto<PartyImportDto>();
            var existingNames = await _context.Parties
                .Select(p => p.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name) || string.IsNullOrWhiteSpace(item.PartyCategory) || 
                    string.IsNullOrWhiteSpace(item.CustomerType) || string.IsNullOrWhiteSpace(item.ContactPerson) || 
                    string.IsNullOrWhiteSpace(item.PhoneNumber) || string.IsNullOrWhiteSpace(item.GstNo) || 
                    string.IsNullOrWhiteSpace(item.Address))
                {
                    validation.Invalid.Add(new ValidationEntry<PartyImportDto> { Row = row.RowNumber, Data = item, Message = "Name, Category, Customer Type, Contact Person, Contact No., GST No., and Address are mandatory" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();

                if (processedInFile.Contains(nameLower))
                {
                    validation.Duplicates.Add(new ValidationEntry<PartyImportDto> { Row = row.RowNumber, Data = item, Message = "Duplicate Name in file" });
                    continue;
                }

                if (existingNames.Contains(nameLower))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<PartyImportDto> { Row = row.RowNumber, Data = item, Message = "Already exists in database" });
                    processedInFile.Add(nameLower);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<PartyImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(nameLower);
            }

            return validation;
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetAll()
        {
            var parties = await _context.Parties
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = parties });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<Party>>>> GetActive()
        {
            var parties = await _context.Parties
                .Where(p => p.IsActive)
                .OrderBy(p => p.Name)
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<Party>> { Data = parties });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Party>>> Create([FromBody] Party party)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            if (await _context.Parties.AnyAsync(p => p.Name.ToLower() == party.Name.Trim().ToLower()))
                return BadRequest(new ApiResponse<Party> { Success = false, Message = "Party name already exists" });

            if (string.IsNullOrWhiteSpace(party.PartyCategory) || string.IsNullOrWhiteSpace(party.CustomerType) ||
                string.IsNullOrWhiteSpace(party.ContactPerson) || string.IsNullOrWhiteSpace(party.PhoneNumber) ||
                string.IsNullOrWhiteSpace(party.GstNo) || string.IsNullOrWhiteSpace(party.Address))
            {
                return BadRequest(new ApiResponse<Party> { Success = false, Message = "All mandatory fields must be provided" });
            }

            party.CreatedAt = DateTime.Now;
            party.UpdatedAt = DateTime.Now;
            _context.Parties.Add(party);
            await _context.SaveChangesAsync();

            return StatusCode(201, new ApiResponse<Party> { Data = party });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Party>>> Update(int id, [FromBody] UpdatePartyRequest request)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var existing = await _context.Parties.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Party> { Success = false, Message = "Party not found" });

            if (request.Name != null) 
            {
                if (await _context.Parties.AnyAsync(p => p.Id != id && p.Name.ToLower() == request.Name.Trim().ToLower()))
                    return BadRequest(new ApiResponse<Party> { Success = false, Message = "Party name already exists" });
                existing.Name = request.Name.Trim();
            }
            if (request.PartyCategory != null) {
                if (string.IsNullOrWhiteSpace(request.PartyCategory)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "Party Category cannot be empty" });
                existing.PartyCategory = request.PartyCategory;
            }
            if (request.CustomerType != null) {
                if (string.IsNullOrWhiteSpace(request.CustomerType)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "Customer Type cannot be empty" });
                existing.CustomerType = request.CustomerType;
            }
            if (request.Address != null) {
                if (string.IsNullOrWhiteSpace(request.Address)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "Address cannot be empty" });
                existing.Address = request.Address;
            }
            if (request.ContactPerson != null) {
                if (string.IsNullOrWhiteSpace(request.ContactPerson)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "Contact Person cannot be empty" });
                existing.ContactPerson = request.ContactPerson;
            }
            if (request.PhoneNumber != null) {
                if (string.IsNullOrWhiteSpace(request.PhoneNumber)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "Phone Number cannot be empty" });
                existing.PhoneNumber = request.PhoneNumber;
            }
            if (request.GstNo != null) {
                if (string.IsNullOrWhiteSpace(request.GstNo)) return BadRequest(new ApiResponse<Party> { Success = false, Message = "GST No cannot be empty" });
                existing.GstNo = request.GstNo;
            }
            if (request.Email != null) existing.Email = request.Email;
            if (request.GstDate != null) existing.GstDate = request.GstDate;
            existing.IsActive = request.IsActive;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Party> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageMaster")) return Forbidden();

            var party = await _context.Parties.FindAsync(id);
            if (party == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Party not found" });

            _context.Parties.Remove(party);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
