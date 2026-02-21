namespace net_backend.DTOs
{
    public class ItemImportDto
    {
        public string MainPartName { get; set; } = string.Empty;
        public string CurrentName { get; set; } = string.Empty;
        public string ItemType { get; set; } = string.Empty;
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string Material { get; set; } = string.Empty;
        public string OwnerType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CurrentHolderType { get; set; } = string.Empty; // Location / Vendor
        public string? CurrentHolderName { get; set; }
    }

    public class MasterImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class LocationImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
    }

    public class PartyImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
    }

    public class RowError
    {
        public int Row { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ExcelRow<T> where T : new()
    {
        public int RowNumber { get; set; }
        public T Data { get; set; } = new T();
    }

    public class ValidationEntry<T> where T : new()
    {
        public int Row { get; set; }
        public T Data { get; set; } = new T();
        public string? Message { get; set; }
    }

    public class ValidationResultDto<T> where T : new()
    {
        public List<ValidationEntry<T>> Valid { get; set; } = new();
        public List<ValidationEntry<T>> Duplicates { get; set; } = new();
        public List<ValidationEntry<T>> AlreadyExists { get; set; } = new();
        public List<ValidationEntry<T>> Invalid { get; set; } = new();
        public int TotalRows { get; set; }
    }

    public class ImportResultDto<T> where T : new()
    {
        public int Imported { get; set; }
        public int TotalRows { get; set; }
        public List<RowError> Errors { get; set; } = new List<RowError>();
        public List<ExcelRow<T>> Data { get; set; } = new List<ExcelRow<T>>();
    }
}
