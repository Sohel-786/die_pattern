-- Run this script against your database if the migration could not be applied
-- (e.g. when the backend is running and dotnet ef database update fails).
-- Creates the location_transfer_settings table.

IF OBJECT_ID(N'dbo.location_transfer_settings', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[location_transfer_settings] (
        [LocationId] INT NOT NULL,
        [AllowVendorToVendorTransfer] BIT NOT NULL,
        [UpdatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [PK_location_transfer_settings] PRIMARY KEY ([LocationId]),
        CONSTRAINT [FK_location_transfer_settings_locations_LocationId] 
            FOREIGN KEY ([LocationId]) REFERENCES [dbo].[locations] ([Id]) ON DELETE CASCADE
    );
END
GO
