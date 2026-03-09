using net_backend.Models;

namespace net_backend.Services
{
    public interface IItemStateService
    {
        /// <summary>Gets the current process state of an item. One item can only be in one state at a time.</summary>
        /// <param name="itemId">Item id.</param>
        /// <param name="excludePurchaseIndentId">When updating a PI, pass its id so items already in this PI are treated as allowed (InPI for this indent).</param>
        Task<ItemProcessState> GetStateAsync(int itemId, int? excludePurchaseIndentId = null);

        /// <summary>Returns true if the item can be added to a PI (state is NotInStock; when editing, items only in the excluded PI are treated as NotInStock).</summary>
        Task<bool> CanAddToPIAsync(int itemId, int? excludePurchaseIndentId = null);

        /// <summary>Returns true if the item can be used in In-Stock-only transactions (Jobwork etc.).</summary>
        Task<bool> IsInStockAsync(int itemId);

        /// <summary>Returns true if the item has ever been part of any transaction (PI, PO, Inward, Job Work, Transfer). Used to block manual process-state correction after first use.</summary>
        Task<bool> HasAnyTransactionHistoryAsync(int itemId);

        /// <summary>Returns a user-friendly string representation of the process state.</summary>
        string GetStateDisplay(ItemProcessState state);

        /// <summary>
        /// Checks if there's any active transaction for an item that was created AFTER the specified transaction.
        /// This is the core logic for production-level traceability: we cannot deactivate an entry if it's already been succeeded by another active operation.
        /// </summary>
        /// <returns>(True, Message) if a descendant exists, (False, "")- otherwise.</returns>
        Task<(bool, string)> CheckForDescendantTransactionsAsync(int itemId, DateTime transactionCreatedAt, int transactionId, string transactionType);
    }
}
