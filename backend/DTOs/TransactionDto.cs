using System.Text.Json;
using System.ComponentModel.DataAnnotations;
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
        public DateTime? ReqDateOfDelivery { get; set; }
        public bool MtcReq { get; set; }
        public string? DocumentNo { get; set; }
        public string? RevisionNo { get; set; }
        public DateTime? RevisionDate { get; set; }
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
        public DateTime? PoDate { get; set; }
        public string? InwardNo { get; set; }
        public string? QCNo { get; set; }
        public DateTime? InwardDate { get; set; }
        public DateTime? QCDate { get; set; }
    }

    public class CreatePurchaseIndentDto
    {
        public PurchaseIndentType Type { get; set; }
        public string? Remarks { get; set; }
        public DateTime? ReqDateOfDelivery { get; set; }
        public bool MtcReq { get; set; }
        public List<int> ItemIds { get; set; } = new();
    }

    public class RemovePiItemsDto
    {
        /// <summary>Item IDs (Item.Id) to be removed from this PI. Only those without any active PO are allowed.</summary>
        public List<int> ItemIds { get; set; } = new();
    }

    /// <summary>Full data for Purchase Indent print view (header, table, footer).</summary>
    public class PurchaseIndentPrintDto
    {
        public string CompanyName { get; set; } = string.Empty;
        public string LocationName { get; set; } = string.Empty;
        public string DocumentNo { get; set; } = string.Empty;
        public string RevisionNo { get; set; } = string.Empty;
        public DateTime? RevisionDate { get; set; }
        public string IndentNo { get; set; } = string.Empty;
        public DateTime IndentDate { get; set; }
        public DateTime? ReqDateOfDelivery { get; set; }
        public bool MtcReq { get; set; }
        public string IndentedBy { get; set; } = string.Empty;
        public string AuthorisedBy { get; set; } = string.Empty;
        public string ReceivedBy { get; set; } = string.Empty; // placeholder for signature
        public List<PurchaseIndentPrintRowDto> Rows { get; set; } = new();
    }

    public class PurchaseIndentPrintRowDto
    {
        public int SrNo { get; set; }
        public string ItemDescription { get; set; } = string.Empty;
        public string ItemType { get; set; } = string.Empty;
        public string ItemMaterial { get; set; } = string.Empty;
        public string DrgNo { get; set; } = string.Empty;
    }

    /// <summary>Item with its current process state for PI item selection (only NotInStock can be added).</summary>
    public class ItemWithStatusDto
    {
        public int ItemId { get; set; }
        public string? CurrentName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string Status { get; set; } = string.Empty; // NotInStock, InPI, InPO, InQC, InJobwork, InStock
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
        public DateTime? PiDate { get; set; }
        public int? PurchaseIndentId { get; set; }
        public decimal Rate { get; set; }
        public decimal? GstPercent { get; set; }
        /// <summary>Line amount = Rate (one unit per die/pattern, before GST)</summary>
        public decimal LineAmount => Math.Round(Rate, 2);
        public bool IsInwarded { get; set; }
        public string? InwardNo { get; set; }
        public DateTime? InwardDate { get; set; }
        public string? QCNo { get; set; }
        public DateTime? QCDate { get; set; }
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



    public class PendingQCDto
    {
        public int InwardLineId { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string? MaterialName { get; set; }
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
        public int Id { get; set; }
        public string QcNo { get; set; } = string.Empty;
        public int PartyId { get; set; }
        public string? PartyName { get; set; }
        public InwardSourceType SourceType { get; set; }
        public string? Remarks { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
        public QcStatus Status { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatorName { get; set; }
        public int? ApprovedBy { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<QCItemDto> Items { get; set; } = new();
    }

    public class QCItemDto
    {
        public int Id { get; set; }
        public int InwardLineId { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string? MaterialName { get; set; }
        public string? InwardNo { get; set; }
        public int InwardId { get; set; }
        public string? SourceRefDisplay { get; set; }
        public bool? IsApproved { get; set; }
        public string? Remarks { get; set; }
        public DateTime? InwardDate { get; set; }
        public DateTime? SourceDate { get; set; }
    }

    public class CreateQCDto
    {
        public int PartyId { get; set; }
        public InwardSourceType SourceType { get; set; }
        public string? Remarks { get; set; }
        public List<string>? AttachmentUrls { get; set; }
        public List<int> InwardLineIds { get; set; } = new();
    }

    public class ApproveQCItemDto
    {
        public int QCItemId { get; set; }
        public bool IsApproved { get; set; }
        public string? Remarks { get; set; }
    }

    public class RejectQCEntryDto
    {
        public string? Remarks { get; set; }
    }

    public class UpdateQCDto
    {
        public int PartyId { get; set; }
        public InwardSourceType SourceType { get; set; }
        public string? Remarks { get; set; }
        public List<string>? AttachmentUrls { get; set; }
        public List<int> InwardLineIds { get; set; } = new();
    }

    public class InwardDto
    {
        public int Id { get; set; }
        public string InwardNo { get; set; } = string.Empty;
        public DateTime InwardDate { get; set; }
        public int? VendorId { get; set; }
        public string? VendorName { get; set; }
        public string? Remarks { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
        public InwardStatus Status { get; set; }
        public int CreatedBy { get; set; }
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; } = true;
        public string? InwardFrom { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool HasActiveQC { get; set; }
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
        public DateTime? QCDate { get; set; }
        public bool HasActiveQC { get; set; }
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
        public decimal? SourceRate { get; set; }
        public decimal? SourceGstPercent { get; set; }
        public DateTime? SourceDate { get; set; }
    }

    public class CreateInwardDto
    {
        public DateTime? InwardDate { get; set; }
        public int? VendorId { get; set; }
        public string? Remarks { get; set; }
        public List<string>? AttachmentUrls { get; set; }
        public List<CreateInwardLineDto> Lines { get; set; } = new();
    }

    public class CreateInwardLineDto
    {
        public int ItemId { get; set; }
        public int Quantity { get; set; } = 1;
        public InwardSourceType SourceType { get; set; }
        public int? SourceRefId { get; set; }
        public string? Remarks { get; set; }
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
    }

    public class JobWorkItemDto
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? MaterialName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
        public string? Remarks { get; set; }
        public string? InwardNo { get; set; }
        public string? QCNo { get; set; }
        public bool IsQCPending { get; set; }
        public bool IsQCApproved { get; set; }
        /// <summary>
        /// Authoritative QC decision from QualityControlItem.IsApproved.
        /// null = no QC item exists or still pending decision,
        /// true = item approved, false = item rejected.
        /// </summary>
        public bool? QCDecision { get; set; }
        /// <summary>Whether the overall QC entry has been finalised (Approved/Rejected status).</summary>
        public bool IsQCEntryFinalised { get; set; }
        public bool IsInwarded { get; set; }
    }

    public class JobWorkDto
    {
        public int Id { get; set; }
        public string JobWorkNo { get; set; } = string.Empty;
        public int ToPartyId { get; set; }
        public string? ToPartyName { get; set; }
        public string? Description { get; set; }
        public string? Remarks { get; set; }
        public JobWorkStatus Status { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
        public List<JobWorkItemDto> Items { get; set; } = new();
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class CreateJobWorkItemDto
    {
        public int ItemId { get; set; }
        public decimal? Rate { get; set; }
        public decimal? GstPercent { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateJobWorkDto
    {
        public int ToPartyId { get; set; }
        public string? Description { get; set; }
        public string? Remarks { get; set; }
        public List<string>? AttachmentUrls { get; set; }
        public List<CreateJobWorkItemDto> Items { get; set; } = new();
    }

    public class TransferItemDto
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public string? ItemTypeName { get; set; }
        public string? MaterialName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string? Remarks { get; set; }
    }

    public class TransferDto
    {
        public int Id { get; set; }
        public string TransferNo { get; set; } = string.Empty;
        public int? FromPartyId { get; set; }
        public string? FromPartyName { get; set; }
        public int? ToPartyId { get; set; }
        public string? ToPartyName { get; set; }
        public DateTime TransferDate { get; set; }
        public string? Remarks { get; set; }
        public string? OutFor { get; set; }
        public string? ReasonDetails { get; set; }
        public string? VehicleNo { get; set; }
        public string? PersonName { get; set; }
        public string? CreatorName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> AttachmentUrls { get; set; } = new();
        public List<TransferItemDto> Items { get; set; } = new();
    }

    public class CreateTransferItemDto
    {
        public int ItemId { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateTransferDto
    {
        public int? FromPartyId { get; set; } // If null, means From Location
        public int? ToPartyId { get; set; }   // If null, means To Location
        public DateTime? TransferDate { get; set; }
        public string? Remarks { get; set; }
        
        [Required(ErrorMessage = "Out For is required.")]
        public string? OutFor { get; set; }
        
        [Required(ErrorMessage = "Reason Details is required.")]
        public string? ReasonDetails { get; set; }
        
        [Required(ErrorMessage = "Vehicle No. is required.")]
        public string? VehicleNo { get; set; }
        
        [Required(ErrorMessage = "Person Name is required.")]
        public string? PersonName { get; set; }
        
        public List<string>? AttachmentUrls { get; set; }
        
        [Required(ErrorMessage = "At least one item is required.")]
        [MinLength(1, ErrorMessage = "At least one item is required.")]
        public List<CreateTransferItemDto> Items { get; set; } = new();
    }

    /// <summary>One row in Purchase Indent report list.</summary>
    public class PIReportRowDto
    {
        public int Id { get; set; }
        public string PiNo { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? CreatorName { get; set; }
        public string? ApproverName { get; set; }
        public int ItemCount { get; set; }
        public string? ReqDateOfDelivery { get; set; }
        public bool MtcReq { get; set; }
    }

    /// <summary>One row in Inward report list.</summary>
    public class InwardReportRowDto
    {
        public int Id { get; set; }
        public string InwardNo { get; set; } = string.Empty;
        public DateTime InwardDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? LocationName { get; set; }
        public string? VendorName { get; set; }
        public int LineCount { get; set; }
        public string? CreatorName { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>One row in Item Ledger (history) report. Location-scoped; no company/location/party filters.</summary>
    public class ItemLedgerRowDto
    {
        public DateTime EventDate { get; set; }
        public string EventType { get; set; } = string.Empty;
        public string ReferenceNo { get; set; } = string.Empty;
        public string? LocationName { get; set; }
        /// <summary>Party name for Inward/QC/Job Work; null for PI/PO; for Transfer use FromToDisplay.</summary>
        public string? PartyName { get; set; }
        /// <summary>Only for Transfer: "From X → To Y".</summary>
        public string? FromToDisplay { get; set; }
        public string? Description { get; set; }
        public string? PreparedBy { get; set; }
        public string? AuthorizedBy { get; set; }
    }
}
