-- Add IsActive column to purchase_orders if it does not exist.
-- Run this once if you get "Invalid column name 'IsActive'" before applying migrations.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.purchase_orders') AND name = 'IsActive'
)
BEGIN
    ALTER TABLE dbo.purchase_orders
    ADD IsActive bit NOT NULL DEFAULT 1;
END
GO
