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

        /// <summary>Returns true if the item can be used in In-Stock-only transactions (Jobwork, Outward, etc.).</summary>
        Task<bool> IsInStockAsync(int itemId);

        /// <summary>Returns a user-friendly string representation of the process state.</summary>
        string GetStateDisplay(ItemProcessState state);
    }
}
