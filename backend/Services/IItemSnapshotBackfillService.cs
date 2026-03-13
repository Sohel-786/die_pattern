namespace net_backend.Services
{
    /// <summary>Resolves item display name at a point in time (from change history) and backfills null snapshots for traceability.</summary>
    public interface IItemSnapshotBackfillService
    {
        /// <summary>Gets the item's display name as it was at the given time, using ItemChangeLog. If no changes before atTime, uses earliest OldName; if no logs, uses current name.</summary>
        Task<string?> GetDisplayNameAtTimeAsync(int itemId, DateTime atTime, CancellationToken cancellationToken = default);

        /// <summary>Backfills null snapshot columns on JobWorkItem, InwardLine, PurchaseIndentItem, TransferItem using change history. Safe to run multiple times.</summary>
        Task BackfillNullSnapshotsAsync(CancellationToken cancellationToken = default);
    }
}
