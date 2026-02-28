using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            // 1. Seed default Company and Location first
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
                var firstCompany = context.Companies.OrderBy(c => c.Id).First();
                context.Locations.Add(new Location
                {
                    Name = "Aira Ho",
                    CompanyId = firstCompany.Id,
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
                    FirstName = "Mitul",
                    LastName = "Admin",
                    Password = BCrypt.Net.BCrypt.HashPassword("admin"),
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
                // Ensure default values are set for existing admin
                if (adminUser.DefaultCompanyId == null || adminUser.DefaultLocationId == null)
                {
                    adminUser.DefaultCompanyId = seedCompanyId;
                    adminUser.DefaultLocationId = seedLocationId;
                    adminUser.UpdatedAt = DateTime.Now;
                    context.SaveChanges();
                }
            }

            // 3. Ensure Permissions for Admin
            var adminPerm = context.UserPermissions.FirstOrDefault(p => p.UserId == adminUser.Id);
            if (adminPerm == null)
            {
                adminPerm = new UserPermission { UserId = adminUser.Id };
                context.UserPermissions.Add(adminPerm);
            }
            
            // Re-assert admin permissions (idempotent)
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

            // 4. Seed App Settings
            if (!context.AppSettings.Any())
            {
                context.AppSettings.Add(new AppSettings 
                { 
                    SoftwareName = "Die & Pattern Management",
                    CreatedAt = DateTime.Now, 
                    UpdatedAt = DateTime.Now 
                });
                context.SaveChanges();
            }

            // 5. Seed Initial Masters if empty
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

            // 6. Data Backfill: Ensure all existing data has at least default location/company scoping
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

                if (partiesToFix.Any() || itemsToFix.Any() || posToFix.Any() || jwToFix.Any() || inwardsToFix.Any())
                {
                    context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Seeding backfill skipped: {ex.Message}");
            }

            // 7. Ensure every user has at least one UserLocationAccess entry
            try
            {
                var users = context.Users.ToList();
                foreach (var user in users)
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
                        
                        // Also sync default choice if missing
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
                Console.WriteLine($"User location access seeding skipped: {ex.Message}");
            }
        }
    }
}

