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

/// <summary>Item-level row for Pending PI export. One row per item that has no active PO yet.</summary>
public class PendingPIRowDto
{
    public int Id { get; set; }
    public string PiNo { get; set; } = string.Empty;
    public DateTime PiDate { get; set; }
    public string PiStatus { get; set; } = string.Empty; // "PI Approved" or "Approval Pending"
    public string Type { get; set; } = string.Empty;
    public string? CreatorName { get; set; }
    public string? Remarks { get; set; }
    // Item-level
    public string MainPartName { get; set; } = string.Empty;
    public string? CurrentName { get; set; }
    public string? DrawingNo { get; set; }
    public string? ItemTypeName { get; set; }
}

/// <summary>Row for Pending PO export.</summary>
public class PendingPORowDto
{
    public int Id { get; set; }
    public string PoNo { get; set; } = string.Empty;
    public DateTime PoDate { get; set; }
    public string? PoStatus { get; set; }
    public string? VendorName { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? CreatorName { get; set; }
    public string? Remarks { get; set; }
    
    // PI details
    public string? PiNo { get; set; }
    public DateTime? PiDate { get; set; }

    // Item-level
    public string? MainPartName { get; set; }
    public string? CurrentName { get; set; }
    public string? DrawingNo { get; set; }
    public string? RevisionNo { get; set; }
    public string? ItemTypeName { get; set; }
    public string? MaterialName { get; set; }
    public decimal Rate { get; set; }
    public decimal GstPercent { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
}
