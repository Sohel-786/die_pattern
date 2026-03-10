namespace net_backend.DTOs;

/// <summary>Row for Location Wise Pattern Count table and export.</summary>
public class LocationWiseItemRowDto
{
    public int Id { get; set; }
    public string LocationName { get; set; } = string.Empty;
    public string MainPartName { get; set; } = string.Empty;
    public string? CurrentName { get; set; }
    public string? DrawingNo { get; set; }
    public string? ItemTypeName { get; set; }
    public string? StatusName { get; set; }
    public string CurrentProcess { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

/// <summary>Row for Patterns at Vendor table and export.</summary>
public class ItemAtVendorRowDto
{
    public int Id { get; set; }
    public string? VendorName { get; set; }
    public string MainPartName { get; set; } = string.Empty;
    public string? CurrentName { get; set; }
    public string? DrawingNo { get; set; }
    public string? ItemTypeName { get; set; }
    public string CurrentProcess { get; set; } = string.Empty;
}

/// <summary>Row for Pending PI export.</summary>
public class PendingPIRowDto
{
    public int Id { get; set; }
    public string PiNo { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatorName { get; set; }
    public int ItemCount { get; set; }
}

/// <summary>Row for Pending PO export.</summary>
public class PendingPORowDto
{
    public int Id { get; set; }
    public string PoNo { get; set; } = string.Empty;
    public string? VendorName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Remarks { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CreatorName { get; set; }
}
