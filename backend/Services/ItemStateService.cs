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

            // In PO: item appears in any active PO (via PurchaseIndentItem -> PurchaseOrderItem)
            var inPo = await _context.PurchaseOrderItems
                .AsNoTracking()
                .Where(poi => poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive)
                .AnyAsync(poi => poi.PurchaseIndentItem!.ItemId == itemId);
            if (inPo) return ItemProcessState.InPO;

            // In PI: item in an active PI (IsActive + Pending/Approved) and that PI line is not in any active PO; exclude current PI when editing
            var activeStatuses = new[] { PurchaseIndentStatus.Pending, PurchaseIndentStatus.Approved };
            var inPi = await _context.PurchaseIndentItems
                .AsNoTracking()
                .Where(pii => pii.ItemId == itemId && pii.PurchaseIndent != null && pii.PurchaseIndent.IsActive && activeStatuses.Contains(pii.PurchaseIndent.Status))
                .Where(pii => excludePurchaseIndentId == null || pii.PurchaseIndentId != excludePurchaseIndentId)
                .AnyAsync(pii => !_context.PurchaseOrderItems.Any(poi => poi.PurchaseIndentItemId == pii.Id && poi.PurchaseOrder != null && poi.PurchaseOrder.IsActive));
            if (inPi) return ItemProcessState.InPI;

            // In QC: item has a movement with QC pending
            var inQc = await _context.Movements
                .AsNoTracking()
                .AnyAsync(m => m.ItemId == itemId && m.IsQCPending);
            if (inQc) return ItemProcessState.InQC;

            // In Jobwork
            var inJw = await _context.JobWorks.AsNoTracking().AnyAsync(j => j.ItemId == itemId);
            if (inJw) return ItemProcessState.InJobwork;

            if (item.CurrentHolderType == HolderType.NotInStock) return ItemProcessState.NotInStock;
            if (item.CurrentHolderType == HolderType.Vendor) return ItemProcessState.Outward;
            if (item.CurrentHolderType == HolderType.Location) return ItemProcessState.InStock;

            return ItemProcessState.NotInStock;
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
