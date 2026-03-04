-- Run this script to add the report permission columns if the migration was not applied.
-- Database: DiePattern_DB (or your database name from ConnectionStrings)
-- Run in SQL Server Management Studio, Azure Data Studio, or: sqlcmd -S YOUR_SERVER -d DiePattern_DB -E -i AddReportPermissionColumns.sql

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewPIPReport')
BEGIN
    ALTER TABLE user_permissions ADD ViewPIPReport bit NOT NULL DEFAULT 0;
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewInwardReport')
BEGIN
    ALTER TABLE user_permissions ADD ViewInwardReport bit NOT NULL DEFAULT 0;
END
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewItemLedgerReport')
BEGIN
    ALTER TABLE user_permissions ADD ViewItemLedgerReport bit NOT NULL DEFAULT 0;
END
GO
