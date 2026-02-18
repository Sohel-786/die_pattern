using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace net_backend.Models
{
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
        [Required]
        public string CompanyName { get; set; } = "Die & Pattern System";
        public string? CompanyLogo { get; set; }
        [MaxLength(255)]
        public string? SoftwareName { get; set; }
        [MaxLength(20)]
        public string? PrimaryColor { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("audit_logs")]
    public class AuditLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [Required]
        public string Action { get; set; } = string.Empty;
        [Required]
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    [Table("companies")]
    public class Company
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual ICollection<Location> Locations { get; set; } = new List<Location>();
    }

    [Table("locations")]
    public class Location
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
    }

    [Table("parties")]
    public class Party
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("pattern_types")]
    public class PatternType
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty; // Die / Pattern
        public bool IsActive { get; set; } = true;
    }

    [Table("pattern_statuses")]
    public class PatternStatus
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    [Table("materials")]
    public class Material
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    [Table("owner_types")]
    public class OwnerType
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }

    [Table("pattern_dies")]
    public class PatternDie
    {
        public int Id { get; set; }
        
        [Required]
        public string MainPartName { get; set; } = string.Empty; // Permanent, Never Editable, Unique
        
        [Required]
        public string CurrentName { get; set; } = string.Empty; // Editable only via Change Process

        public int PatternTypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }

        public HolderType CurrentHolderType { get; set; }
        public int? CurrentLocationId { get; set; }
        public int? CurrentPartyId { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PatternTypeId")]
        public virtual PatternType? PatternType { get; set; }
        [ForeignKey("MaterialId")]
        public virtual Material? Material { get; set; }
        [ForeignKey("OwnerTypeId")]
        public virtual OwnerType? OwnerType { get; set; }
        [ForeignKey("StatusId")]
        public virtual PatternStatus? Status { get; set; }
        [ForeignKey("CurrentLocationId")]
        public virtual Location? CurrentLocation { get; set; }
        [ForeignKey("CurrentPartyId")]
        public virtual Party? CurrentParty { get; set; }
    }

    [Table("purchase_indents")]
    public class PurchaseIndent
    {
        public int Id { get; set; }
        [Required]
        public string PiNo { get; set; } = string.Empty;
        public PiType Type { get; set; }
        public PiStatus Status { get; set; } = PiStatus.Pending;
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }
        public virtual ICollection<PurchaseIndentItem> Items { get; set; } = new List<PurchaseIndentItem>();
    }

    [Table("purchase_indent_items")]
    public class PurchaseIndentItem
    {
        public int Id { get; set; }
        public int PurchaseIndentId { get; set; }
        public int PatternDieId { get; set; }
        
        [ForeignKey("PurchaseIndentId")]
        public virtual PurchaseIndent? PurchaseIndent { get; set; }
        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }
    }

    [Table("purchase_orders")]
    public class PurchaseOrder
    {
        public int Id { get; set; }
        [Required]
        public string PoNo { get; set; } = string.Empty;
        public int VendorId { get; set; }
        public decimal? Rate { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationUrl { get; set; }
        public PoStatus Status { get; set; } = PoStatus.Pending;
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("VendorId")]
        public virtual Party? Vendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }
        public virtual ICollection<PurchaseOrderItem> Items { get; set; } = new List<PurchaseOrderItem>();
    }

    [Table("purchase_order_items")]
    public class PurchaseOrderItem
    {
        public int Id { get; set; }
        public int PurchaseOrderId { get; set; }
        public int PurchaseIndentItemId { get; set; }

        [ForeignKey("PurchaseOrderId")]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("PurchaseIndentItemId")]
        public virtual PurchaseIndentItem? PurchaseIndentItem { get; set; }
    }

    [Table("movements")]
    public class Movement
    {
        public int Id { get; set; }
        public MovementType Type { get; set; }
        public int PatternDieId { get; set; }
        
        public HolderType FromType { get; set; }
        public int? FromLocationId { get; set; }
        public int? FromPartyId { get; set; }

        public HolderType ToType { get; set; }
        public int? ToLocationId { get; set; }
        public int? ToPartyId { get; set; }

        public string? Remarks { get; set; }
        public string? Reason { get; set; } // Mandatory for SystemReturn
        
        public int? PurchaseOrderId { get; set; }
        
        public bool IsQCPending { get; set; } = false;
        public bool IsQCApproved { get; set; } = false;

        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }
        [ForeignKey("FromLocationId")]
        public virtual Location? FromLocation { get; set; }
        [ForeignKey("FromPartyId")]
        public virtual Party? FromParty { get; set; }
        [ForeignKey("ToLocationId")]
        public virtual Location? ToLocation { get; set; }
        [ForeignKey("ToPartyId")]
        public virtual Party? ToParty { get; set; }
        [ForeignKey("PurchaseOrderId")]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }

    [Table("quality_controls")]
    public class QualityControl
    {
        public int Id { get; set; }
        public int MovementId { get; set; }
        public bool IsApproved { get; set; }
        public string? Remarks { get; set; }
        public int CheckedBy { get; set; }
        public DateTime CheckedAt { get; set; } = DateTime.Now;

        [ForeignKey("MovementId")]
        public virtual Movement? Movement { get; set; }
        [ForeignKey("CheckedBy")]
        public virtual User? Checker { get; set; }
    }

    [Table("pattern_change_logs")]
    public class PatternChangeLog
    {
        public int Id { get; set; }
        public int PatternDieId { get; set; }
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string OldRevision { get; set; } = string.Empty;
        public string NewRevision { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty; // Modification / Repair
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }

    [Table("users")]
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; } = Role.USER;
        public bool IsActive { get; set; } = true;
        public string? Avatar { get; set; }
        public string? MobileNumber { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual UserPermission? Permission { get; set; }
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }

    [Table("user_permissions")]
    public class UserPermission
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        public bool ViewDashboard { get; set; } = true;
        
        // Master Permissions
        public bool ViewMaster { get; set; } = false;
        public bool ManageMaster { get; set; } = false; // Add/Edit/Delete

        // PI Permissions
        public bool ViewPI { get; set; } = false;
        public bool CreatePI { get; set; } = false;
        public bool ApprovePI { get; set; } = false;

        // PO Permissions
        public bool ViewPO { get; set; } = false;
        public bool CreatePO { get; set; } = false;
        public bool ApprovePO { get; set; } = false;

        // Movement Permissions
        public bool ViewMovement { get; set; } = false;
        public bool CreateMovement { get; set; } = false;
        
        // QC Permissions
        public bool ViewQC { get; set; } = false;
        public bool PerformQC { get; set; } = false;

        // Change Control
        public bool ManageChanges { get; set; } = false;
        public bool RevertChanges { get; set; } = false; // Admin only

        public bool ViewReports { get; set; } = false;
        public bool ManageUsers { get; set; } = false;
        public bool AccessSettings { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
