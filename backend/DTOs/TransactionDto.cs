using net_backend.Models;

namespace net_backend.DTOs
{
    public class PurchaseIndentDto
    {
        public int Id { get; set; }
        public string PiNo { get; set; } = string.Empty;
        public PurchaseIndentType Type { get; set; }
        public PurchaseIndentStatus Status { get; set; }
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchaseIndentItemDto> Items { get; set; } = new();
    }

    public class PurchaseIndentItemDto
    {
        public int Id { get; set; }
        public int PurchaseIndentId { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? PoNo { get; set; }
        public bool IsInPO { get; set; } // Logic for visibility
    }

    public class CreatePurchaseIndentDto
    {
        public PurchaseIndentType Type { get; set; }
        public string? Remarks { get; set; }
        public List<int> ItemIds { get; set; } = new();
    }

    public class PODto
    {
        public int Id { get; set; }
        public string PoNo { get; set; } = string.Empty;
        public int VendorId { get; set; }
        public string? VendorName { get; set; }
        public decimal? Rate { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationUrl { get; set; }
        public PoStatus Status { get; set; }
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<POItemDto> Items { get; set; } = new();
    }

    public class POItemDto
    {
        public int Id { get; set; }
        public int PurchaseIndentItemId { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? PiNo { get; set; }
    }

    public class CreatePODto
    {
        public int VendorId { get; set; }
        public decimal? Rate { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationUrl { get; set; }
        public string? Remarks { get; set; }
        public List<int> PurchaseIndentItemIds { get; set; } = new();
    }

    public class MovementDto
    {
        public int Id { get; set; }
        public MovementType Type { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public HolderType FromType { get; set; }
        public string? FromName { get; set; }
        public HolderType ToType { get; set; }
        public string? ToName { get; set; }
        public string? Remarks { get; set; }
        public string? Reason { get; set; }
        public bool IsQCPending { get; set; }
        public bool IsQCApproved { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateMovementDto
    {
        public MovementType Type { get; set; }
        public int ItemId { get; set; }
        public HolderType ToType { get; set; }
        public int? ToLocationId { get; set; }
        public int? ToPartyId { get; set; }
        public string? Remarks { get; set; }
        public string? Reason { get; set; }
        public int? PurchaseOrderId { get; set; }
    }

    public class QCDto
    {
        public int MovementId { get; set; }
        public bool IsApproved { get; set; }
        public string? Remarks { get; set; }
    }
}
