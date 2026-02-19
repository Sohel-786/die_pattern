using Microsoft.EntityFrameworkCore;
using net_backend.Models;

namespace net_backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<AppSettings> AppSettings { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<Party> Parties { get; set; }
        public DbSet<ItemType> ItemTypes { get; set; }
        public DbSet<ItemStatus> ItemStatuses { get; set; }
        public DbSet<Material> Materials { get; set; }
        public DbSet<OwnerType> OwnerTypes { get; set; }
        public DbSet<Item> Items { get; set; }
        public DbSet<PurchaseIndent> PurchaseIndents { get; set; }
        public DbSet<PurchaseIndentItem> PurchaseIndentItems { get; set; }
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; }
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; }
        public DbSet<Movement> Movements { get; set; }
        public DbSet<QualityControl> QualityControls { get; set; }
        public DbSet<ItemChangeLog> ItemChangeLogs { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<UserPermission> UserPermissions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Unique constraints
            modelBuilder.Entity<Item>()
                .HasIndex(p => p.MainPartName)
                .IsUnique();

            modelBuilder.Entity<PurchaseIndent>()
                .HasIndex(p => p.PiNo)
                .IsUnique();

            modelBuilder.Entity<PurchaseOrder>()
                .HasIndex(p => p.PoNo)
                .IsUnique();

            modelBuilder.Entity<PurchaseOrder>()
                .Property(p => p.Rate)
                .HasColumnType("decimal(18,2)");

            // Relationships
            modelBuilder.Entity<Location>()
                .HasOne(l => l.Company)
                .WithMany(c => c.Locations)
                .HasForeignKey(l => l.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Item>()
                .HasOne(p => p.Status)
                .WithMany()
                .HasForeignKey(p => p.StatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseIndentItem>()
                .HasOne(pii => pii.PurchaseIndent)
                .WithMany(pi => pi.Items)
                .HasForeignKey(pii => pii.PurchaseIndentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PurchaseOrderItem>()
                .HasOne(poi => poi.PurchaseOrder)
                .WithMany(po => po.Items)
                .HasForeignKey(poi => poi.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseOrderItem>()
                .HasOne(poi => poi.PurchaseIndentItem)
                .WithMany()
                .HasForeignKey(poi => poi.PurchaseIndentItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.Item)
                .WithMany()
                .HasForeignKey(m => m.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<QualityControl>()
                .HasOne(qc => qc.Movement)
                .WithMany()
                .HasForeignKey(qc => qc.MovementId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ItemChangeLog>()
                .HasOne(pcl => pcl.Item)
                .WithMany()
                .HasForeignKey(pcl => pcl.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User)
                .WithMany(u => u.AuditLogs)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<QualityControl>()
                .HasOne(qc => qc.Checker)
                .WithMany()
                .HasForeignKey(qc => qc.CheckedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<UserPermission>()
                .HasOne(up => up.User)
                .WithOne(u => u.Permission)
                .HasForeignKey<UserPermission>(up => up.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
