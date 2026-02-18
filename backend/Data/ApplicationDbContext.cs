using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<AppSettings> AppSettings { get; set; } = null!;
        public DbSet<AuditLog> AuditLogs { get; set; } = null!;
        public DbSet<Company> Companies { get; set; } = null!;
        public DbSet<Location> Locations { get; set; } = null!;
        public DbSet<Party> Parties { get; set; } = null!;
        public DbSet<TypeMaster> TypeMasters { get; set; } = null!;
        public DbSet<StatusMaster> StatusMasters { get; set; } = null!;
        public DbSet<MaterialMaster> MaterialMasters { get; set; } = null!;
        public DbSet<OwnerTypeMaster> OwnerTypeMasters { get; set; } = null!;
        public DbSet<PatternDie> PatternDies { get; set; } = null!;
        public DbSet<ChangeHistory> ChangeHistories { get; set; } = null!;
        public DbSet<PurchaseIndent> PurchaseIndents { get; set; } = null!;
        public DbSet<PIItem> PIItems { get; set; } = null!;
        public DbSet<PurchaseOrder> PurchaseOrders { get; set; } = null!;
        public DbSet<POItem> POItems { get; set; } = null!;
        public DbSet<Movement> Movements { get; set; } = null!;
        public DbSet<InwardEntry> InwardEntries { get; set; } = null!;
        public DbSet<InwardItem> InwardItems { get; set; } = null!;
        public DbSet<QCInspection> QCInspections { get; set; } = null!;
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<UserPermission> UserPermissions { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure DeleteBehavior to Restrict to prevent cycles and accidental deletions

            // PatternDie
            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.CurrentLocation)
                .WithMany(l => l.PatternDies)
                .HasForeignKey(p => p.CurrentLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.Type)
                .WithMany()
                .HasForeignKey(p => p.TypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.Material)
                .WithMany()
                .HasForeignKey(p => p.MaterialId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.OwnerType)
                .WithMany()
                .HasForeignKey(p => p.OwnerTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.Status)
                .WithMany()
                .HasForeignKey(p => p.StatusId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PatternDie>()
                .HasOne(p => p.CurrentVendor)
                .WithMany()
                .HasForeignKey(p => p.CurrentVendorId)
                .OnDelete(DeleteBehavior.Restrict);


            // Movement
            modelBuilder.Entity<Movement>()
                .HasOne(m => m.FromLocation)
                .WithMany()
                .HasForeignKey(m => m.FromLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.ToLocation)
                .WithMany()
                .HasForeignKey(m => m.ToLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.FromVendor)
                .WithMany()
                .HasForeignKey(m => m.FromVendorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.ToVendor)
                .WithMany()
                .HasForeignKey(m => m.ToVendorId)
                .OnDelete(DeleteBehavior.Restrict);
            
            modelBuilder.Entity<Movement>()
                .HasOne(m => m.PatternDie)
                .WithMany(p => p.Movements)
                .HasForeignKey(m => m.PatternDieId)
                .OnDelete(DeleteBehavior.Restrict);

            // ChangeHistory
            modelBuilder.Entity<ChangeHistory>()
                .HasOne(ch => ch.PatternDie)
                .WithMany(p => p.ChangeHistories)
                .HasForeignKey(ch => ch.PatternDieId)
                .OnDelete(DeleteBehavior.Cascade); // History belongs to PatternDie, so Cascade is acceptable here if simpler, but let's stick to Restrict if user cycle is issue

            // User Relationships - Vital to prevent cycles
            modelBuilder.Entity<AuditLog>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChangeHistory>()
                .HasOne(c => c.Changer)
                .WithMany()
                .HasForeignKey(c => c.ChangedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseIndent>()
                .HasOne(p => p.Creator)
                .WithMany()
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
            
            modelBuilder.Entity<PurchaseIndent>()
                .HasOne(p => p.Approver)
                .WithMany()
                .HasForeignKey(p => p.ApprovedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(p => p.Creator)
                .WithMany()
                .HasForeignKey(p => p.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(p => p.Approver)
                .WithMany()
                .HasForeignKey(p => p.ApprovedBy)
                .OnDelete(DeleteBehavior.Restrict);
                
            modelBuilder.Entity<PurchaseOrder>()
                .HasOne(p => p.Vendor)
                .WithMany()
                .HasForeignKey(p => p.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.Creator)
                .WithMany()
                .HasForeignKey(m => m.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Movement>()
                .HasOne(m => m.QCUser)
                .WithMany()
                .HasForeignKey(m => m.QCBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InwardEntry>()
                .HasOne(i => i.Receiver)
                .WithMany()
                .HasForeignKey(i => i.ReceivedBy)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<QCInspection>()
                .HasOne(q => q.Inspector)
                .WithMany()
                .HasForeignKey(q => q.InspectedBy)
                .OnDelete(DeleteBehavior.Restrict);
                
            modelBuilder.Entity<QCInspection>()
                .HasOne(q => q.TargetLocation)
                .WithMany()
                .HasForeignKey(q => q.TargetLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            // PI/PO/Inward Items
            // Parent-Child relationships can often be Cascade, but if they cause cycles, we restrict.
            // PI -> PIItem (Cascade OK)
            // PO -> POItem (Cascade OK)
            // Inward -> InwardItem (Cascade OK)
            
            // Cross Reference Items
            modelBuilder.Entity<PIItem>()
                .HasOne(p => p.PatternDie)
                .WithMany()
                .HasForeignKey(p => p.PatternDieId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<POItem>()
                .HasOne(p => p.PIItem)
                .WithMany()
                .HasForeignKey(p => p.PIItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<InwardItem>()
                .HasOne(i => i.POItem)
                .WithMany()
                .HasForeignKey(i => i.POItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<QCInspection>()
                .HasOne(q => q.InwardItem)
                .WithMany()
                .HasForeignKey(q => q.InwardItemId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Decimal Precision
            modelBuilder.Entity<POItem>()
                .Property(p => p.Rate)
                .HasPrecision(18, 2);

            modelBuilder.Entity<PurchaseOrder>()
                .Property(p => p.TotalAmount)
                .HasPrecision(18, 2);
        }
    }
}
