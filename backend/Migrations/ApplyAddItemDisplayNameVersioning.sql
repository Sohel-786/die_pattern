-- Run this script on your database if "dotnet ef database update" cannot be run
-- (e.g. while the app is running). Then restart the app.
-- Adds columns for Item Master display name versioning (Job Work / Inward / QC / Transfers).

IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260312000000_AddItemDisplayNameVersioning')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[job_work_items]') AND name = N'WillChangeName')
        ALTER TABLE [job_work_items] ADD [WillChangeName] bit NOT NULL DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[job_work_items]') AND name = N'ProposedNewName')
        ALTER TABLE [job_work_items] ADD [ProposedNewName] nvarchar(max) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[job_work_items]') AND name = N'OriginalNameSnapshot')
        ALTER TABLE [job_work_items] ADD [OriginalNameSnapshot] nvarchar(max) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[inward_lines]') AND name = N'ItemNameSnapshot')
        ALTER TABLE [inward_lines] ADD [ItemNameSnapshot] nvarchar(max) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[inward_lines]') AND name = N'NewItemNameFromJobWork')
        ALTER TABLE [inward_lines] ADD [NewItemNameFromJobWork] nvarchar(max) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[transfer_items]') AND name = N'ItemNameSnapshot')
        ALTER TABLE [transfer_items] ADD [ItemNameSnapshot] nvarchar(max) NULL;

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'Source')
        ALTER TABLE [item_change_logs] ADD [Source] nvarchar(max) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'JobWorkId')
        ALTER TABLE [item_change_logs] ADD [JobWorkId] int NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'JobWorkItemId')
        ALTER TABLE [item_change_logs] ADD [JobWorkItemId] int NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'InwardId')
        ALTER TABLE [item_change_logs] ADD [InwardId] int NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'InwardLineId')
        ALTER TABLE [item_change_logs] ADD [InwardLineId] int NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'QcEntryId')
        ALTER TABLE [item_change_logs] ADD [QcEntryId] int NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[item_change_logs]') AND name = N'RevertedFromLogId')
        ALTER TABLE [item_change_logs] ADD [RevertedFromLogId] int NULL;

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260312000000_AddItemDisplayNameVersioning', N'6.0.35');
END
GO
