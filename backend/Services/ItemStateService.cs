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
    }
}
