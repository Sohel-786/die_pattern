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

            // 1. Seed default Company and Location first so all data can be scoped to them (target id 1 when DB is empty)
            if (!context.Companies.Any())
            {
                context.Companies.Add(new Company
                {
                    Name = "Aira Euro Automation Pvt Ltd",
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            if (!context.Locations.Any())
            {
                var companyId = context.Companies.OrderBy(c => c.Id).First().Id;
                context.Locations.Add(new Location
                {
                    Name = "Aira Ho",
                    CompanyId = companyId,
                    IsActive = true,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                });
                context.SaveChanges();
            }

            var seedCompanyId = context.Companies.OrderBy(c => c.Id).First().Id;
            var seedLocationId = context.Locations.Where(l => l.CompanyId == seedCompanyId).OrderBy(l => l.Id).First().Id;

            // 2. Ensure Admin User Exists
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
                    DefaultCompanyId = seedCompanyId,
                    DefaultLocationId = seedLocationId,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                context.Users.Add(adminUser);
                context.SaveChanges();
            }
            else
            {
                if (adminUser.DefaultCompanyId == null || adminUser.DefaultLocationId == null)
                {
                    adminUser.DefaultCompanyId = seedCompanyId;
                    adminUser.DefaultLocationId = seedLocationId;
                    adminUser.UpdatedAt = DateTime.Now;
                    context.SaveChanges();
                }
            }

            // 3. Refresh Permissions for Admin
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

            // 5. Assign all existing data to default company/location so it appears when that location is selected
            try
            {
                var partiesToFix = context.Parties.Where(p => p.LocationId == null || p.LocationId == 0).ToList();
                foreach (var p in partiesToFix) { p.LocationId = seedLocationId; }
                var itemsToFix = context.Items.Where(i => i.LocationId == null || i.LocationId == 0).ToList();
                foreach (var i in itemsToFix) { i.LocationId = seedLocationId; }
                var posToFix = context.PurchaseOrders.Where(po => po.LocationId == null || po.LocationId == 0).ToList();
                foreach (var po in posToFix) { po.LocationId = seedLocationId; }
                var jwToFix = context.JobWorks.Where(j => j.LocationId == null || j.LocationId == 0).ToList();
                foreach (var j in jwToFix) { j.LocationId = seedLocationId; }
                var inwardsToFix = context.Inwards.Where(i => i.LocationId == 0).ToList();
                foreach (var i in inwardsToFix) { i.LocationId = seedLocationId; }
                if (partiesToFix.Count > 0 || itemsToFix.Count > 0 || posToFix.Count > 0 || jwToFix.Count > 0 || inwardsToFix.Count > 0)
                {
                    context.SaveChanges();
                    Console.WriteLine($"Location backfill: assigned {partiesToFix.Count} parties, {itemsToFix.Count} items, {posToFix.Count} POs, {jwToFix.Count} job works, {inwardsToFix.Count} inwards to location {seedLocationId}.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Location data backfill skipped: {ex.Message}");
            }

            // 6. Location-scoped app: ensure every user has at least one UserLocationAccess (backfill using seed company/location)
            try
            {
                foreach (var user in context.Users.ToList())
                {
                    if (!context.UserLocationAccess.Any(ula => ula.UserId == user.Id))
                    {
                        context.UserLocationAccess.Add(new UserLocationAccess
                        {
                            UserId = user.Id,
                            CompanyId = seedCompanyId,
                            LocationId = seedLocationId,
                            CreatedAt = DateTime.Now
                        });
                        if (user.DefaultCompanyId == null || user.DefaultLocationId == null)
                        {
                            user.DefaultCompanyId = seedCompanyId;
                            user.DefaultLocationId = seedLocationId;
                            user.UpdatedAt = DateTime.Now;
                        }
                    }
                }
                context.SaveChanges();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"User location access backfill skipped: {ex.Message}");
            }
            // 7. Fix existing Inward QC statuses (fallback for records created before the pending flag fix)
            try
            {
                var movementsToFix = context.Movements
                    .Where(m => m.Type == MovementType.Inward && !m.IsQCPending && !m.IsQCApproved)
                    .ToList();
                
                if (movementsToFix.Any())
                {
                    foreach (var m in movementsToFix)
                    {
                        m.IsQCPending = true;
                    }
                    context.SaveChanges();
                    Console.WriteLine($"QC Status backfill: marked {movementsToFix.Count} inward movements as Pending QC.");
                }

                // 8. Backfill InwardLine snapshots
                var linesToFix = context.InwardLines
                    .Include(l => l.Item)
                        .ThenInclude(i => i!.ItemType)
                    .Include(l => l.Item)
                        .ThenInclude(i => i!.Material)
                    .Where(l => l.ItemTypeName == null)
                    .ToList();

                if (linesToFix.Any())
                {
                    foreach (var l in linesToFix)
                    {
                        if (l.Item != null)
                        {
                            l.ItemTypeName = l.ItemTypeName ?? l.Item.ItemType?.Name;
                            l.MaterialName = l.MaterialName ?? l.Item.Material?.Name;
                            l.DrawingNo = l.DrawingNo ?? l.Item.DrawingNo;
                            l.RevisionNo = l.RevisionNo ?? l.Item.RevisionNo;
                        }
                    }
                    context.SaveChanges();
                    Console.WriteLine($"InwardLine snapshot backfill: updated {linesToFix.Count} lines.");
                }

                // 9. Backfill missing MovementIds on InwardLines
                var linesWithoutMovements = context.InwardLines
                    .Include(l => l.Inward)
                    .Where(l => l.MovementId == null)
                    .ToList();

                if (linesWithoutMovements.Any())
                {
                    foreach (var l in linesWithoutMovements)
                    {
                        // Try to find an existing Inward movement for this item and inward
                        var existingMov = context.Movements.FirstOrDefault(m => m.InwardId == l.InwardId && m.ItemId == l.ItemId && m.Type == MovementType.Inward);
                        if (existingMov != null)
                        {
                            l.MovementId = existingMov.Id;
                        }
                    }
                    context.SaveChanges();
                    Console.WriteLine($"InwardLine MovementId backfill: updated {linesWithoutMovements.Count(l => l.MovementId != null)} lines.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Backfill patch skipped: {ex.Message}");
            }
        }
    }
}
