using net_backend.DTOs;

namespace net_backend.Services
{
    public interface IExcelService
    {
        byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null);
        byte[] GenerateItemLedgerExcel(IEnumerable<ItemLedgerRowDto> rows, string titleRow);
        ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new();
    }
}
