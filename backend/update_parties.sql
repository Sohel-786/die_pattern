BEGIN TRANSACTION;
GO

ALTER TABLE [parties] ADD [AlternateNumber] nvarchar(max) NULL;
GO

ALTER TABLE [parties] ADD [ContactPerson] nvarchar(max) NULL;
GO

ALTER TABLE [parties] ADD [CustomerType] nvarchar(max) NULL;
GO

ALTER TABLE [parties] ADD [GstDate] datetime2 NULL;
GO

ALTER TABLE [parties] ADD [GstNo] nvarchar(max) NULL;
GO

ALTER TABLE [parties] ADD [PartyCategory] nvarchar(max) NULL;
GO

ALTER TABLE [parties] ADD [PartyCode] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260221072509_AddPartyFields', N'6.0.35');
GO

COMMIT;
GO

