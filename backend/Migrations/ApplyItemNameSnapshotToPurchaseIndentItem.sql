-- Run this script if the migration is not applied automatically (e.g. app running).
-- Adds ItemNameSnapshot to purchase_indent_items for correct display in old PI/PO after item rename.

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260313000000_AddItemNameSnapshotToPurchaseIndentItem')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[purchase_indent_items]') AND name = N'ItemNameSnapshot')
        ALTER TABLE [purchase_indent_items] ADD [ItemNameSnapshot] nvarchar(max) NULL;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260313000000_AddItemNameSnapshotToPurchaseIndentItem', N'6.0.35');
END
GO
