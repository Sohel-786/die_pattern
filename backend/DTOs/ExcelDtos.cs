namespace backend.DTOs
{
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

    public class PatternDieOpeningImportDto
    {
        public string MainPartName { get; set; } = string.Empty;
        public string? CurrentName { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? DrawingNo { get; set; }
        public string? RevisionNo { get; set; }
        public string Material { get; set; } = string.Empty;
        public string OwnerType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string CurrentLocation { get; set; } = string.Empty;
        public string? CurrentVendor { get; set; }
    }
}
