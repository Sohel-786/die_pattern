using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
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
        private readonly IItemStateService _itemState;

        public TransfersController(ApplicationDbContext context, IWebHostEnvironment env, IItemStateService itemState) : base(context) 
        {
            _env = env;
            _itemState = itemState;
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
            [FromQuery] List<int>? fromPartyIds,
            [FromQuery] List<int>? toPartyIds,
            [FromQuery] List<int>? itemIds,
            [FromQuery] List<int>? creatorIds,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] bool? isActive,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();
            
            var query = _context.Transfers
                .AsNoTracking()
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

            if (fromPartyIds != null && fromPartyIds.Any())
            {
                // Handle 0 (Our Location) separately if needed, but in Transfer table it's usually NULL
                // If FromPartyId is NULL, it's our location. We can use 0 to represent it in filters.
                var includeNull = fromPartyIds.Contains(0);
                var partyIds = fromPartyIds.Where(id => id > 0).ToList();
                
                query = query.Where(t => (includeNull && t.FromPartyId == null) || (t.FromPartyId != null && partyIds.Contains(t.FromPartyId.Value)));
            }
            if (toPartyIds != null && toPartyIds.Any())
            {
                var includeNull = toPartyIds.Contains(0);
                var partyIds = toPartyIds.Where(id => id > 0).ToList();
                query = query.Where(t => (includeNull && t.ToPartyId == null) || (t.ToPartyId != null && partyIds.Contains(t.ToPartyId.Value)));
            }
            if (itemIds != null && itemIds.Any())
            {
                query = query.Where(t => t.Items.Any(i => itemIds.Contains(i.ItemId)));
            }
            if (creatorIds != null && creatorIds.Any())
            {
                query = query.Where(t => creatorIds.Contains(t.CreatedBy));
            }

            if (startDate.HasValue)
            {
                var sd = startDate.Value.Date;
                query = query.Where(t => t.TransferDate >= sd);
            }
            if (endDate.HasValue)
            {
                var ed = endDate.Value.Date.AddDays(1);
                query = query.Where(t => t.TransferDate < ed);
            }
            
            // SECURITY: Only Admin can see inactive entries. For others, force only active records.
            if (!await IsAdmin())
                query = query.Where(t => t.IsActive);
            else if (isActive.HasValue)
                query = query.Where(t => t.IsActive == isActive.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(t =>
                    t.TransferNo.ToLower().Contains(s) ||
                    (t.FromParty != null && t.FromParty.Name.ToLower().Contains(s)) ||
                    (t.ToParty != null && t.ToParty.Name.ToLower().Contains(s)) ||
                    (t.Remarks != null && t.Remarks.ToLower().Contains(s)) ||
                    (t.OutFor != null && t.OutFor.ToLower().Contains(s)) ||
                    (t.ReasonDetails != null && t.ReasonDetails.ToLower().Contains(s)) ||
                    (t.VehicleNo != null && t.VehicleNo.ToLower().Contains(s)) ||
                    (t.PersonName != null && t.PersonName.ToLower().Contains(s)) ||
                    t.Items.Any(i =>
                        (i.Item != null && i.Item.MainPartName.ToLower().Contains(s)) ||
                        (i.Item != null && (i.Item.CurrentName ?? "").ToLower().Contains(s)) ||
                        (i.Remarks != null && i.Remarks.ToLower().Contains(s))
                    )
                );
            }

            var ordered = query.OrderByDescending(t => t.CreatedAt);
            var totalCount = await ordered.CountAsync();
            var (skip, take) = PaginationHelper.GetSkipTake(page, pageSize);
            var list = await ordered.Skip(skip).Take(take).ToListAsync();
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
                    CurrentName = i.ItemNameSnapshot ?? i.Item?.CurrentName,
                    ItemTypeName = i.Item?.ItemType?.Name,
                    MaterialName = i.Item?.Material?.Name,
                    DrawingNo = i.Item?.DrawingNo,
                    RevisionNo = i.Item?.RevisionNo,
                    Remarks = i.Remarks
                }).ToList(),
                AttachmentUrls = string.IsNullOrEmpty(t.AttachmentUrlsJson) ? new List<string>() : JsonSerializer.Deserialize<List<string>>(t.AttachmentUrlsJson) ?? new List<string>()
            });

            return Ok(new ApiResponse<IEnumerable<TransferDto>> { Data = result, TotalCount = totalCount });
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
            if (!t.IsActive && !await IsAdmin()) return NotFound();
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
                    CurrentName = i.ItemNameSnapshot ?? i.Item?.CurrentName,
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

        [HttpGet("{id}/print")]
        public async Task<ActionResult<ApiResponse<TransferPrintDto>>> GetPrint(int id)
        {
            if (!await HasPermission("ViewTransfer")) return Forbidden();
            var (companyId, locationId) = await GetCurrentLocationAndCompanyAsync();
            var t = await _context.Transfers
                .Include(x => x.FromParty)
                .Include(x => x.ToParty)
                .Include(x => x.Creator)
                .Include(x => x.Location)
                .Include(x => x.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.ItemType)
                .Include(x => x.Items)
                    .ThenInclude(i => i.Item)
                        .ThenInclude(it => it!.Material)
                .FirstOrDefaultAsync(x => x.Id == id && x.LocationId == locationId);

            if (t == null) return NotFound();
            if (!t.IsActive && !await IsAdmin()) return NotFound();

            var company = await _context.Companies.FindAsync(companyId);
            var location = await _context.Locations.FindAsync(locationId);
            var locationName = location?.Name ?? "Our Location";

            var companyName = company?.Name ?? "";
            var companyAddress = string.Join(", ", new[] { company?.Address, company?.City, company?.State, company?.Pincode }.Where(s => !string.IsNullOrWhiteSpace(s)));
            var companyGst = company?.GstNo ?? "";

            var docNo = "-";
            var revNo = "-";
            DateTime? revDate = null;
            var appliedDoc = await _context.DocumentControls
                .Where(d => d.DocumentType == DocumentType.TransferEntry && d.IsActive && d.IsApplied)
                .FirstOrDefaultAsync();
            if (appliedDoc != null) { docNo = appliedDoc.DocumentNo; revNo = appliedDoc.RevisionNo; revDate = appliedDoc.RevisionDate; }

            var fromName = t.FromPartyId == null ? locationName : t.FromParty?.Name ?? "";
            var toName = t.ToPartyId == null ? locationName : t.ToParty?.Name ?? "";

            var srNo = 0;
            var rows = t.Items.OrderBy(i => i.Id).Select(i => new TransferPrintRowDto
            {
                SrNo = ++srNo,
                PartNo = i.Item?.MainPartName ?? "-",
                ProductName = i.ItemNameSnapshot ?? i.Item?.CurrentName ?? i.Item?.MainPartName ?? "-",
                ItemTypeName = i.Item?.ItemType?.Name ?? "-",
                MaterialName = i.Item?.Material?.Name ?? "-",
                DrawingNo = i.Item?.DrawingNo ?? "-",
                RevisionNo = i.Item?.RevisionNo ?? "0",
                Remarks = i.Remarks ?? ""
            }).ToList();

            var dto = new TransferPrintDto
            {
                CompanyName = companyName,
                CompanyAddress = companyAddress,
                CompanyGstNo = companyGst,
                DocumentNo = docNo,
                RevisionNo = revNo,
                RevisionDate = revDate,
                TransferNo = t.TransferNo,
                TransferDate = t.TransferDate,
                FromPartyName = fromName,
                ToPartyName = toName,
                OutFor = t.OutFor ?? "",
                ReasonDetails = t.ReasonDetails ?? "",
                VehicleNo = t.VehicleNo ?? "",
                PersonName = t.PersonName ?? "",
                Remarks = t.Remarks ?? "",
                PreparedBy = t.Creator != null ? t.Creator.FirstName + " " + t.Creator.LastName : "",
                Rows = rows
            };

            return Ok(new ApiResponse<TransferPrintDto> { Data = dto });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Transfer>>> Create([FromBody] CreateTransferDto dto)
        {
            if (!await HasAllPermissions("ViewTransfer", "CreateTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            if (dto.Items == null || !dto.Items.Any())
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "At least one item is required for transfer." });

            if (string.IsNullOrWhiteSpace(dto.OutFor))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Out For is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.ReasonDetails))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Reason Details is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.VehicleNo))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Vehicle No. is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.PersonName))
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Person Name is mandatory." });

            if (dto.FromPartyId == 0) dto.FromPartyId = null;
            if (dto.ToPartyId == 0) dto.ToPartyId = null;

            if (dto.FromPartyId == dto.ToPartyId)
                return BadRequest(new ApiResponse<Transfer> { Success = false, Message = "Source and destination cannot be the same." });

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
                await SaveTransferWithRetryOnDuplicateNoAsync(transfer);

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
                        if (item.CurrentProcess != ItemProcessState.InStock || item.LocationId != locationId)
                            throw new Exception($"Item '{item.MainPartName}' is not currently in stock at this location. Current state: {item.CurrentProcess}. One item can only be in one process at a time.");
                    }

                    var tItem = new TransferItem
                    {
                        TransferId = transfer.Id,
                        ItemId = item.Id,
                        Remarks = itemDto.Remarks,
                        ItemNameSnapshot = item.CurrentName
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

        private async Task SaveTransferWithRetryOnDuplicateNoAsync(Transfer transfer)
        {
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsDuplicateTransferNo(ex))
            {
                transfer.TransferNo = await GenerateTransferNo();
                await _context.SaveChangesAsync();
            }
        }

        private static bool IsDuplicateTransferNo(DbUpdateException ex)
        {
            return ex.InnerException is Microsoft.Data.SqlClient.SqlException sql &&
                   sql.Number == 2601 &&
                   sql.Message.Contains("IX_transfers_TransferNo", StringComparison.OrdinalIgnoreCase);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Update(int id, [FromBody] CreateTransferDto dto)
        {
            if (!await HasAllPermissions("ViewTransfer", "EditTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var transfer = await _context.Transfers
                .Include(t => t.Items)
                .ThenInclude(i => i.Item)
                .FirstOrDefaultAsync(t => t.Id == id && t.LocationId == locationId);

            if (transfer == null) return NotFound();

            if (dto.Items == null || !dto.Items.Any())
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "At least one item is required for transfer." });

            if (string.IsNullOrWhiteSpace(dto.OutFor))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Out For is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.ReasonDetails))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Reason Details is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.VehicleNo))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Vehicle No. is mandatory." });

            if (string.IsNullOrWhiteSpace(dto.PersonName))
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Person Name is mandatory." });

            if (dto.FromPartyId == 0) dto.FromPartyId = null;
            if (dto.ToPartyId == 0) dto.ToPartyId = null;
            if (dto.FromPartyId == dto.ToPartyId)
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Source and destination cannot be the same." });

            var incomingItemIds = dto.Items.Select(i => i.ItemId).Distinct().OrderBy(x => x).ToList();
            var existingItemIds = transfer.Items.Select(i => i.ItemId).Distinct().OrderBy(x => x).ToList();

            var structureChanged =
                transfer.FromPartyId != dto.FromPartyId ||
                transfer.ToPartyId != dto.ToPartyId ||
                incomingItemIds.Count != existingItemIds.Count ||
                !incomingItemIds.SequenceEqual(existingItemIds);

            if (transfer.IsActive && structureChanged)
            {
                return BadRequest(new ApiResponse<bool>
                {
                    Success = false,
                    Message = "Cannot change Source/Destination or Items while Transfer is Active. Deactivate it first, then edit, then activate again."
                });
            }

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Update metadata (always allowed)
                transfer.Remarks = dto.Remarks;
                transfer.OutFor = dto.OutFor?.Trim();
                transfer.ReasonDetails = dto.ReasonDetails?.Trim();
                transfer.VehicleNo = dto.VehicleNo?.Trim();
                transfer.PersonName = dto.PersonName?.Trim();
                if (dto.TransferDate.HasValue) transfer.TransferDate = dto.TransferDate.Value;

                // Update item remarks (always allowed for existing items)
                var remarkByItemId = dto.Items.ToDictionary(x => x.ItemId, x => x.Remarks);
                foreach (var ti in transfer.Items)
                {
                    if (remarkByItemId.TryGetValue(ti.ItemId, out var r))
                        ti.Remarks = r;
                }

                // If inactive, allow structural edits (from/to/items)
                if (!transfer.IsActive && structureChanged)
                {
                        // Validate item availability at the NEW source
                        foreach (var itemId in incomingItemIds)
                        {
                            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.LocationId == locationId);
                            if (item == null)
                                return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item with ID {itemId} not found." });

                        if (dto.FromPartyId.HasValue)
                        {
                            if (item.CurrentProcess != ItemProcessState.AtVendor || item.CurrentPartyId != dto.FromPartyId.Value)
                                return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item '{item.MainPartName}' is not currently with the selected source party. Current state: {item.CurrentProcess}. One item can only be in one process at a time." });
                        }
                        else
                        {
                            if (item.CurrentProcess != ItemProcessState.InStock || item.LocationId != locationId)
                                return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item '{item.MainPartName}' is not currently in stock at this location. Current state: {item.CurrentProcess}. One item can only be in one process at a time." });
                        }
                    }

                    // Apply structural changes on transfer + items list
                    transfer.FromPartyId = dto.FromPartyId;
                    transfer.ToPartyId = dto.ToPartyId;

                    _context.TransferItems.RemoveRange(transfer.Items);
                    await _context.SaveChangesAsync();

                    foreach (var itemDto in dto.Items)
                    {
                        var item = await _context.Items.FindAsync(itemDto.ItemId);
                        _context.TransferItems.Add(new TransferItem
                        {
                            TransferId = transfer.Id,
                            ItemId = itemDto.ItemId,
                            Remarks = itemDto.Remarks,
                            ItemNameSnapshot = item?.CurrentName
                        });
                    }
                }

                // Move any temp attachments into final folder (TransferNo folder)
                var finalUrls = new List<string>();
                if (dto.AttachmentUrls != null && dto.AttachmentUrls.Any())
                {
                    var (compDir, locDir) = await GetStorageContextNames();
                    var finalBaseRel = Path.Combine("storage", compDir, locDir, "transfer", transfer.TransferNo);
                    var finalBaseAbs = Path.Combine(_env.WebRootPath, finalBaseRel);
                    if (!Directory.Exists(finalBaseAbs)) Directory.CreateDirectory(finalBaseAbs);

                    foreach (var url in dto.AttachmentUrls)
                    {
                        if (url.Contains("/transfer/temp/"))
                        {
                            var oldRel = url.TrimStart('/');
                            var oldAbs = Path.Combine(_env.WebRootPath, oldRel);
                            if (System.IO.File.Exists(oldAbs))
                            {
                                var fileName = Path.GetFileName(oldAbs);
                                var newAbs = Path.Combine(finalBaseAbs, fileName);
                                System.IO.File.Move(oldAbs, newAbs);

                                var tempFolder = Path.GetDirectoryName(oldAbs);
                                if (tempFolder != null && Directory.Exists(tempFolder) && !Directory.EnumerateFileSystemEntries(tempFolder).Any())
                                    Directory.Delete(tempFolder);

                                finalUrls.Add("/" + Path.Combine(finalBaseRel, fileName).Replace("\\", "/"));
                            }
                        }
                        else
                        {
                            finalUrls.Add(url);
                        }
                    }
                }
                transfer.AttachmentUrlsJson = JsonSerializer.Serialize(finalUrls);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message });
            }
        }

        [HttpPatch("{id}/active")]
        public async Task<ActionResult<ApiResponse<bool>>> ToggleActive(int id, [FromQuery] bool active)
        {
            if (!await IsAdmin()) return Forbidden();
            if (!await HasAllPermissions("ViewTransfer", "EditTransfer")) return Forbidden();
            var locationId = await GetCurrentLocationIdAsync();

            var transfer = await _context.Transfers
                .Include(t => t.Items)
                .ThenInclude(ti => ti.Item)
                .FirstOrDefaultAsync(t => t.Id == id && t.LocationId == locationId);

            if (transfer == null) return NotFound();
            if (transfer.IsActive == active) return Ok(new ApiResponse<bool> { Data = true });

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                var itemIds = transfer.Items.Select(x => x.ItemId).Distinct().ToList();

                foreach (var itemId in itemIds)
                {
                    var item = transfer.Items.FirstOrDefault(x => x.ItemId == itemId)?.Item;
                    if (item == null)
                        return BadRequest(new ApiResponse<bool> { Success = false, Message = $"Item with ID {itemId} not found." });

                    // PRODUCTION-LEVEL TRACEABILITY: 
                    // Verify if this is the LATEST active operation for this item across the whole system.
                    if (!active)
                    {
                        // PRODUCTION-LEVEL TRACEABILITY: 
                        // Cannot deactivate if a LATER active transaction exists for this item.
                        var (hasDescendant, txInfo) = await _itemState.CheckForDescendantTransactionsAsync(itemId, transfer.CreatedAt, transfer.Id, "Transfer");
                        if (hasDescendant)
                        {
                            return BadRequest(new ApiResponse<bool>
                            {
                                Success = false,
                                Message = $"Cannot deactivate Transfer {transfer.TransferNo}: Item '{item.MainPartName}' has a subsequent active operation: {txInfo}. You must deactivate the latest operation first to maintain traceability."
                            });
                        }

                        // Physical State Check: item must still be in destination state of this transfer, then rollback to source
                        if (transfer.ToPartyId.HasValue)
                        {
                            if (item.CurrentProcess != ItemProcessState.AtVendor || item.CurrentPartyId != transfer.ToPartyId.Value)
                            {
                                return BadRequest(new ApiResponse<bool>
                                {
                                    Success = false,
                                    Message = $"Cannot deactivate Transfer {transfer.TransferNo}: Item '{item.MainPartName}' is no longer at the destination party ({transfer.ToParty?.Name}). Current state: {item.CurrentProcess}."
                                });
                            }
                        }
                        else
                        {
                            if (item.CurrentProcess != ItemProcessState.InStock || item.LocationId != locationId)
                            {
                                return BadRequest(new ApiResponse<bool>
                                {
                                    Success = false,
                                    Message = $"Cannot deactivate Transfer {transfer.TransferNo}: Item '{item.MainPartName}' is no longer in stock at this location. Current state: {item.CurrentProcess}."
                                });
                            }
                        }

                        // Rollback to source
                        if (transfer.FromPartyId.HasValue)
                        {
                            item.CurrentLocationId = null;
                            item.CurrentPartyId = transfer.FromPartyId.Value;
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
                    else
                    {
                        // Activate: item must currently be at source state of this transfer, then apply destination
                        if (transfer.FromPartyId.HasValue)
                        {
                            if (item.CurrentProcess != ItemProcessState.AtVendor || item.CurrentPartyId != transfer.FromPartyId.Value)
                            {
                                return BadRequest(new ApiResponse<bool>
                                {
                                    Success = false,
                                    Message = $"Cannot activate Transfer {transfer.TransferNo}: Item '{item.MainPartName}' is not currently with the selected source party ({transfer.FromParty?.Name}). Current state: {item.CurrentProcess}."
                                });
                            }
                        }
                        else
                        {
                            if (item.CurrentProcess != ItemProcessState.InStock || item.LocationId != locationId)
                            {
                                return BadRequest(new ApiResponse<bool>
                                {
                                    Success = false,
                                    Message = $"Cannot activate Transfer {transfer.TransferNo}: Item '{item.MainPartName}' is not currently in stock at this location. Current state: {item.CurrentProcess}."
                                });
                            }
                        }

                        if (transfer.ToPartyId.HasValue)
                        {
                            item.CurrentLocationId = null;
                            item.CurrentPartyId = transfer.ToPartyId.Value;
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
                }

                transfer.IsActive = active;
                transfer.UpdatedAt = DateTime.Now;
                await _context.SaveChangesAsync();
                await tx.CommitAsync();

            return Ok(new ApiResponse<bool> { Data = true });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return BadRequest(new ApiResponse<bool> { Success = false, Message = ex.Message });
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
                // Only 'In Stock' items can be transferred out.
                query = query.Where(i => i.CurrentProcess == ItemProcessState.InStock);
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
            if (!await HasPermission("CreateTransfer") && !await HasPermission("EditTransfer")) return Forbidden();
            return Ok(new ApiResponse<string> { Data = await GenerateTransferNo() });
        }

        private async Task<string> GenerateTransferNo()
        {
            const string prefix = "TRF-";
            var allNumbers = await _context.Transfers
                .Where(t => t.TransferNo.StartsWith(prefix))
                .Select(t => t.TransferNo)
                .ToListAsync();

            int maxNum = 0;
            foreach (var no in allNumbers)
            {
                var parts = no.Split('-');
                if (parts.Length >= 2 && int.TryParse(parts[^1], out int n) && n > maxNum)
                    maxNum = n;
            }

            return prefix + (maxNum + 1).ToString("D4");
        }

        [HttpPost("upload-attachment")]
        public async Task<ActionResult<ApiResponse<object>>> UploadAttachment(IFormFile file)
        {
            if (!await HasPermission("CreateTransfer") && !await HasPermission("EditTransfer")) return Forbidden();
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
        public async Task<ActionResult<ApiResponse<bool>>> DeleteAttachment([FromQuery] string url)
        {
            if (!await HasPermission("CreateTransfer") && !await HasPermission("EditTransfer")) return Forbidden();
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
