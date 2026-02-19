using net_backend.Models;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;

namespace net_backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.Migrate();

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
            adminPerm.ManageMaster = true;
            adminPerm.ViewPI = true;
            adminPerm.CreatePI = true;
            adminPerm.ApprovePI = true;
            adminPerm.ViewPO = true;
            adminPerm.CreatePO = true;
            adminPerm.ApprovePO = true;
            adminPerm.ViewMovement = true;
            adminPerm.CreateMovement = true;
            adminPerm.ViewQC = true;
            adminPerm.PerformQC = true;
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
