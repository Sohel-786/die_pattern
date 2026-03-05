using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace net_backend.Controllers
{
    [Route("transfers")]
    [ApiController]
    public class TransfersController : BaseController
    {
        private readonly IWebHostEnvironment _env;

        public TransfersController(ApplicationDbContext context, IWebHostEnvironment env) : base(context) 
        {
            _env = env;
        }

        private string GetSafeName(string name)
        {
            if (string.IsNullOrEmpty(name)) return "Common";
            return string.Concat(name.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
        }

        private async Task<(string companyDir, string locationDir)> GetStorageContextNames()
        {
            var cid = await GetCurrentCompanyIdAsync();
            var lid = await GetCurrentLocationIdAsync();
            var company = await _context.Companies.FindAsync(cid);
            var location = await _context.Locations.FindAsync(lid);
            return (GetSafeName(company?.Name ?? "Company"), GetSafeName(location?.Name ?? "Location"));
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<TransferDto>>>> GetTransfers(
            [FromQuery] int? fromPartyId,
            [FromQuery] int? toPartyId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] bool? isActive)
        {
            if (!await HasPermission("ViewTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            
            var query = _context.Transfers
                .Include(t => t.Creator)
                .Include(t => t.FromParty)
                .Include(t => t.ToParty)
                .Include(t => t.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(t => t.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(m => m!.Material)
                .Where(t => t.LocationId == locationId);

            if (fromPartyId.HasValue) 
            {
                var val = fromPartyId.Value == 0 ? (int?)null : fromPartyId.Value;
                query = query.Where(t => t.FromPartyId == val);
            }
            if (toPartyId.HasValue) 
            {
                var val = toPartyId.Value == 0 ? (int?)null : toPartyId.Value;
                query = query.Where(t => t.ToPartyId == val);
            }
            if (startDate.HasValue) query = query.Where(t => t.TransferDate >= startDate);
            if (endDate.HasValue) query = query.Where(t => t.TransferDate <= endDate);
            if (isActive.HasValue) query = query.Where(t => t.IsActive == isActive);

            var list = await query.OrderByDescending(t => t.TransferDate).ToListAsync();
            var location = await _context.Locations.FindAsync(locationId);
            var locationName = location?.Name ?? "Our Location";

            var result = list.Select(t => new TransferDto
            {
                Id = t.Id,
                TransferNo = t.TransferNo,
                FromPartyId = t.FromPartyId,
                FromPartyName = t.FromPartyId == null ? locationName : t.FromParty?.Name,
                ToPartyId = t.ToPartyId,
                ToPartyName = t.ToPartyId == null ? locationName : t.ToParty?.Name,
                TransferDate = t.TransferDate,
                Remarks = t.Remarks,
                OutFor = t.OutFor,
                ReasonDetails = t.ReasonDetails,
                VehicleNo = t.VehicleNo,
                PersonName = t.PersonName,
                CreatorName = t.Creator?.FirstName + " " + t.Creator?.LastName,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                Items = t.Items.Select(i => new TransferItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    MainPartName = i.Item?.MainPartName,
                    CurrentName = i.Item?.CurrentName,
                    ItemTypeName = i.Item?.ItemType?.Name,
                    MaterialName = i.Item?.Material?.Name,
                    DrawingNo = i.Item?.DrawingNo,
                    RevisionNo = i.Item?.RevisionNo,
                    Remarks = i.Remarks
                }).ToList(),
                AttachmentUrls = string.IsNullOrEmpty(t.AttachmentUrlsJson) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(t.AttachmentUrlsJson) ?? new List<string>()
            });

            return Ok(new ApiResponse<IEnumerable<TransferDto>> { Data = result });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<TransferDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var t = await _context.Transfers
                .Include(t => t.Creator)
                .Include(t => t.FromParty)
                .Include(t => t.ToParty)
                .Include(t => t.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(t => t.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(m => m!.Material)
                .FirstOrDefaultAsync(t => t.Id == id && t.LocationId == locationId);

            if (t == null) return NotFound();
            var location = await _context.Locations.FindAsync(locationId);
            var locationName = location?.Name ?? "Our Location";

            var result = new TransferDto
            {
                Id = t.Id,
                TransferNo = t.TransferNo,
                FromPartyId = t.FromPartyId,
                FromPartyName = t.FromPartyId == null ? locationName : t.FromParty?.Name,
                ToPartyId = t.ToPartyId,
                ToPartyName = t.ToPartyId == null ? locationName : t.ToParty?.Name,
                TransferDate = t.TransferDate,
                Remarks = t.Remarks,
                OutFor = t.OutFor,
                ReasonDetails = t.ReasonDetails,
                VehicleNo = t.VehicleNo,
                PersonName = t.PersonName,
                CreatorName = t.Creator?.FirstName + " " + t.Creator?.LastName,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                Items = t.Items.Select(i => new TransferItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    MainPartName = i.Item?.MainPartName,
                    CurrentName = i.Item?.CurrentName,
                    ItemTypeName = i.Item?.ItemType?.Name,
                    MaterialName = i.Item?.Material?.Name,
                    DrawingNo = i.Item?.DrawingNo,
                    RevisionNo = i.Item?.RevisionNo,
                    Remarks = i.Remarks
                }).ToList(),
                AttachmentUrls = string.IsNullOrEmpty(t.AttachmentUrlsJson) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(t.AttachmentUrlsJson) ?? new List<string>()
            };

            return Ok(new ApiResponse<TransferDto> { Data = result });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Transfer>>> Create([FromBody] CreateTransferDto dto)
        {
            if (!await HasPermission("CreateTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.Items == null || !dto.Items.Any())
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "At least one item is required." });

            if (dto.FromPartyId == 0) dto.FromPartyId = null;
            if (dto.ToPartyId == 0) dto.ToPartyId = null;

            if (dto.FromPartyId == dto.ToPartyId)
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Source and destination cannot be the same." });

            if (string.IsNullOrWhiteSpace(dto.VehicleNo))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Vehicle No. is required." });
            if (string.IsNullOrWhiteSpace(dto.PersonName))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Person Name is required." });

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transfer = new Transfer
                {
                    TransferNo = await GenerateTransferNo(),
                    LocationId = locationId,
                    FromPartyId = dto.FromPartyId,
                    ToPartyId = dto.ToPartyId,
                    TransferDate = dto.TransferDate ?? DateTime.Now,
                    Remarks = dto.Remarks,
                    OutFor = dto.OutFor,
                    ReasonDetails = dto.ReasonDetails,
                    VehicleNo = dto.VehicleNo?.Trim(),
                    PersonName = dto.PersonName?.Trim(),
                    AttachmentUrlsJson = dto.AttachmentUrls != null ? JsonSerializer.Serialize(dto.AttachmentUrls) : null,
                    CreatedBy = CurrentUserId,
                    CreatedAt = DateTime.Now,
                    IsActive = true
                };

                _context.Transfers.Add(transfer);
                await _context.SaveChangesAsync();

                foreach (var itemDto in dto.Items)
                {
                    var item = await _context.Items.FindAsync(itemDto.ItemId);
                    if (item == null) throw new Exception($"Item with ID {itemDto.ItemId} not found.");

                    // Enforce traceability: transfer only when item is In Stock (or at source party)
                    if (item.CurrentProcess == ItemProcessState.NotInStock)
                        throw new Exception($"Item '{item.MainPartName}' is Not In Stock and cannot be transferred. Only items In Stock can be transferred.");

                    if (dto.FromPartyId.HasValue)
                    {
                        if (item.CurrentPartyId != dto.FromPartyId.Value)
                            throw new Exception($"Item '{item.MainPartName}' is not currently with the selected source party. Current state: {item.CurrentProcess}. One item can only be in one process at a time.");
                    }
                    else
                    {
                        if (item.CurrentLocationId != locationId || item.CurrentProcess != ItemProcessState.InStock)
                            throw new Exception($"Item '{item.MainPartName}' is not currently in stock at this location. Current state: {item.CurrentProcess}. One item can only be in one process at a time.");
                    }

                    // Record Transfer Item
                    var tItem = new TransferItem
                    {
                        TransferId = transfer.Id,
                        ItemId = item.Id,
                        Remarks = itemDto.Remarks
                    };
                    _context.TransferItems.Add(tItem);

                    // Update Item State
                    if (dto.ToPartyId.HasValue)
                    {
                        item.CurrentLocationId = null;
                        item.CurrentPartyId = dto.ToPartyId.Value;
                        item.CurrentProcess = ItemProcessState.AtVendor;
                    }
                    else
                    {
                        item.CurrentLocationId = locationId;
                        item.CurrentPartyId = null;
                        item.CurrentProcess = ItemProcessState.InStock;
                    }
                    item.UpdatedAt = DateTime.Now;
                }

                // Move attachments from temp to final folder
                var finalUrls = new List<string>();
                if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
                {
                    var (compDir, locDir) = await GetStorageContextNames();
                    var finalBaseRel = Path.Combine("storage", compDir, locDir, "transfer", transfer.TransferNo);
                    var finalBaseAbs = Path.Combine(_env.WebRootPath, finalBaseRel);
                    if (!Directory.Exists(finalBaseAbs)) Directory.CreateDirectory(finalBaseAbs);

                    foreach (var url in dto.AttachmentUrls)
                    {
                        if (url.Contains("/transfer/temp/")) // Move from temp
                        {
                            var oldRel = url.TrimStart('/');
                            var oldAbs = Path.Combine(_env.WebRootPath, oldRel);
                            if (System.IO.File.Exists(oldAbs))
                            {
                                var fileName = Path.GetFileName(oldAbs);
                                var newAbs = Path.Combine(finalBaseAbs, fileName);
                                System.IO.File.Move(oldAbs, newAbs);
                                
                                // Cleanup temp folder if empty
                                var tempFolder = Path.GetDirectoryName(oldAbs);
                                if (tempFolder != null && Directory.Exists(tempFolder) && !Directory.EnumerateFileSystemEntries(tempFolder).Any())
                                    Directory.Delete(tempFolder);

                                finalUrls.Add("/" + Path.Combine(finalBaseRel, fileName).Replace("\\", "/"));
                            }
                        }
                        else
                        {
                            finalUrls.Add(url); // Keep as is (already in final or elsewhere)
                        }
                    }
                }
                transfer.AttachmentUrlsJson = JsonSerializer.Serialize(finalUrls);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new ApiResponse<Transfer> { Data = transfer });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = ex.Message });
            }
        }

        [HttpGet("available-items")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAvailableItems([FromQuery] int? fromPartyId)
        {
            if (!await HasPermission("ViewTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var query = _context.Items
                .Include(i => i.ItemType)
                .Include(i => i.Material)
                .Where(i => i.IsActive && i.LocationId == locationId);

            if (fromPartyId.HasValue && fromPartyId.Value != 0)
            {
                // Items currently with this vendor/party
                query = query.Where(i => i.CurrentPartyId == fromPartyId && i.CurrentProcess == ItemProcessState.AtVendor);
            }
            else
            {
                // Items currently in local stock (if fromPartyId is 0 or null)
                query = query.Where(i => i.CurrentLocationId == locationId && i.CurrentProcess == ItemProcessState.InStock);
            }

            var items = await query.ToListAsync();
            var result = items.Select(i => new
            {
                i.Id,
                i.MainPartName,
                i.CurrentName,
                ItemTypeName = i.ItemType?.Name,
                MaterialName = i.Material?.Name,
                i.DrawingNo,
                i.RevisionNo,
                CurrentProcess = i.CurrentProcess.ToString()
            });

            return Ok(new ApiResponse<IEnumerable<object>> { Data = result });
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            return Ok(new ApiResponse<string> { Data = await GenerateTransferNo() });
        }

        private async Task<string> GenerateTransferNo()
        {
            var today = DateTime.Now;
            var prefix = $"TRF-{today:yyyyMMdd}-";
            
            var lastTransfer = await _context.Transfers
                .Where(t => t.TransferNo.StartsWith(prefix))
                .OrderByDescending(t => t.TransferNo)
                .FirstOrDefaultAsync();

            int nextNum = 1;
            if (lastTransfer != null)
            {
                var parts = lastTransfer.TransferNo.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out int lastNum))
                {
                    nextNum = lastNum + 1;
                }
            }

            return prefix + nextNum.ToString("D4");
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded");

            var (compDir, locDir) = await GetStorageContextNames();

            // Format: storage/company/location/transfer/temp/guid/filename
            var tempGuid = Guid.NewGuid().ToString("N");
            var relativePath = Path.Combine("storage", compDir, locDir, "transfer", "temp", tempGuid);
            var absolutePath = Path.Combine(_env.WebRootPath, relativePath);

            if (!Directory.Exists(absolutePath)) Directory.CreateDirectory(absolutePath);

            var fileName = file.FileName; // Keep original or guid? Requirement says "attachment files"
            // To be safe and unique in the folder:
            var finalFileName = Guid.NewGuid().ToString("N").Substring(0, 8) + "_" + fileName;
            var filePath = Path.Combine(absolutePath, finalFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = "/" + Path.Combine(relativePath, finalFileName).Replace("\\", "/");
            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        [HttpDelete("attachment")]
        public ActionResult<ApiResponse<bool>> DeleteAttachment([FromQuery] string url)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest("URL required");
            try
            {
                var relativePath = url.TrimStart('/');
                var absolutePath = Path.Combine(_env.WebRootPath, relativePath);
                if (System.IO.File.Exists(absolutePath))
                {
                    System.IO.File.Delete(absolutePath);
                }
                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch
            {
                return Ok(new ApiResponse<bool> { Data = false }); // Silent fail
            }
        }
    }
}
