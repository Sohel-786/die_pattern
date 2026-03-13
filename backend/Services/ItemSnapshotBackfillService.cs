using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

namespace net_backend.Services
{
    /// <summary>Resolves item display name at a point in time from ItemChangeLog and backfills null snapshots for production traceability.</summary>
    public class ItemSnapshotBackfillService : IItemSnapshotBackfillService
    {
        private readonly ApplicationDbContext _context;

        public ItemSnapshotBackfillService(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <inheritdoc />
        public async Task<string?> GetDisplayNameAtTimeAsync(int itemId, DateTime atTime, CancellationToken cancellationToken = default)
        {
            var logs = await _context.ItemChangeLogs
                .Where(l => l.ItemId == itemId)
                .OrderBy(l => l.CreatedAt)
                .Select(l => new { l.OldName, l.NewName, l.CreatedAt })
                .ToListAsync(cancellationToken);

            if (logs.Count == 0)
            {
                var item = await _context.Items
                    .Where(i => i.Id == itemId)
                    .Select(i => i.CurrentName)
                    .FirstOrDefaultAsync(cancellationToken);
                return item;
            }

            var lastChangeBeforeOrAt = logs.LastOrDefault(l => l.CreatedAt <= atTime);
            if (lastChangeBeforeOrAt != null)
                return lastChangeBeforeOrAt.NewName;

            return logs[0].OldName;
        }

        /// <inheritdoc />
        public async Task BackfillNullSnapshotsAsync(CancellationToken cancellationToken = default)
        {
            await BackfillJobWorkItemsAsync(cancellationToken);
            await BackfillInwardLinesAsync(cancellationToken);
            await BackfillPurchaseIndentItemsAsync(cancellationToken);
            await BackfillTransferItemsAsync(cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        private async Task BackfillJobWorkItemsAsync(CancellationToken ct)
        {
            var nulls = await _context.JobWorkItems
                .Include(j => j.JobWork)
                .Where(j => j.OriginalNameSnapshot == null && j.JobWork != null)
                .ToListAsync(ct);
            foreach (var j in nulls)
            {
                var at = j.JobWork!.CreatedAt;
                j.OriginalNameSnapshot = await GetDisplayNameAtTimeAsync(j.ItemId, at, ct);
            }
        }

        private async Task BackfillInwardLinesAsync(CancellationToken ct)
        {
            var nulls = await _context.InwardLines
                .Include(l => l.Inward)
                .Where(l => l.ItemNameSnapshot == null && l.Inward != null)
                .ToListAsync(ct);
            foreach (var l in nulls)
            {
                var at = l.Inward!.CreatedAt;
                l.ItemNameSnapshot = await GetDisplayNameAtTimeAsync(l.ItemId, at, ct);
            }
        }

        private async Task BackfillPurchaseIndentItemsAsync(CancellationToken ct)
        {
            var nulls = await _context.PurchaseIndentItems
                .Include(p => p.PurchaseIndent)
                .Where(p => p.ItemNameSnapshot == null && p.PurchaseIndent != null)
                .ToListAsync(ct);
            foreach (var p in nulls)
            {
                var at = p.PurchaseIndent!.CreatedAt;
                p.ItemNameSnapshot = await GetDisplayNameAtTimeAsync(p.ItemId, at, ct);
            }
        }

        private async Task BackfillTransferItemsAsync(CancellationToken ct)
        {
            var nulls = await _context.TransferItems
                .Include(t => t.Transfer)
                .Where(t => t.ItemNameSnapshot == null && t.Transfer != null)
                .ToListAsync(ct);
            foreach (var t in nulls)
            {
                var at = t.Transfer!.CreatedAt;
                t.ItemNameSnapshot = await GetDisplayNameAtTimeAsync(t.ItemId, at, ct);
            }
        }
    }
}
