-- Run this script on your database (DiePattern_DB) to add the missing Company columns.
--
-- OPTION A - SQL Server Management Studio (SSMS):
--   1. Open SSMS, connect to SOHEL\SQLEXPRESS, open DiePattern_DB.
--   2. Open this file and execute (F5).
--
-- OPTION B - After stopping the backend, run in backend folder:
--   dotnet ef database update
--
-- OPTION C - Command line (from backend folder):
--   sqlcmd -S SOHEL\SQLEXPRESS -d DiePattern_DB -C -i "Migrations\AddCompanyMasterFields_Manual.sql"
--   (-C means trust server certificate)

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Pan')
    ALTER TABLE [dbo].[companies] ADD [Pan] nvarchar(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'State')
    ALTER TABLE [dbo].[companies] ADD [State] nvarchar(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'City')
    ALTER TABLE [dbo].[companies] ADD [City] nvarchar(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Pincode')
    ALTER TABLE [dbo].[companies] ADD [Pincode] nvarchar(20) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Phone')
    ALTER TABLE [dbo].[companies] ADD [Phone] nvarchar(30) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Email')
    ALTER TABLE [dbo].[companies] ADD [Email] nvarchar(255) NULL;

-- Record that this migration was applied (so future 'dotnet ef database update' doesn't try to re-apply it)
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20260224160000_AddCompanyMasterFields')
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260224160000_AddCompanyMasterFields', N'6.0.35');
