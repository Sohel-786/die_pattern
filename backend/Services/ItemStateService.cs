using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

namespace net_backend.Services
{
    public class ItemStateService : IItemStateService
    {
        private readonly ApplicationDbContext _context;

        public ItemStateService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<ItemProcessState> GetStateAsync(int itemId, int? excludePurchaseIndentId = null)
        {
            var item = await _context.Items.AsNoTracking().FirstOrDefaultAsync(i => i.Id == itemId);
            if (item == null) return ItemProcessState.NotInStock;

            // If we are checking during PI editing, and the item's current state is InPI, 
            // we should allow it if it's in the current PI we are editing.
            if (excludePurchaseIndentId.HasValue && item.CurrentProcess == ItemProcessState.InPI)
            {
                var inThisPi = await _context.PurchaseIndentItems
                    .AsNoTracking()
                    .AnyAsync(pii => pii.ItemId == itemId && pii.PurchaseIndentId == excludePurchaseIndentId.Value);
                if (inThisPi) return ItemProcessState.NotInStock;
            }

            return item.CurrentProcess;
        }

        public async Task<bool> CanAddToPIAsync(int itemId, int? excludePurchaseIndentId = null)
        {
            var state = await GetStateAsync(itemId, excludePurchaseIndentId);
            return state == ItemProcessState.NotInStock;
        }

        public async Task<bool> IsInStockAsync(int itemId)
        {
            var state = await GetStateAsync(itemId);
            return state == ItemProcessState.InStock;
        }

        public async Task<bool> HasAnyTransactionHistoryAsync(int itemId)
        {
            if (await _context.PurchaseIndentItems.AnyAsync(pii => pii.ItemId == itemId))
                return true;

            var piItemIdsForItem = await _context.PurchaseIndentItems.Where(pii => pii.ItemId == itemId).Select(pii => pii.Id).ToListAsync();
            if (piItemIdsForItem.Count > 0 && await _context.PurchaseOrderItems.AnyAsync(poi => piItemIdsForItem.Contains(poi.PurchaseIndentItemId)))
                return true;

            if (await _context.InwardLines.AnyAsync(l => l.ItemId == itemId))
                return true;
            if (await _context.JobWorkItems.AnyAsync(j => j.ItemId == itemId))
                return true;
            if (await _context.TransferItems.AnyAsync(t => t.ItemId == itemId))
                return true;
            return false;
        }

        public string GetStateDisplay(ItemProcessState state)
        {
            return state switch
            {
                ItemProcessState.NotInStock => "Not In Stock",
                ItemProcessState.InPI => "PI Issued",
                ItemProcessState.InPO => "PO Issued",
                ItemProcessState.InwardDone => "Inward Done",
                ItemProcessState.InQC => "In QC",
                ItemProcessState.InJobwork => "In Job Work",
                ItemProcessState.AtVendor => "At Vendor",
                ItemProcessState.InStock => "In Stock",
                _ => "Not In Stock"
            };
        }

        public async Task<(bool, string)> CheckForDescendantTransactionsAsync(int itemId, DateTime transactionCreatedAt, int transactionId, string transactionType)
        {
            // Transaction Types used here as generic identifiers for descendants:
            // Transfer, Inward, JobWork, QC, PI, PO (PO depends on PI)

            // 1. Check newer Transfers (excluding the currently processing one if it's a Transfer)
            var laterTransfer = await _context.TransferItems
                .AsNoTracking()
                .Include(ti => ti.Transfer)
                .Where(ti => ti.ItemId == itemId && ti.Transfer!.IsActive && 
                       ti.TransferId != (transactionType == "Transfer" ? transactionId : -1) &&
                       (ti.Transfer!.CreatedAt > transactionCreatedAt || (ti.Transfer!.CreatedAt == transactionCreatedAt && ti.TransferId > transactionId)))
                .OrderBy(ti => ti.Transfer!.CreatedAt)
                .Select(ti => new { ti.Transfer!.TransferNo, ti.Transfer!.CreatedAt, ti.TransferId })
                .FirstOrDefaultAsync();
            if (laterTransfer != null) return (true, $"Transfer {laterTransfer.TransferNo} (created {laterTransfer.CreatedAt:dd-MMM-yyyy HH:mm:ss})");

            // 2. Check newer Inwards
            var laterInward = await _context.InwardLines
                .AsNoTracking()
                .Include(l => l.Inward)
                .Where(l => l.ItemId == itemId && l.Inward!.IsActive && 
                       l.InwardId != (transactionType == "Inward" ? transactionId : -1) &&
                       (l.Inward!.CreatedAt > transactionCreatedAt || (l.Inward!.CreatedAt == transactionCreatedAt && l.InwardId > transactionId)))
                .OrderBy(l => l.Inward!.CreatedAt)
                .Select(l => new { l.Inward!.InwardNo, l.Inward!.CreatedAt })
                .FirstOrDefaultAsync();
            if (laterInward != null) return (true, $"Inward {laterInward.InwardNo} (created {laterInward.CreatedAt:dd-MMM-yyyy HH:mm:ss})");

            // 3. Check newer Job Works
            var laterJobwork = await _context.JobWorkItems
                .AsNoTracking()
                .Include(jwi => jwi.JobWork)
                .Where(jwi => jwi.ItemId == itemId && jwi.JobWork!.IsActive && 
                       jwi.JobWorkId != (transactionType == "JobWork" ? transactionId : -1) &&
                       (jwi.JobWork!.CreatedAt > transactionCreatedAt || (jwi.JobWork!.CreatedAt == transactionCreatedAt && jwi.JobWorkId > transactionId)))
                .OrderBy(jwi => jwi.JobWork!.CreatedAt)
                .Select(jwi => new { jwi.JobWork!.JobWorkNo, jwi.JobWork!.CreatedAt })
                .FirstOrDefaultAsync();
            if (laterJobwork != null) return (true, $"Job Work {laterJobwork.JobWorkNo} (created {laterJobwork.CreatedAt:dd-MMM-yyyy HH:mm:ss})");

            // 4. Check newer QC Entries
            var laterQC = await _context.QcItems
                .AsNoTracking()
                .Include(qi => qi.QcEntry)
                .Where(qi => qi.InwardLine!.ItemId == itemId && qi.QcEntry!.IsActive && 
                       qi.QcEntryId != (transactionType == "QC" ? transactionId : -1) &&
                       (qi.QcEntry!.CreatedAt > transactionCreatedAt || (qi.QcEntry!.CreatedAt == transactionCreatedAt && qi.QcEntryId > transactionId)))
                .OrderBy(qi => qi.QcEntry!.CreatedAt)
                .Select(qi => new { qi.QcEntry!.QcNo, qi.QcEntry!.CreatedAt })
                .FirstOrDefaultAsync();
            if (laterQC != null) return (true, $"QC Entry {laterQC.QcNo} (created {laterQC.CreatedAt:dd-MMM-yyyy HH:mm:ss})");

            return (false, string.Empty);
        }
    }
}
