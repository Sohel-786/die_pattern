using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            if (context.Users.Any())
            {
                return; // DB has been seeded
            }

            // Seed AppSettings
            var settings = new AppSettings
            {
                CompanyName = "Die & Pattern Management",
                SoftwareName = "DPMS v1.0",
                PrimaryColor = "#3b82f6"
            };
            context.AppSettings.Add(settings);

            // Seed Admin User
            var admin = new User
            {
                Username = "admin",
                Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
                FirstName = "System",
                LastName = "Admin",
                Role = Role.ADMIN,
                IsActive = true
            };
            context.Users.Add(admin);
            context.SaveChanges();

            var permission = new UserPermission
            {
                UserId = admin.Id,
                ViewDashboard = true,
                ViewMaster = true,
                ViewPI = true,
                ViewPO = true,
                ViewMovement = true,
                ViewReports = true,
                ManageUsers = true,
                AccessSettings = true
            };
            context.UserPermissions.Add(permission);
            context.SaveChanges();
        }

        public static async Task ResetDatabase(ApplicationDbContext context)
        {
            // Clear all data except Admin
            // In a real factory reset, we might drop and recreate, but here we just clear tables
            context.ChangeHistories.RemoveRange(context.ChangeHistories);
            context.Movements.RemoveRange(context.Movements);
            context.QCInspections.RemoveRange(context.QCInspections);
            context.InwardItems.RemoveRange(context.InwardItems);
            context.InwardEntries.RemoveRange(context.InwardEntries);
            context.POItems.RemoveRange(context.POItems);
            context.PurchaseOrders.RemoveRange(context.PurchaseOrders);
            context.PIItems.RemoveRange(context.PIItems);
            context.PurchaseIndents.RemoveRange(context.PurchaseIndents);
            context.PatternDies.RemoveRange(context.PatternDies);
            
            context.Locations.RemoveRange(context.Locations);
            context.Companies.RemoveRange(context.Companies);
            context.Parties.RemoveRange(context.Parties);
            context.TypeMasters.RemoveRange(context.TypeMasters);
            context.MaterialMasters.RemoveRange(context.MaterialMasters);
            context.StatusMasters.RemoveRange(context.StatusMasters);
            context.OwnerTypeMasters.RemoveRange(context.OwnerTypeMasters);
            
            // Keep users and permissions for now, or just keep admin
            var nonAdmins = context.Users.Where(u => u.Username != "admin");
            context.Users.RemoveRange(nonAdmins);

            await context.SaveChangesAsync();
        }
    }
}
