using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
        [Required]
        public string CompanyName { get; set; } = "Die & Pattern Management";
        public string? CompanyLogo { get; set; }
        [MaxLength(255)]
        public string? SoftwareName { get; set; }
        [MaxLength(20)]
        public string? PrimaryColor { get; set; }
        [MaxLength(255)]
        public string? SupportEmail { get; set; }
        [MaxLength(50)]
        public string? SupportPhone { get; set; }
        public string? Address { get; set; }
        [MaxLength(255)]
        public string? Website { get; set; }
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
        public virtual ICollection<PatternDie> PatternDies { get; set; } = new List<PatternDie>();
    }

    [Table("parties")]
    public class Party
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("type_masters")]
    public class TypeMaster
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty; // e.g. Die, Pattern
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("status_masters")]
    public class StatusMaster
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("material_masters")]
    public class MaterialMaster
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("owner_type_masters")]
    public class OwnerTypeMaster
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("pattern_dies")]
    public class PatternDie
    {
        public int Id { get; set; }
        [Required]
        public string MainPartName { get; set; } = string.Empty; // Permanent, Never Editable
        [Required]
        public string CurrentName { get; set; } = string.Empty; // Editable only via Change Process
        public int TypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }
        public int? CurrentLocationId { get; set; }
        public int? CurrentVendorId { get; set; }
        public bool IsAtVendor => CurrentVendorId.HasValue;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("TypeId")]
        public virtual TypeMaster? Type { get; set; }
        [ForeignKey("MaterialId")]
        public virtual MaterialMaster? Material { get; set; }
        [ForeignKey("OwnerTypeId")]
        public virtual OwnerTypeMaster? OwnerType { get; set; }
        [ForeignKey("StatusId")]
        public virtual StatusMaster? Status { get; set; }
        [ForeignKey("CurrentLocationId")]
        public virtual Location? CurrentLocation { get; set; }
        [ForeignKey("CurrentVendorId")]
        public virtual Party? CurrentVendor { get; set; }

        public virtual ICollection<ChangeHistory> ChangeHistories { get; set; } = new List<ChangeHistory>();
        public virtual ICollection<Movement> Movements { get; set; } = new List<Movement>();
    }

    [Table("change_histories")]
    public class ChangeHistory
    {
        public int Id { get; set; }
        public int PatternDieId { get; set; }
        public string PreviousName { get; set; } = string.Empty;
        public string PreviousRevision { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string NewRevision { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public int ChangedBy { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.Now;

        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }

        [ForeignKey("ChangedBy")]
        public virtual User? Changer { get; set; }
    }

    [Table("purchase_indents")]
    public class PurchaseIndent
    {
        public int Id { get; set; }
        public string PINo { get; set; } = string.Empty;
        public DateTime PIDate { get; set; } = DateTime.Now;
        public string Type { get; set; } = string.Empty; // New / Repair / Correction / Modification
        public string? Description { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public PIStatus Status { get; set; } = PIStatus.PENDING;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ApprovedAt { get; set; }

        public virtual ICollection<PIItem> Items { get; set; } = new List<PIItem>();
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }
    }

    [Table("pi_items")]
    public class PIItem
    {
        public int Id { get; set; }
        public int PIId { get; set; }
        public int PatternDieId { get; set; }
        public string? Remarks { get; set; }
        public bool IsOrdered { get; set; } = false;

        [ForeignKey("PIId")]
        public virtual PurchaseIndent? PurchaseIndent { get; set; }
        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }
    }

    [Table("purchase_orders")]
    public class PurchaseOrder
    {
        public int Id { get; set; }
        public string PONo { get; set; } = string.Empty;
        public DateTime PODate { get; set; } = DateTime.Now;
        public int VendorId { get; set; }
        public decimal? TotalAmount { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? Terms { get; set; }
        public string? QuotationPath { get; set; }
        public int CreatedBy { get; set; }
        public int? ApprovedBy { get; set; }
        public POStatus Status { get; set; } = POStatus.PENDING;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? ApprovedAt { get; set; }

        public virtual ICollection<POItem> Items { get; set; } = new List<POItem>();
        [ForeignKey("VendorId")]
        public virtual Party? Vendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("ApprovedBy")]
        public virtual User? Approver { get; set; }
    }

    [Table("po_items")]
    public class POItem
    {
        public int Id { get; set; }
        public int POId { get; set; }
        public int PIItemId { get; set; }
        public decimal? Rate { get; set; }
        public string? Specifications { get; set; }
        public bool IsReceived { get; set; } = false;
        public bool IsQCApproved { get; set; } = false;

        [ForeignKey("POId")]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("PIItemId")]
        public virtual PIItem? PIItem { get; set; }
    }

    [Table("inward_entries")]
    public class InwardEntry
    {
        public int Id { get; set; }
        public string InwardNo { get; set; } = string.Empty;
        public DateTime InwardDate { get; set; } = DateTime.Now;
        public int POId { get; set; }
        public string? ChallanNo { get; set; }
        public DateTime? ChallanDate { get; set; }
        public string? VehicleNo { get; set; }
        public string? Remarks { get; set; }
        public int ReceivedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("POId")]
        public virtual PurchaseOrder? PurchaseOrder { get; set; }
        [ForeignKey("ReceivedBy")]
        public virtual User? Receiver { get; set; }
        public virtual ICollection<InwardItem> Items { get; set; } = new List<InwardItem>();
    }

    [Table("inward_items")]
    public class InwardItem
    {
        public int Id { get; set; }
        public int InwardId { get; set; }
        public int POItemId { get; set; }
        public bool IsQCProcessed { get; set; } = false;

        [ForeignKey("InwardId")]
        public virtual InwardEntry? InwardEntry { get; set; }
        [ForeignKey("POItemId")]
        public virtual POItem? POItem { get; set; }
    }

    [Table("qc_inspections")]
    public class QCInspection
    {
        public int Id { get; set; }
        public string QCNo { get; set; } = string.Empty;
        public int InwardItemId { get; set; }
        public QCStatus Status { get; set; } = QCStatus.PENDING;
        public string? InspectionNotes { get; set; }
        public string? ParametersChecked { get; set; }
        public int? TargetLocationId { get; set; } // Where to move after approval
        public int InspectedBy { get; set; }
        public DateTime InspectedAt { get; set; } = DateTime.Now;

        [ForeignKey("InwardItemId")]
        public virtual InwardItem? InwardItem { get; set; }
        [ForeignKey("TargetLocationId")]
        public virtual Location? TargetLocation { get; set; }
        [ForeignKey("InspectedBy")]
        public virtual User? Inspector { get; set; }
    }

    [Table("movements")]
    public class Movement
    {
        public int Id { get; set; }
        public string MovementNo { get; set; } = string.Empty;
        public int PatternDieId { get; set; }
        public MovementType Type { get; set; }
        public int? FromLocationId { get; set; }
        public int? ToLocationId { get; set; }
        public int? FromVendorId { get; set; }
        public int? ToVendorId { get; set; }
        public string Reason { get; set; } = string.Empty;
        public int CreatedBy { get; set; }
        public bool IsQCRequired { get; set; } = false;
        public bool IsQCApproved { get; set; } = false;
        public int? QCBy { get; set; }
        public DateTime? QCAt { get; set; }
        public string? QCRemarks { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("PatternDieId")]
        public virtual PatternDie? PatternDie { get; set; }
        [ForeignKey("FromLocationId")]
        public virtual Location? FromLocation { get; set; }
        [ForeignKey("ToLocationId")]
        public virtual Location? ToLocation { get; set; }
        [ForeignKey("FromVendorId")]
        public virtual Party? FromVendor { get; set; }
        [ForeignKey("ToVendorId")]
        public virtual Party? ToVendor { get; set; }
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        [ForeignKey("QCBy")]
        public virtual User? QCUser { get; set; }
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
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        public virtual UserPermission? Permission { get; set; }
    }

    [Table("user_permissions")]
    public class UserPermission
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public bool ViewDashboard { get; set; } = false;
        public bool ViewMaster { get; set; } = false;
        public bool ViewPI { get; set; } = false;
        public bool ViewPO { get; set; } = false;
        public bool ViewMovement { get; set; } = false;
        public bool ViewReports { get; set; } = false;
        public bool ManageUsers { get; set; } = false;
        public bool AccessSettings { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
