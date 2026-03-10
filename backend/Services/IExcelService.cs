using net_backend.DTOs;

namespace net_backend.Services
{
    public interface IExcelService
    {
        byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null);
        byte[] GenerateItemLedgerExcel(IEnumerable<ItemLedgerRowDto> rows, string titleRow);
        ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new();
        /// <summary>Generates an Excel with the same columns as the Item Master template (PartName, DisplayName, AssetType, etc.) for "imported items only" download.</summary>
        byte[] GenerateItemMasterImportedOnlyExcel(IEnumerable<ItemImportDto> rows);
        byte[] GenerateLocationWiseItemsExcel(IEnumerable<LocationWiseItemRowDto> rows, string? locationName = null);
        byte[] GenerateItemsAtVendorExcel(IEnumerable<ItemAtVendorRowDto> rows, string? locationName = null);
        byte[] GeneratePendingPIExcel(IEnumerable<PendingPIRowDto> rows, string? locationName = null);
        byte[] GeneratePendingPOExcel(IEnumerable<PendingPORowDto> rows, string? locationName = null);
    }
}
