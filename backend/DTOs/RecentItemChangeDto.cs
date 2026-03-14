using System;

namespace net_backend.DTOs
{
    /// <summary>One row representing a recent item display-name change, for dashboard and exports.</summary>
    public class RecentItemChangeRowDto
    {
        /// <summary>Date/time when the version change was recorded.</summary>
        public DateTime ChangedAt { get; set; }
        public int ItemId { get; set; }
        public string MainPartName { get; set; } = string.Empty;
        public string OldName { get; set; } = string.Empty;
        public string NewName { get; set; } = string.Empty;
        public string? ChangeType { get; set; }
        public string? Source { get; set; }
        public string? JobWorkNo { get; set; }
        public DateTime? JobWorkDate { get; set; }
        public string? InwardNo { get; set; }
        public DateTime? InwardDate { get; set; }
        public string? QcNo { get; set; }
        public DateTime? QcDate { get; set; }
        /// <summary>When non-null, indicates the change occurred from a Revert operation.</summary>
        public string? Revert { get; set; }
    }
}

