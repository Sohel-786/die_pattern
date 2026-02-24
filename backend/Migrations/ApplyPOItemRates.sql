-- Run this script manually if Migrate() did not apply the migration.
-- Adds Rate, Quantity, Weight to purchase_order_items and removes Rate from purchase_orders.

-- Add columns to purchase_order_items
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'Rate')
    ALTER TABLE purchase_order_items ADD Rate DECIMAL(18,2) NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'Quantity')
    ALTER TABLE purchase_order_items ADD Quantity INT NOT NULL DEFAULT 1;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'Weight')
    ALTER TABLE purchase_order_items ADD Weight DECIMAL(18,4) NULL;

-- Migrate: copy PO-level rate to items (divide by item count per PO)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_orders') AND name = 'Rate')
BEGIN
    WITH ItemCounts AS (
        SELECT PurchaseOrderId, COUNT(*) AS Cnt FROM purchase_order_items GROUP BY PurchaseOrderId
    )
    UPDATE poi SET poi.Rate = CASE WHEN ic.Cnt > 0 THEN ISNULL(po.Rate, 0) / ic.Cnt ELSE 0 END
    FROM purchase_order_items poi
    INNER JOIN purchase_orders po ON poi.PurchaseOrderId = po.Id
    INNER JOIN ItemCounts ic ON ic.PurchaseOrderId = po.Id
    WHERE po.Rate IS NOT NULL;
END

-- Drop Rate from purchase_orders
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_orders') AND name = 'Rate')
    ALTER TABLE purchase_orders DROP COLUMN Rate;

-- Record migration in EF history (so Migrate() won't try to run it again)
IF NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory WHERE MigrationId = N'20260224100000_AddPOQuotationGstDraft')
    INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES (N'20260224100000_AddPOQuotationGstDraft', '6.0.35');
IF NOT EXISTS (SELECT 1 FROM __EFMigrationsHistory WHERE MigrationId = N'20260224120000_AddPOItemRatesAndRemovePORate')
    INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion) VALUES (N'20260224120000_AddPOItemRatesAndRemovePORate', '6.0.35');
