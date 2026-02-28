using System.Text.Json;
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
        public int? ApprovedBy { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<PurchaseIndentItemDto> Items { get; set; } = new();
    }

    public class PurchaseIndentItemDto
    {
        public int Id { get; set; }
        public int PurchaseIndentId { get; set; }
        public string? PiNo { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string? MaterialName { get; set; }
        public string? PoNo { get; set; }
        public int? PoId { get; set; }
        public bool IsInPO { get; set; }
        public string? InwardNo { get; set; }
        public string? QCNo { get; set; }
    }

    public class CreatePurchaseIndentDto
    {
        public PurchaseIndentType Type { get; set; }
        public string? Remarks { get; set; }
        public List<int> ItemIds { get; set; } = new();
    }

    /// <summary>Item with its current process state for PI item selection (only NotInStock can be added).</summary>
    public class ItemWithStatusDto
    {
        public int ItemId { get; set; }
        public string? CurrentName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string Status { get; set; } = string.Empty; // NotInStock, InPI, InPO, InQC, InJobwork, Outward, InStock
    }

    public class PODto
    {
        public int Id { get; set; }
        public string PoNo { get; set; } = string.Empty;
        public int VendorId { get; set; }
        public string? VendorName { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationNo { get; set; }
        public List<string> QuotationUrls { get; set; } = new();
        public GstType? GstType { get; set; }
        public decimal? GstPercent { get; set; }
        /// <summary>Sum of Rate for all items (one unit per die/pattern)</summary>
        public decimal Subtotal { get; set; }
        /// <summary>GST amount if GstType and GstPercent set, else null</summary>
        public decimal? GstAmount { get; set; }
        /// <summary>Subtotal + GstAmount (or Subtotal if no GST)</summary>
        public decimal TotalAmount { get; set; }
        public PoStatus Status { get; set; }
        public string? Remarks { get; set; }
        public string? PurchaseType { get; set; } // Added
        public DateTime CreatedAt { get; set; }
        public string? CreatorName { get; set; }
        public int? ApprovedBy { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; } = true;
        /// <summary>True if any inward has been recorded against this PO (edit not allowed).</summary>
        public bool HasInward { get; set; }
        public List<POItemDto> Items { get; set; } = new();
    }

    public class POItemDto
    {
        public int Id { get; set; }
        public int PurchaseIndentItemId { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string? MaterialName { get; set; }
        public string? PiNo { get; set; }
        public int? PurchaseIndentId { get; set; }
        public decimal Rate { get; set; }
        /// <summary>Line amount = Rate (one unit per die/pattern, before GST)</summary>
        public decimal LineAmount => Math.Round(Rate, 2);
        public bool IsInwarded { get; set; }
        public string? InwardNo { get; set; }
        public string? QCNo { get; set; }
    }

    /// <summary>Per-item input for PO creation/update. Each die/pattern has its own rate.</summary>
    public class CreatePOItemDto
    {
        public int PurchaseIndentItemId { get; set; }
        public decimal Rate { get; set; }
    }

    public class CreatePODto
    {
        public int VendorId { get; set; }
        public DateTime? DeliveryDate { get; set; }
        public string? QuotationNo { get; set; }
        public List<string>? QuotationUrls { get; set; }
        public GstType? GstType { get; set; }
        public decimal? GstPercent { get; set; }
        public string? Remarks { get; set; }
        public string? PurchaseType { get; set; }
        /// <summary>Designated approver (Authorized By).</summary>
        public int? ApprovedBy { get; set; }
        /// <summary>Items with per-item rates. Final total = sum(item.Rate), then GST applied if selected.</summary>
        public List<CreatePOItemDto> Items { get; set; } = new();
    }

    public static class QuotationUrlsHelper
    {
        public static List<string> FromJson(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try { return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>(); }
            catch { return new List<string>(); }
        }
        public static string ToJson(List<string>? list)
        {
            if (list == null || list.Count == 0) return null!;
            return JsonSerializer.Serialize(list);
        }
    }

    public class OutwardDto
    {
        public int Id { get; set; }
        public string OutwardNo { get; set; } = string.Empty;
        public DateTime OutwardDate { get; set; }
        public int PartyId { get; set; }
        public string? PartyName { get; set; }
        public string? Remarks { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public List<OutwardLineDto> Lines { get; set; } = new();
    }

    public class OutwardLineDto
    {
        public int Id { get; set; }
        public int OutwardId { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? MaterialName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int Quantity { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateOutwardDto
    {
        public DateTime? OutwardDate { get; set; }
        public int PartyId { get; set; }
        public string? Remarks { get; set; }
        public List<CreateOutwardLineDto> Lines { get; set; } = new();
    }

    public class CreateOutwardLineDto
    {
        public int ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public string? Remarks { get; set; }
    }

    public class PendingQCDto
    {
        public int InwardLineId { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? InwardNo { get; set; }
        public int? InwardId { get; set; }
        public InwardSourceType? SourceType { get; set; }
        public string? SourceRefDisplay { get; set; }
        public string? VendorName { get; set; }
        public bool IsQCPending { get; set; }
        public bool IsQCApproved { get; set; }
        public DateTime InwardDate { get; set; }
    }

    public class QCDto
    {
        public int InwardLineId { get; set; }
        public bool IsApproved { get; set; }
        public string? Remarks { get; set; }
    }

    public class InwardDto
    {
        public int Id { get; set; }
        public string InwardNo { get; set; } = string.Empty;
        public DateTime InwardDate { get; set; }
        public int? VendorId { get; set; }
        public string? VendorName { get; set; }
        public string? Remarks { get; set; }
        public InwardStatus Status { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; } = true;
        public string? InwardFrom { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<InwardLineDto> Lines { get; set; } = new();
    }

    public class InwardLineDto
    {
        public int Id { get; set; }
        public int InwardId { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? MaterialName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int Quantity { get; set; }
        public InwardSourceType SourceType { get; set; }
        public int? SourceRefId { get; set; }
        public string? SourceRefDisplay { get; set; }
        public string? Remarks { get; set; }
        public bool IsQCPending { get; set; }
        public bool IsQCApproved { get; set; }
        public string? QCNo { get; set; }
    }

    public class CreateInwardDto
    {
        public DateTime? InwardDate { get; set; }
        public int? VendorId { get; set; }
        public string? Remarks { get; set; }
        public List<CreateInwardLineDto> Lines { get; set; } = new();
    }

    public class CreateInwardLineDto
    {
        public int ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public InwardSourceType SourceType { get; set; }
        public int? SourceRefId { get; set; }
        public string? Remarks { get; set; }
    }

    public class JobWorkDto
    {
        public int Id { get; set; }
        public string JobWorkNo { get; set; } = string.Empty;
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public int? VendorId { get; set; }
        public string? VendorName { get; set; }
        public string? Description { get; set; }
        public JobWorkStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateJobWorkDto
    {
        public int ItemId { get; set; }
        public int? ToPartyId { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateJobWorkStatusDto
    {
        public JobWorkStatus Status { get; set; }
    }
}
