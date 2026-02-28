using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace net_backend.Models
{
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
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
        public string? Address { get; set; }
        [MaxLength(50)]
        public string? Pan { get; set; }
        [MaxLength(100)]
        public string? State { get; set; }
        [MaxLength(100)]
        public string? City { get; set; }
        [MaxLength(20)]
        public string? Pincode { get; set; }
        [MaxLength(30)]
        public string? Phone { get; set; }
        [MaxLength(255)]
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [JsonIgnore]
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
        public int? LocationId { get; set; }
        public string? PartyCategory { get; set; }
        public string? PartyCode { get; set; }
        public string? CustomerType { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }

    [Table("item_types")]
    public class ItemType
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty; // Die / Pattern
        public bool IsActive { get; set; } = true;
    }

    [Table("item_statuses")]
    public class ItemStatus
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

    [Table("items")]
    public class Item
    {
        public int Id { get; set; }
        
        [Required]
        public string MainPartName { get; set; } = string.Empty; // Permanent, Never Editable, Unique
        
        [Required]
        public string CurrentName { get; set; } = string.Empty; // Editable only via Change Process

        public int? LocationId { get; set; }
        public int ItemTypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }

        public ItemProcessState CurrentProcess { get; set; } = ItemProcessState.NotInStock;
        public int? CurrentLocationId { get; set; }
        public int? CurrentPartyId { get; set; }

        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ItemTypeId")]
        public virtual ItemType? ItemType { get; set; }
        [ForeignKey("MaterialId")]
        public virtual Material? Material { get; set; }
        [ForeignKey("OwnerTypeId")]
        public virtual OwnerType? OwnerType { get; set; }
        [ForeignKey("StatusId")]
        public virtual ItemStatus? Status { get; set; }
        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
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
        public PurchaseIndentType Type { get; set; }
        public PurchaseIndentStatus Status { get; set; } = PurchaseIndentStatus.Pending;
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
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
        public int ItemId { get; set; }
        
        [ForeignKey("PurchaseIndentId")]
        public virtual PurchaseIndent? PurchaseIndent { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
    }

    [Table("purchase_orders")]
    public class PurchaseOrder
    {
        public int Id { get; set; }
        [Required]
        public string PoNo { get; set; } = string.Empty;
        public int? LocationId { get; set; }
        public int VendorId { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationNo { get; set; }
        /// <summary>JSON array of quotation file URLs for multiple uploads.</summary>
        public string? QuotationUrlsJson { get; set; }
        public int? GstType { get; set; } // 0=CGST_SGST, 1=IGST, 2=UGST
        public decimal? GstPercent { get; set; }
        public string? PurchaseType { get; set; } = "Regular"; // Regular, Urgent, Critical
        public PoStatus Status { get; set; } = PoStatus.Pending;
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
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
        /// <summary>Per-item rate in INR. Each die/pattern has its own rate (one unit per item).</summary>
        public decimal Rate { get; set; }

        [ForeignKey("PurchaseOrderId")]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("PurchaseIndentItemId")]
        public virtual PurchaseIndentItem? PurchaseIndentItem { get; set; }
    }

    [Table("job_works")]
    public class JobWork
    {
        public int Id { get; set; }
        [Required]
        public string JobWorkNo { get; set; } = string.Empty;
        public int? LocationId { get; set; }
        public int? ToPartyId { get; set; }
        public int ItemId { get; set; }
        public string? Description { get; set; }
        public JobWorkStatus Status { get; set; } = JobWorkStatus.Pending;
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        [ForeignKey("ToPartyId")]
        public virtual Party? ToParty { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
    }

    [Table("inwards")]
    public class Inward
    {
        public int Id { get; set; }
        [Required]
        public string InwardNo { get; set; } = string.Empty;
        public DateTime InwardDate { get; set; } = DateTime.Now;
        public int LocationId { get; set; }
        public int? VendorId { get; set; }
        public string? Remarks { get; set; }
        public InwardStatus Status { get; set; } = InwardStatus.Draft;
        public int CreatedBy { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        [ForeignKey("VendorId")]
        public virtual Party? Vendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        public virtual ICollection<InwardLine> Lines { get; set; } = new List<InwardLine>();
    }

    [Table("inward_lines")]
    public class InwardLine
    {
        public int Id { get; set; }
        public int InwardId { get; set; }
        public int ItemId { get; set; }
        public string? ItemTypeName { get; set; }
        public string? MaterialName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int Quantity { get; set; } = 1;
        public InwardSourceType SourceType { get; set; }
        public int? SourceRefId { get; set; }
        public string? Remarks { get; set; }
        public bool IsQCPending { get; set; } = true;
        public bool IsQCApproved { get; set; } = false;

        [ForeignKey("InwardId")]
        public virtual Inward? Inward { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
    }

    [Table("outwards")]
    public class Outward
    {
        public int Id { get; set; }
        public string OutwardNo { get; set; } = string.Empty;
        public DateTime OutwardDate { get; set; } = DateTime.Now;
        public int LocationId { get; set; }
        public int PartyId { get; set; }
        public string? Remarks { get; set; }
        public bool IsActive { get; set; } = true;
        
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        [ForeignKey("PartyId")]
        public virtual Party? Party { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        public virtual ICollection<OutwardLine> Lines { get; set; } = new List<OutwardLine>();
    }

    [Table("outward_lines")]
    public class OutwardLine
    {
        public int Id { get; set; }
        public int OutwardId { get; set; }
        public int ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? Remarks { get; set; }

        [ForeignKey("OutwardId")]
        public virtual Outward? Outward { get; set; }
        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
    }

    [Table("qc_entries")]
    public class QualityControlEntry
    {
        public int Id { get; set; }
        [Required]
        public string QcNo { get; set; } = string.Empty;
        public int LocationId { get; set; }
        public int PartyId { get; set; }
        public InwardSourceType SourceType { get; set; }
        public string? Remarks { get; set; }
        public QcStatus Status { get; set; } = QcStatus.Pending;
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        [ForeignKey("PartyId")]
        public virtual Party? Party { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }
        public virtual ICollection<QualityControlItem> Items { get; set; } = new List<QualityControlItem>();
    }

    [Table("qc_items")]
    public class QualityControlItem
    {
        public int Id { get; set; }
        public int QcEntryId { get; set; }
        public int InwardLineId { get; set; }
        public bool? IsApproved { get; set; } // Null = Pending, True = Approved, False = Rejected
        public string? Remarks { get; set; }

        [ForeignKey("QcEntryId")]
        public virtual QualityControlEntry? QcEntry { get; set; }
        [ForeignKey("InwardLineId")]
        public virtual InwardLine? InwardLine { get; set; }
    }

    [Table("item_change_logs")]
    public class ItemChangeLog
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string OldRevision { get; set; } = string.Empty;
        public string NewRevision { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty; // Modification / Repair
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ItemId")]
        public virtual Item? Item { get; set; }
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
        /// <summary>Home company at creation; used when user has single company.</summary>
        public int? DefaultCompanyId { get; set; }
        /// <summary>Home location at creation; used when user has single location.</summary>
        public int? DefaultLocationId { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("DefaultCompanyId")]
        public virtual Company? DefaultCompany { get; set; }
        [ForeignKey("DefaultLocationId")]
        public virtual Location? DefaultLocation { get; set; }
        public virtual UserPermission? Permission { get; set; }
        public virtual ICollection<UserLocationAccess> LocationAccess { get; set; } = new List<UserLocationAccess>();
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }

    /// <summary>Which locations (and companies) a user can access. At creation user gets one; more can be added via Settings.</summary>
    [Table("user_location_access")]
    public class UserLocationAccess
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int CompanyId { get; set; }
        public int LocationId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }

    [Table("user_permissions")]
    public class UserPermission
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        public bool ViewDashboard { get; set; } = true;
        
        // Master Permissions
        public bool ViewMaster { get; set; } = false;
        public bool ManageItem { get; set; } = false;
        public bool ManageItemType { get; set; } = false;
        public bool ManageMaterial { get; set; } = false;
        public bool ManageItemStatus { get; set; } = false;
        public bool ManageOwnerType { get; set; } = false;
        public bool ManageParty { get; set; } = false;
        public bool ManageLocation { get; set; } = false;
        public bool ManageCompany { get; set; } = false;

        // Transactional Modules
        // Purchase Indent (PI)
        public bool ViewPI { get; set; } = false;
        public bool CreatePI { get; set; } = false;
        public bool EditPI { get; set; } = false;
        public bool ApprovePI { get; set; } = false;

        // Purchase Order (PO)
        public bool ViewPO { get; set; } = false;
        public bool CreatePO { get; set; } = false;
        public bool EditPO { get; set; } = false;
        public bool ApprovePO { get; set; } = false;

        // Inward Entry
        public bool ViewInward { get; set; } = false;
        public bool CreateInward { get; set; } = false;
        public bool EditInward { get; set; } = false;
        
        // Quality Control (QC)
        public bool ViewQC { get; set; } = false;
        public bool CreateQC { get; set; } = false; // Add inspection result
        public bool EditQC { get; set; } = false;
        public bool ApproveQC { get; set; } = false;

        // General Movement (Stock Transfer etc)
        public bool ViewMovement { get; set; } = false;
        public bool CreateMovement { get; set; } = false;
        
        // Audit & History
        public bool ManageChanges { get; set; } = false;
        public bool RevertChanges { get; set; } = false;

        public bool ViewReports { get; set; } = false;
        public bool ManageUsers { get; set; } = false;
        public bool AccessSettings { get; set; } = false;

        // UI Preferences
        public string NavigationLayout { get; set; } = "SIDEBAR"; // SIDEBAR | HORIZONTAL

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
