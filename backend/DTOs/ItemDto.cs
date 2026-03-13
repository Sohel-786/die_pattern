using net_backend.Models;

namespace net_backend.DTOs
{
    public class ItemDto
    {
        public int Id { get; set; }
        public string MainPartName { get; set; } = string.Empty;
        public string CurrentName { get; set; } = string.Empty;
        public int ItemTypeId { get; set; }
        public string? ItemTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public int OwnerTypeId { get; set; }
        public string? OwnerTypeName { get; set; }
        public int StatusId { get; set; }
        public string? StatusName { get; set; }
        public int? CurrentLocationId { get; set; }
        public string? CurrentLocationName { get; set; }
        public int? CurrentPartyId { get; set; }
        public string? CurrentPartyName { get; set; }
        /// <summary>Latest process state for display: PI Issued, PO Issued, In Inward, In QC, In Job Work, In Stock, Not In Stock.</summary>
        public string? CurrentProcess { get; set; }
        public string? CurrentHolderType { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateItemDto
    {
        public string MainPartName { get; set; } = string.Empty;
        public string CurrentName { get; set; } = string.Empty;
        public int ItemTypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }
        public bool IsActive { get; set; } = true;
        public string? CurrentHolderType { get; set; }
        public int? CurrentLocationId { get; set; }
        public int? CurrentPartyId { get; set; }
    }

    public class UpdateItemDto
    {
        public int Id { get; set; }
        /// <summary>Main Die/Part Name. Only applied when item has no transaction or transfer history (admin-only update).</summary>
        public string? MainPartName { get; set; }
        public string? CurrentName { get; set; }
        public int ItemTypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }
        public bool IsActive { get; set; }
        public string? CurrentHolderType { get; set; }
        public int? CurrentLocationId { get; set; }
        public int? CurrentPartyId { get; set; }
    }

    /// <summary>Body for PATCH /items/{id}/active. Only Not In Stock or In Stock items can be deactivated.</summary>
    public class ToggleItemActiveDto
    {
        public bool IsActive { get; set; }
    }

    public class ItemChangeRequestDto
    {
        public int ItemId { get; set; }
        public string NewName { get; set; } = string.Empty;
        public string NewRevision { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty; // Modification / Repair
        public string? Remarks { get; set; }
    }

    public class ItemNameHistoryEntryDto
    {
        public int Id { get; set; }
        public DateTime CreatedAt { get; set; }
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty;
        public string? Source { get; set; }
        public string? JobWorkNo { get; set; }
        public string? InwardNo { get; set; }
        public string? QcNo { get; set; }
        public string? CreatedByName { get; set; }
        public bool CanRevert { get; set; }
    }

    public class RevertNameRequestDto
    {
        public int ChangeLogId { get; set; }
    }
}
