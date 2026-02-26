using Microsoft.EntityFrameworkCore;
using net_backend.Models;

namespace net_backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<AppSettings> AppSettings { get; set; } = default!;
        public DbSet<AuditLog> AuditLogs { get; set; } = default!;
        public DbSet<Company> Companies { get; set; } = default!;
        public DbSet<Location> Locations { get; set; } = default!;
        public DbSet<Party> Parties { get; set; } = default!;
        public DbSet<ItemType> ItemTypes { get; set; } = default!;
        public DbSet<ItemStatus> ItemStatuses { get; set; } = default!;
        public DbSet<Material> Materials { get; set; } = default!;
        public DbSet<OwnerType> OwnerTypes { get; set; } = default!;
        public DbSet<Item> Items { get; set; } = default!;
        public DbSet<PurchaseIndent> PurchaseIndents { get; set; } = default!;
        public DbSet<PurchaseIndentItem> PurchaseIndentItems { get; set; } = default!;
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = default!;
        public DbSet<PurchaseOrderItem> PurchaseOrderItems { get; set; } = default!;
        public DbSet<JobWork> JobWorks { get; set; } = default!;
        public DbSet<Inward> Inwards { get; set; } = default!;
        public DbSet<InwardLine> InwardLines { get; set; } = default!;
        public DbSet<Movement> Movements { get; set; } = default!;
        public DbSet<QualityControl> QualityControls { get; set; } = default!;
        public DbSet<ItemChangeLog> ItemChangeLogs { get; set; } = default!;
        public DbSet<User> Users { get; set; } = default!;
        public DbSet<UserPermission> UserPermissions { get; set; } = default!;
        public DbSet<UserLocationAccess> UserLocationAccess { get; set; } = default!;

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

            modelBuilder.Entity<JobWork>()
                .HasIndex(j => j.JobWorkNo)
                .IsUnique();

            modelBuilder.Entity<Inward>()
                .HasIndex(i => i.InwardNo)
                .IsUnique();

            modelBuilder.Entity<PurchaseOrderItem>()
                .Property(poi => poi.Rate)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<PurchaseOrder>()
                .Property(p => p.GstPercent)
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

            modelBuilder.Entity<PurchaseIndentItem>()
                .HasIndex(pii => new { pii.PurchaseIndentId, pii.ItemId })
                .IsUnique();

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

            modelBuilder.Entity<JobWork>()
                .HasOne(j => j.Item)
                .WithMany()
                .HasForeignKey(j => j.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<JobWork>()
                .HasOne(j => j.Creator)
                .WithMany()
                .HasForeignKey(j => j.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Inward>()
                .HasOne(i => i.Location)
                .WithMany()
                .HasForeignKey(i => i.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Inward>()
                .HasOne(i => i.Vendor)
                .WithMany()
                .HasForeignKey(i => i.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Inward>()
                .HasOne(i => i.Creator)
                .WithMany()
                .HasForeignKey(i => i.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InwardLine>()
                .HasOne(l => l.Inward)
                .WithMany(i => i.Lines)
                .HasForeignKey(l => l.InwardId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<InwardLine>()
                .HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InwardLine>()
                .HasOne(l => l.Movement)
                .WithMany(m => m.Lines)
                .HasForeignKey(l => l.MovementId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.Item)
                .WithMany()
                .HasForeignKey(m => m.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.Inward)
                .WithMany()
                .HasForeignKey(m => m.InwardId)
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

            modelBuilder.Entity<UserLocationAccess>()
                .HasIndex(ula => new { ula.UserId, ula.CompanyId, ula.LocationId })
                .IsUnique();
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.User)
                .WithMany(u => u.LocationAccess)
                .HasForeignKey(ula => ula.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.Company)
                .WithMany()
                .HasForeignKey(ula => ula.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<UserLocationAccess>()
                .HasOne(ula => ula.Location)
                .WithMany()
                .HasForeignKey(ula => ula.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasOne(u => u.DefaultCompany)
                .WithMany()
                .HasForeignKey(u => u.DefaultCompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            modelBuilder.Entity<User>()
                .HasOne(u => u.DefaultLocation)
                .WithMany()
                .HasForeignKey(u => u.DefaultLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Party>()
                .HasOne(p => p.Location)
                .WithMany()
                .HasForeignKey(p => p.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Item>()
                .HasOne(i => i.Location)
                .WithMany()
                .HasForeignKey(i => i.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(po => po.Location)
                .WithMany()
                .HasForeignKey(po => po.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<JobWork>()
                .HasOne(j => j.Location)
                .WithMany()
                .HasForeignKey(j => j.LocationId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
