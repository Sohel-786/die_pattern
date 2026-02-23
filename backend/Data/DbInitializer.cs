using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            try
            {
                context.Database.Migrate();
            }
            catch (Exception ex)
            {
                // Handle cases where database is already created but __EFMigrationsHistory is out of sync
                Console.WriteLine($"Migration skipped or failed: {ex.Message}");
                try {
                    // Create history table if it doesn't exist
                    context.Database.ExecuteSqlRaw(@"
                        IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
                        CREATE TABLE [__EFMigrationsHistory] (
                            [MigrationId] nvarchar(150) NOT NULL,
                            [ProductVersion] nvarchar(32) NOT NULL,
                            CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
                        );
                    ");

                    // Mark migrations as applied if the tables already exist
                    context.Database.ExecuteSqlRaw(@"
                        IF OBJECT_ID(N'[app_settings]', 'U') IS NOT NULL
                        BEGIN
                            IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260221042232_InitialCreate')
                                INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ('20260221042232_InitialCreate', '6.0.35');
                            
                            IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = '20260221072509_AddPartyFields')
                                INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ('20260221072509_AddPartyFields', '6.0.35');
                        END
                    ");

                    context.Database.ExecuteSqlRaw(@"
                        IF COL_LENGTH('parties', 'ContactPerson') IS NULL ALTER TABLE [parties] ADD [ContactPerson] nvarchar(max) NULL;
                        IF COL_LENGTH('parties', 'CustomerType') IS NULL ALTER TABLE [parties] ADD [CustomerType] nvarchar(max) NULL;
                        IF COL_LENGTH('parties', 'GstDate') IS NULL ALTER TABLE [parties] ADD [GstDate] datetime2 NULL;
                        IF COL_LENGTH('parties', 'GstNo') IS NULL ALTER TABLE [parties] ADD [GstNo] nvarchar(max) NULL;
                        IF COL_LENGTH('parties', 'PartyCategory') IS NULL ALTER TABLE [parties] ADD [PartyCategory] nvarchar(max) NULL;
                        IF COL_LENGTH('parties', 'PartyCode') IS NULL ALTER TABLE [parties] ADD [PartyCode] nvarchar(max) NULL;
                    ");
                    Console.WriteLine("Manual patch and migration history synchronization applied successfully.");
                } catch (Exception patchEx) {
                    Console.WriteLine($"Patch failed: {patchEx.Message}");
                }
            }

            // 1. Ensure Admin User Exists
            var adminUser = context.Users.FirstOrDefault(u => u.Username == "mitul");
            if (adminUser == null)
            {
                adminUser = new User 
                { 
                    Username = "mitul", 
                    Password = BCrypt.Net.BCrypt.HashPassword("admin"), 
                    FirstName = "Mitul", 
                    LastName = "Admin", 
                    Role = Role.ADMIN, 
                    IsActive = true, 
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                };
                context.Users.Add(adminUser);
                context.SaveChanges();
            }

            // 2. Refresh Permissions for Admin
            var adminPerm = context.UserPermissions.FirstOrDefault(p => p.UserId == adminUser.Id);
            if (adminPerm == null)
            {
                adminPerm = new UserPermission { UserId = adminUser.Id };
                context.UserPermissions.Add(adminPerm);
            }
            
            adminPerm.ViewDashboard = true;
            adminPerm.ViewMaster = true;
            
            adminPerm.ManageItem = true;
            adminPerm.ManageItemType = true;
            adminPerm.ManageMaterial = true;
            adminPerm.ManageItemStatus = true;
            adminPerm.ManageOwnerType = true;
            adminPerm.ManageParty = true;
            adminPerm.ManageLocation = true;
            adminPerm.ManageCompany = true;

            adminPerm.ViewPI = true;
            adminPerm.CreatePI = true;
            adminPerm.EditPI = true;
            adminPerm.ApprovePI = true;

            adminPerm.ViewPO = true;
            adminPerm.CreatePO = true;
            adminPerm.EditPO = true;
            adminPerm.ApprovePO = true;

            adminPerm.ViewInward = true;
            adminPerm.CreateInward = true;
            adminPerm.EditInward = true;

            adminPerm.ViewQC = true;
            adminPerm.CreateQC = true;
            adminPerm.EditQC = true;
            adminPerm.ApproveQC = true;

            adminPerm.ViewMovement = true;
            adminPerm.CreateMovement = true;
            adminPerm.ManageChanges = true;
            adminPerm.RevertChanges = true;
            adminPerm.ViewReports = true;
            adminPerm.ManageUsers = true;
            adminPerm.AccessSettings = true;
            
            context.SaveChanges();

            // 3. Seed App Settings
            var settings = context.AppSettings.FirstOrDefault();
            if (settings == null)
            {
                context.AppSettings.Add(new AppSettings 
                { 
                    CompanyName = "Aira Euro Automation Pvt Ltd", 
                    SoftwareName = "Die & Pattern Management",
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                });
                context.SaveChanges();
            }

            // 4. Seed Initial Masters if empty
            if (!context.ItemTypes.Any())
            {
                context.ItemTypes.AddRange(new ItemType[] {
                    new ItemType { Name = "Die" },
                    new ItemType { Name = "Pattern" }
                });
            }

            if (!context.ItemStatuses.Any())
            {
                context.ItemStatuses.AddRange(new ItemStatus[] {
                    new ItemStatus { Name = "New" },
                    new ItemStatus { Name = "Under Repair" },
                    new ItemStatus { Name = "Good Condition" },
                    new ItemStatus { Name = "Scrapped" }
                });
            }

            if (!context.Materials.Any())
            {
                context.Materials.AddRange(new Material[] {
                    new Material { Name = "Aluminium" },
                    new Material { Name = "Cast Iron" },
                    new Material { Name = "Steel" }
                });
            }

            if (!context.OwnerTypes.Any())
            {
                context.OwnerTypes.AddRange(new OwnerType[] {
                    new OwnerType { Name = "Customer" },
                    new OwnerType { Name = "In-House" }
                });
            }

            context.SaveChanges();
        }
    }
}
