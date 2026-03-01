using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("job-works")]
    [ApiController]
    public class JobWorksController : BaseController
    {
        private readonly ICodeGeneratorService _codeGenerator;
        private readonly Services.IItemStateService _itemState;

        public JobWorksController(ApplicationDbContext context, ICodeGeneratorService codeGenerator, Services.IItemStateService itemState) : base(context)
        {
            _codeGenerator = codeGenerator;
            _itemState = itemState;
        }

        [HttpGet("next-code")]
        public async Task<ActionResult<ApiResponse<string>>> GetNextCode()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var code = await _codeGenerator.GenerateCode("JW", locationId);
            return Ok(new ApiResponse<string> { Data = code });
        }

        [HttpGet("pending")]
        public async Task<ActionResult<ApiResponse<IEnumerable<JobWorkDto>>>> GetPending([FromQuery] int? vendorId)
        {
            var locationId = await GetCurrentLocationIdAsync();
            
            // JW items that are NOT yet Inwarded
            var query = _context.JobWorkItems
                .Include(i => i.JobWork)
                .Include(i => i.Item)
                .Where(i => i.JobWork!.LocationId == locationId && i.JobWork.Status == JobWorkStatus.Pending && i.JobWork.IsActive)
                .AsQueryable();

            if (vendorId.HasValue && vendorId > 0)
                query = query.Where(i => i.JobWork!.ToPartyId == vendorId.Value);

            var list = await query.ToListAsync();

            // Filter out items already fully inwarded
            var inwardedItems = await _context.InwardLines
                .Where(l => l.SourceType == InwardSourceType.JobWork && l.Inward!.IsActive && l.SourceRefId.HasValue)
                .Select(l => new { jwId = l.SourceRefId!.Value, itemId = l.ItemId })
                .ToListAsync();

            var inwardedSet = new HashSet<string>(inwardedItems.Select(x => $"{x.jwId}_{x.itemId}"));

            var data = list
                .Where(i => !inwardedSet.Contains($"{i.JobWorkId}_{i.ItemId}"))
                .Select(i => new JobWorkDto
                {
                    Id = i.JobWorkId,
                    JobWorkNo = i.JobWork!.JobWorkNo,
                    ToPartyId = i.JobWork.ToPartyId,
                    Status = i.JobWork.Status,
                    CreatedAt = i.JobWork.CreatedAt,
                    Items = new List<JobWorkItemDto> { 
                        new JobWorkItemDto { 
                            Id = i.Id, 
                            ItemId = i.ItemId, 
                            ItemName = i.Item?.CurrentName, 
                            MainPartName = i.Item?.MainPartName 
                        } 
                    }
                }).ToList();

            return Ok(new ApiResponse<IEnumerable<JobWorkDto>> { Data = data });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<JobWorkDto>>>> GetAll(
            [FromQuery] JobWorkStatus? status, 
            [FromQuery] string? search,
            [FromQuery] int[]? partyIds,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] bool? isActive)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var query = _context.JobWorks
                .Include(j => j.Creator)
                .Include(j => j.ToParty)
                .Include(j => j.Items).ThenInclude(i => i.Item)
                .Where(j => j.LocationId == locationId)
                .AsQueryable();

            if (status.HasValue)
                query = query.Where(j => j.Status == status.Value);
            
            if (isActive.HasValue)
                query = query.Where(j => j.IsActive == isActive.Value);

            if (partyIds != null && partyIds.Length > 0)
                query = query.Where(j => partyIds.Contains(j.ToPartyId));

            if (startDate.HasValue)
                query = query.Where(j => j.CreatedAt >= startDate.Value.Date);

            if (endDate.HasValue)
                query = query.Where(j => j.CreatedAt <= endDate.Value.Date.AddDays(1).AddTicks(-1));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.ToLower();
                query = query.Where(j => 
                    j.JobWorkNo.ToLower().Contains(s) || 
                    (j.ToParty != null && j.ToParty.Name.ToLower().Contains(s)) ||
                    j.Items.Any(i => i.Item != null && (i.Item.CurrentName.ToLower().Contains(s) || i.Item.MainPartName.ToLower().Contains(s)))
                );
            }

            var list = await query.OrderByDescending(j => j.CreatedAt).ToListAsync();
            var data = list.Select(MapToDto).ToList();
            return Ok(new ApiResponse<IEnumerable<JobWorkDto>> { Data = data });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<JobWorkDto>>> GetById(int id)
        {
            if (!await HasPermission("ViewMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var jw = await _context.JobWorks
                .Include(j => j.ToParty)
                .Include(j => j.Creator)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.ItemType)
                .Include(j => j.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(i => i!.Material)
                .FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId);
            
            if (jw == null) return NotFound();
            return Ok(new ApiResponse<JobWorkDto> { Data = MapToDto(jw) });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<JobWork>>> Create([FromBody] CreateJobWorkDto dto)
        {
            if (!await HasPermission("CreateMovement")) return Forbidden();
            
            var userId = CurrentUserId;
            var currentUser = await _context.Users
                .Include(u => u.DefaultCompany)
                .Include(u => u.DefaultLocation)
                .FirstOrDefaultAsync(u => u.Id == userId);
            
            if (currentUser == null) return Unauthorized();

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new ApiResponse<JobWork> { Success = false, Message = "At least one item is required." });

            var companyName = currentUser.DefaultCompany?.Name ?? "General";
            var locationName = currentUser.DefaultLocation?.Name ?? "General";
            var locationId = currentUser.DefaultLocationId ?? 0;
            
            // Clean names for folder path
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars()));
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars()));

            foreach (var itemDto in dto.Items)
            {
                var inStock = await _itemState.IsInStockAsync(itemDto.ItemId);
                if (!inStock)
                    return BadRequest(new ApiResponse<JobWork> { Success = false, Message = $"Item {itemDto.ItemId} must be In stock to send for Job work." });
            }

            var nextCode = await _codeGenerator.GenerateCode("JW", locationId);
            var jobWorkNo = nextCode ?? $"JW-{Guid.NewGuid().ToString().Substring(0, 8)}";

            // Process attachments: Move from temp to JobWorkNo folder
            var finalAttachmentUrls = new List<string>();
            var targetSubFolder = Path.Combine("storage", companyName, locationName, "jobwork", jobWorkNo);
            var targetPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", targetSubFolder);

            if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
            {
                if (!Directory.Exists(targetPath)) Directory.CreateDirectory(targetPath);

                foreach (var oldUrl in dto.AttachmentUrls)
                {
                    var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", oldUrl.TrimStart('/'));
                    if (System.IO.File.Exists(oldFilePath))
                    {
                        var fileName = Path.GetFileName(oldFilePath);
                        var newFilePath = Path.Combine(targetPath, fileName);
                        System.IO.File.Move(oldFilePath, newFilePath, true);
                        finalAttachmentUrls.Add($"/{targetSubFolder.Replace("\\", "/")}/{fileName}");
                    }
                }
            }

            var jw = new JobWork
            {
                JobWorkNo = jobWorkNo,
                ToPartyId = dto.ToPartyId,
                Description = dto.Description,
                Remarks = dto.Remarks,
                Status = JobWorkStatus.Pending,
                LocationId = locationId,
                IsActive = true,
                AttachmentUrlsJson = QuotationUrlsHelper.ToJson(finalAttachmentUrls),
                CreatedBy = userId,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            foreach (var itemDto in dto.Items)
            {
                jw.Items.Add(new JobWorkItem
                {
                    ItemId = itemDto.ItemId,
                    Rate = itemDto.Rate,
                    GstPercent = itemDto.GstPercent,
                    Remarks = itemDto.Remarks
                });

                // Update Item State
                var item = await _context.Items.FindAsync(itemDto.ItemId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InJobwork;
                    item.CurrentPartyId = dto.ToPartyId;
                    item.CurrentLocationId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.JobWorks.Add(jw);
            await _context.SaveChangesAsync();
            return StatusCode(201, new ApiResponse<JobWork> { Data = jw });
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreateJobWorkDto dto)
        {
            if (!await HasPermission("EditMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var jw = await _context.JobWorks.Include(j => j.Items).FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId);
            if (jw == null) return NotFound();

            if (dto.Items == null || dto.Items.Count == 0)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required." });

            var userId = CurrentUserId;
            var currentUser = await _context.Users
                .Include(u => u.DefaultCompany)
                .Include(u => u.DefaultLocation)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (currentUser == null) return Unauthorized();

            var companyName = currentUser.DefaultCompany?.Name ?? "General";
            var locationName = currentUser.DefaultLocation?.Name ?? "General";
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars()));
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars()));

            // Process attachments: Move from temp to JobWorkNo folder
            var finalAttachmentUrls = new List<string>();
            var targetSubFolder = Path.Combine("storage", companyName, locationName, "jobwork", jw.JobWorkNo);
            var targetPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", targetSubFolder);

            if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
            {
                if (!Directory.Exists(targetPath)) Directory.CreateDirectory(targetPath);

                foreach (var url in dto.AttachmentUrls)
                {
                    var isTemp = url.Contains("/jobwork/attachments/");
                    if (isTemp)
                    {
                        var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", url.TrimStart('/'));
                        if (System.IO.File.Exists(oldFilePath))
                        {
                            var fileName = Path.GetFileName(oldFilePath);
                            var newFilePath = Path.Combine(targetPath, fileName);
                            System.IO.File.Move(oldFilePath, newFilePath, true);
                            finalAttachmentUrls.Add($"/{targetSubFolder.Replace("\\", "/")}/{fileName}");
                        }
                    }
                    else
                    {
                        finalAttachmentUrls.Add(url);
                    }
                }
            }

            jw.ToPartyId = dto.ToPartyId;
            jw.Description = dto.Description;
            jw.Remarks = dto.Remarks;
            jw.AttachmentUrlsJson = QuotationUrlsHelper.ToJson(finalAttachmentUrls);
            jw.UpdatedAt = DateTime.Now;

            // Update items and their states
            var oldItemIds = jw.Items.Select(i => i.ItemId).ToList();
            var newItemIds = dto.Items.Select(i => i.ItemId).ToList();

            // Items to remove: go back to InStock
            var removedItemIds = oldItemIds.Except(newItemIds).ToList();
            foreach (var rId in removedItemIds)
            {
                var item = await _context.Items.FindAsync(rId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InStock;
                    item.CurrentPartyId = null;
                    item.CurrentLocationId = jw.LocationId; // Back to the location of JobWork
                    item.UpdatedAt = DateTime.Now;
                }
            }

            // Items to add: check if InStock, then move to InJobwork
            var addedItemIds = newItemIds.Except(oldItemIds).ToList();
            foreach (var aId in addedItemIds)
            {
                var item = await _context.Items.FindAsync(aId);
                if (item != null)
                {
                    item.CurrentProcess = ItemProcessState.InJobwork;
                    item.CurrentPartyId = dto.ToPartyId;
                    item.CurrentLocationId = null;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            // Existing items: just update party in case it changed
            var stayingItemIds = newItemIds.Intersect(oldItemIds).ToList();
            foreach (var sId in stayingItemIds)
            {
                var item = await _context.Items.FindAsync(sId);
                if (item != null)
                {
                    item.CurrentPartyId = dto.ToPartyId;
                    item.UpdatedAt = DateTime.Now;
                }
            }

            _context.JobWorkItems.RemoveRange(jw.Items);
            foreach (var itemDto in dto.Items)
            {
                jw.Items.Add(new JobWorkItem
                {
                    ItemId = itemDto.ItemId,
                    Rate = itemDto.Rate,
                    GstPercent = itemDto.GstPercent,
                    Remarks = itemDto.Remarks
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleActive(int id, [FromQuery] bool active)
        {
            if (!await HasPermission("EditMovement")) return Forbidden();
            var jw = await _context.JobWorks.FindAsync(id);
            if (jw == null) return NotFound();
            jw.IsActive = active;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPut("{id}/status")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateStatus(int id, [FromBody] UpdateJobWorkStatusDto dto)
        {
            if (!await HasPermission("ApproveMovement")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            var jw = await _context.JobWorks.FirstOrDefaultAsync(j => j.Id == id && j.LocationId == locationId);
            if (jw == null) return NotFound();
            jw.Status = dto.Status;
            jw.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment(IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest("No file uploaded.");
            var currentUser = await _context.Users.Include(u => u.DefaultCompany).Include(u => u.DefaultLocation).FirstOrDefaultAsync(u => u.Id == CurrentUserId);
            if (currentUser == null) return Unauthorized();

            var companyName = currentUser.DefaultCompany?.Name ?? "General";
            var locationName = currentUser.DefaultLocation?.Name ?? "General";
            
            // Clean names for folder path
            companyName = string.Concat(companyName.Split(Path.GetInvalidFileNameChars()));
            locationName = string.Concat(locationName.Split(Path.GetInvalidFileNameChars()));

            var subFolder = Path.Combine("storage", companyName, locationName, "jobwork", "attachments");
            var uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", subFolder);

            if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

            var fileName = $"{Guid.NewGuid()}_{file.FileName}";
            var filePath = Path.Combine(uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/{subFolder.Replace("\\", "/")}/{fileName}";
            return Ok(new ApiResponse<object> { Data = new { url } });
        }

        [HttpDelete("attachment")]
        public async Task<ActionResult<ApiResponse<bool>>> DeleteAttachment([FromQuery] string url)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest();
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", url.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }
            return Ok(new ApiResponse<bool> { Data = true });
        }

        private static JobWorkDto MapToDto(JobWork j)
        {
            return new JobWorkDto
            {
                Id = j.Id,
                JobWorkNo = j.JobWorkNo,
                ToPartyId = j.ToPartyId,
                ToPartyName = j.ToParty?.Name,
                Description = j.Description,
                Remarks = j.Remarks,
                Status = j.Status,
                IsActive = j.IsActive,
                AttachmentUrls = QuotationUrlsHelper.FromJson(j.AttachmentUrlsJson),
                CreatorName = j.Creator != null ? $"{j.Creator.FirstName} {j.Creator.LastName}" : null,
                CreatedAt = j.CreatedAt,
                Items = j.Items.Select(i => new JobWorkItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemName = i.Item?.CurrentName,
                    MainPartName = i.Item?.MainPartName,
                    ItemTypeName = i.Item?.ItemType?.Name,
                    MaterialName = i.Item?.Material?.Name,
                    DrawingNo = i.Item?.DrawingNo,
                    RevisionNo = i.Item?.RevisionNo,
                    Rate = i.Rate,
                    GstPercent = i.GstPercent,
                    Remarks = i.Remarks
                }).ToList()
            };
        }
    }
}
