-- Fix duplicate JobWorkNo error: allow same number per location (e.g. JW-0001 at Location A and Location B).
-- Run this on your database (SSMS, Azure Data Studio, or: sqlcmd -S server -d database -i FixJobWorkUniqueIndex.sql)
-- You can run it while the app is running.

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_job_works_JobWorkNo' AND object_id = OBJECT_ID(N'dbo.job_works'))
BEGIN
    DROP INDEX [IX_job_works_JobWorkNo] ON [dbo].[job_works];
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_job_works_LocationId_JobWorkNo' AND object_id = OBJECT_ID(N'dbo.job_works'))
BEGIN
    CREATE UNIQUE INDEX [IX_job_works_LocationId_JobWorkNo] ON [dbo].[job_works] ([LocationId], [JobWorkNo]);
END
GO

IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = N'20250309100000_JobWorkCompositeUniqueIndex')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20250309100000_JobWorkCompositeUniqueIndex', N'6.0.35');
END
GO
