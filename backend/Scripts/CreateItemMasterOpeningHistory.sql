-- Run this script on your database if the table item_master_opening_history does not exist.
-- You can run it from SSMS, Azure Data Studio, or: sqlcmd -S your_server -d your_database -i CreateItemMasterOpeningHistory.sql

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'item_master_opening_history')
BEGIN
    CREATE TABLE [dbo].[item_master_opening_history] (
        [Id] int NOT NULL IDENTITY(1,1),
        [LocationId] int NOT NULL,
        [FilePath] nvarchar(500) NOT NULL,
        [OriginalFileName] nvarchar(255) NOT NULL,
        [ImportedAt] datetime2 NOT NULL,
        [ImportedByUserId] int NULL,
        [ItemsImportedCount] int NOT NULL,
        CONSTRAINT [PK_item_master_opening_history] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_item_master_opening_history_locations_LocationId] FOREIGN KEY ([LocationId]) REFERENCES [locations] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_item_master_opening_history_users_ImportedByUserId] FOREIGN KEY ([ImportedByUserId]) REFERENCES [users] ([Id]) ON DELETE SET NULL
    );

    CREATE INDEX [IX_item_master_opening_history_LocationId] ON [item_master_opening_history] ([LocationId]);
    CREATE INDEX [IX_item_master_opening_history_ImportedByUserId] ON [item_master_opening_history] ([ImportedByUserId]);

    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260306000000_AddItemMasterOpeningHistory', N'6.0.35');
END
GO
