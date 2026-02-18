using backend.DTOs;

namespace backend.Services
{
    public interface IExcelService
    {
        byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null);
        ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new();
    }
}
