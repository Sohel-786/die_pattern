using net_backend.Models;

namespace net_backend.DTOs
{
    public class PatternDieDto
    {
        public int Id { get; set; }
        public string MainPartName { get; set; } = string.Empty;
        public string CurrentName { get; set; } = string.Empty;
        public int PatternTypeId { get; set; }
        public string? PatternTypeName { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public string? MaterialName { get; set; }
        public int OwnerTypeId { get; set; }
        public string? OwnerTypeName { get; set; }
        public int StatusId { get; set; }
        public string? StatusName { get; set; }
        public HolderType CurrentHolderType { get; set; }
        public int? CurrentLocationId { get; set; }
        public string? CurrentLocationName { get; set; }
        public int? CurrentPartyId { get; set; }
        public string? CurrentPartyName { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreatePatternDieDto
    {
        public string MainPartName { get; set; } = string.Empty;
        public string CurrentName { get; set; } = string.Empty;
        public int PatternTypeId { get; set; }
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public int MaterialId { get; set; }
        public int OwnerTypeId { get; set; }
        public int StatusId { get; set; }
        public HolderType CurrentHolderType { get; set; }
        public int? CurrentLocationId { get; set; }
        public int? CurrentPartyId { get; set; }
    }

    public class UpdatePatternDieDto
    {
        public int Id { get; set; }
        public int StatusId { get; set; }
        public string? DrawingNo { get; set; }
        public bool IsActive { get; set; }
    }

    public class PatternChangeRequestDto
    {
        public int PatternDieId { get; set; }
        public string NewName { get; set; } = string.Empty;
        public string NewRevision { get; set; } = string.Empty;
        public string ChangeType { get; set; } = string.Empty; // Modification / Repair
        public string? Remarks { get; set; }
    }
}
