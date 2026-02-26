using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Ensures default company and location (id 1) exist and sets all existing data to them.</summary>
    [Migration("20260226180000_SetExistingDataToCompanyAndLocationOne")]
    public partial class SetExistingDataToCompanyAndLocationOne : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure default company and location exist (id 1) for initial setup and data migration
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM [companies] WHERE [Id] = 1)
                BEGIN
                    SET IDENTITY_INSERT [companies] ON;
                    INSERT INTO [companies] ([Id], [Name], [IsActive], [CreatedAt], [UpdatedAt])
                    VALUES (1, N'Aira Euro Automation Pvt Ltd', 1, GETUTCDATE(), GETUTCDATE());
                    SET IDENTITY_INSERT [companies] OFF;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM [locations] WHERE [Id] = 1)
                BEGIN
                    SET IDENTITY_INSERT [locations] ON;
                    INSERT INTO [locations] ([Id], [Name], [CompanyId], [IsActive], [CreatedAt], [UpdatedAt])
                    VALUES (1, N'Aira Ho', 1, 1, GETUTCDATE(), GETUTCDATE());
                    SET IDENTITY_INSERT [locations] OFF;
                END
            ");

            // Assign all existing data to company/location id 1 so it appears when that location is selected
            migrationBuilder.Sql("UPDATE [parties] SET [LocationId] = 1 WHERE [LocationId] IS NULL OR [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [items] SET [LocationId] = 1 WHERE [LocationId] IS NULL OR [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [purchase_orders] SET [LocationId] = 1 WHERE [LocationId] IS NULL OR [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [job_works] SET [LocationId] = 1 WHERE [LocationId] IS NULL OR [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [inwards] SET [LocationId] = 1 WHERE [LocationId] IS NULL OR [LocationId] = 0");

            // Set user defaults to company 1 and location 1 where not set
            migrationBuilder.Sql(@"
                UPDATE [users]
                SET [DefaultCompanyId] = 1, [DefaultLocationId] = 1, [UpdatedAt] = GETUTCDATE()
                WHERE ([DefaultCompanyId] IS NULL OR [DefaultLocationId] IS NULL)
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reversible data migration; schema unchanged
        }
    }
}
