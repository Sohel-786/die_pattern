using ClosedXML.Excel;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Reflection;
using net_backend.DTOs;

namespace net_backend.Services
{
    public class ExcelService : IExcelService
    {
        private const string ExcelDateTimeFormat = "dd/mm/yyyy, hh:mm AM/PM";

        public byte[] GenerateExcel(IEnumerable<object> data, string sheetName = "Sheet1", string? titleRow = null)
        {
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add(sheetName);
                var rowIdx = 1;

                if (!string.IsNullOrEmpty(titleRow))
                {
                    worksheet.Cell(rowIdx, 1).Value = titleRow;
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 14;
                    rowIdx++;
                }

                if (data == null || !data.Any())
                {
                    using (var stream = new MemoryStream())
                    {
                        workbook.SaveAs(stream);
                        return stream.ToArray();
                    }
                }

                // Get properties for headers
                var firstItem = data.First();
                var properties = firstItem.GetType().GetProperties()
                    .Where(p => p.PropertyType.IsPrimitive || p.PropertyType == typeof(string) || p.PropertyType == typeof(decimal) || p.PropertyType == typeof(double) || p.PropertyType == typeof(DateTime) || p.PropertyType == typeof(int) || p.PropertyType == typeof(int?) || p.PropertyType == typeof(bool) || p.PropertyType.IsEnum)
                    .ToList();

                // Write Headers
                for (int i = 0; i < properties.Count; i++)
                {
                    var cell = worksheet.Cell(rowIdx, i + 1);
                    cell.Value = SplitCamelCase(properties[i].Name);
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F3F4F6"); // Light gray background
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                
                var headerRow = rowIdx;
                rowIdx++;

                // Write Data
                foreach (var item in data)
                {
                    for (int i = 0; i < properties.Count; i++)
                    {
                        var value = properties[i].GetValue(item);
                        var cell = worksheet.Cell(rowIdx, i + 1);
                        if (value == null) cell.Value = "";
                        else if (value is string s) cell.Value = s;
                        else if (value is bool b) cell.Value = b;
                        else if (value is int iVal) cell.Value = iVal;
                        else if (value is long lVal) cell.Value = lVal;
                        else if (value is decimal d) cell.Value = (double)d;
                        else if (value is double db) cell.Value = db;
                        else if (value is DateTime dt)
                        {
                            cell.Value = dt;
                            cell.Style.DateFormat.Format = ExcelDateTimeFormat;
                        }
                        else cell.Value = value.ToString();
                    }
                    rowIdx++;
                }

                // Formatting
                worksheet.Columns().AdjustToContents();
                
                // Add filter to headers if data exists
                if (data.Any())
                {
                    worksheet.Range(headerRow, 1, rowIdx - 1, properties.Count).SetAutoFilter();
                }

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        /// <summary>Item Ledger export with explicit column headers and professional column widths.</summary>
        public byte[] GenerateItemLedgerExcel(IEnumerable<ItemLedgerRowDto> rows, string titleRow)
        {
            var rowList = rows?.ToList() ?? new List<ItemLedgerRowDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Item Ledger");
                var rowIdx = 1;

                if (!string.IsNullOrEmpty(titleRow))
                {
                    worksheet.Cell(rowIdx, 1).Value = titleRow;
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 14;
                    worksheet.Range(rowIdx, 1, rowIdx, 9).Merge();
                    rowIdx++;
                }

                var headers = new[] { "Event Date", "Event Type", "Reference No", "Location", "Party", "From – To", "Description", "Prepared By", "Authorized By" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(rowIdx, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Alignment.WrapText = true;
                }
                var headerRow = rowIdx;
                rowIdx++;

                foreach (var r in rowList)
                {
                    worksheet.Cell(rowIdx, 1).Value = r.EventDate;
                    worksheet.Cell(rowIdx, 1).Style.DateFormat.Format = ExcelDateTimeFormat;
                    worksheet.Cell(rowIdx, 2).Value = r.EventType ?? "";
                    worksheet.Cell(rowIdx, 3).Value = r.ReferenceNo ?? "";
                    worksheet.Cell(rowIdx, 4).Value = r.LocationName ?? "";
                    worksheet.Cell(rowIdx, 5).Value = r.PartyName ?? "";
                    worksheet.Cell(rowIdx, 6).Value = r.FromToDisplay ?? "";
                    worksheet.Cell(rowIdx, 7).Value = r.Description ?? "";
                    worksheet.Cell(rowIdx, 8).Value = r.PreparedBy ?? "";
                    worksheet.Cell(rowIdx, 9).Value = r.AuthorizedBy ?? "";
                    rowIdx++;
                }

                // Professional column widths (min width to fit header + typical content)
                worksheet.Column(1).Width = 18;  // Event Date
                worksheet.Column(2).Width = 14;  // Event Type
                worksheet.Column(3).Width = 16;  // Reference No
                worksheet.Column(4).Width = 22;  // Location
                worksheet.Column(5).Width = 22;  // Party
                worksheet.Column(6).Width = 28;  // From – To
                worksheet.Column(7).Width = 30;  // Description
                worksheet.Column(8).Width = 22;  // Prepared By
                worksheet.Column(9).Width = 22;  // Authorized By

                if (rowList.Any())
                    worksheet.Range(headerRow, 1, rowIdx - 1, 9).SetAutoFilter();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public ImportResultDto<T> ImportExcel<T>(Stream fileStream) where T : new()
        {
            var result = new ImportResultDto<T>();
            using (var workbook = new XLWorkbook(fileStream))
            {
                var worksheet = workbook.Worksheets.FirstOrDefault();
                if (worksheet == null) return result;

                var properties = typeof(T).GetProperties().ToList();
                var firstRow = worksheet.Row(1);
                
                // Map column index to property
                var columnMap = new Dictionary<int, PropertyInfo>();
                foreach (var cell in firstRow.CellsUsed())
                {
                    var header = cell.Value.ToString().Replace(" ", "").ToLower();
                    
                    // Match DTO properties with common Excel header aliases
                    var prop = properties.FirstOrDefault(p => {
                        var propName = p.Name.ToLower();
                        return propName == header || 
                               (propName == "name" && (header == "name" || header == "locationname" || header == "partyname" || header == "entityname")) ||
                               (propName == "companyname" && (header == "companyname" || header == "company" || header == "parentcompany")) ||
                               (propName == "mainpartname" && (header == "mainpartname" || header == "partname")) ||
                               (propName == "currentname" && (header == "currentname" || header == "name")) ||
                               (propName == "itemtype" && (header == "type" || header == "itemtype")) ||
                               (propName == "drawingno" && (header == "drawing" || header == "drawingno")) ||
                               (propName == "revisionno" && (header == "revision" || header == "revisionno")) ||
                               (propName == "email" && (header == "email" || header == "emailid")) ||
                               (propName == "phonenumber" && (header == "phonenumber" || header == "phone" || header == "contactno" || header == "contactno1")) ||
                               (propName == "isactive" && (header == "status" || header == "active"));
                    });
                    
                    if (prop != null)
                    {
                        columnMap.Add(cell.Address.ColumnNumber, prop);
                    }
                }

                var rows = worksheet.RowsUsed().Skip(1).ToList();
                result.TotalRows = rows.Count;

                foreach (var row in rows)
                {
                    var dto = new T();
                    var hasData = false;
                    try
                    {
                        foreach (var entry in columnMap)
                        {
                            var cell = row.Cell(entry.Key);
                            var prop = entry.Value;
                            if (!cell.IsEmpty())
                            {
                                hasData = true;
                                var cellValue = cell.Value.ToString();
                                var targetType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                                
                                object? value;
                                if (targetType == typeof(bool))
                                {
                                    value = cellValue.ToLower() == "yes" || cellValue.ToLower() == "true" || cellValue == "1";
                                }
                                else
                                {
                                    value = Convert.ChangeType(cellValue, targetType);
                                }
                                prop.SetValue(dto, value);
                            }
                        }

                        if (hasData)
                        {
                            result.Data.Add(new ExcelRow<T> { RowNumber = row.RowNumber(), Data = dto });
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add(new RowError { Row = row.RowNumber(), Message = ex.Message });
                    }
                }
            }
            return result;
        }

        /// <inheritdoc />
        public byte[] GenerateItemMasterImportedOnlyExcel(IEnumerable<ItemImportDto> rows)
        {
            var rowList = rows?.ToList() ?? new List<ItemImportDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Imported Items");
                var headers = new[] { "Part Name", "Display Name", "Type", "Drawing No", "Revision", "Material", "Ownership", "Status", "Custodian Type", "Custodian Name" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(1, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                int rowIdx = 2;
                foreach (var dto in rowList)
                {
                    worksheet.Cell(rowIdx, 1).Value = dto.PartName ?? "";
                    worksheet.Cell(rowIdx, 2).Value = dto.DisplayName ?? "";
                    worksheet.Cell(rowIdx, 3).Value = dto.AssetType ?? "";
                    worksheet.Cell(rowIdx, 4).Value = dto.DrawingNo ?? "";
                    worksheet.Cell(rowIdx, 5).Value = dto.Revision ?? "";
                    worksheet.Cell(rowIdx, 6).Value = dto.Material ?? "";
                    worksheet.Cell(rowIdx, 7).Value = dto.Ownership ?? "";
                    worksheet.Cell(rowIdx, 8).Value = dto.Condition ?? "";
                    worksheet.Cell(rowIdx, 9).Value = dto.CustodianType ?? "";
                    worksheet.Cell(rowIdx, 10).Value = dto.CustodianName ?? "";
                    rowIdx++;
                }
                worksheet.Columns().AdjustToContents();
                if (rowList.Count > 0)
                    worksheet.Range(1, 1, rowIdx - 1, headers.Length).SetAutoFilter();
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public byte[] GenerateLocationWiseItemsExcel(IEnumerable<LocationWiseItemRowDto> rows, string? locationName = null)
        {
            var rowList = rows?.ToList() ?? new List<LocationWiseItemRowDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Location Wise Items");
                int rowIdx = 1;

                if (!string.IsNullOrEmpty(locationName))
                {
                    worksheet.Cell(rowIdx, 1).Value = $"Location: {locationName}";
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 12;
                    worksheet.Range(rowIdx, 1, rowIdx, 7).Merge();
                    rowIdx++;
                }

                // Add Generation Timestamp
                worksheet.Cell(rowIdx, 1).Value = $"Report Generated: {DateTime.Now:dd/MM/yyyy, hh:mm tt}";
                worksheet.Cell(rowIdx, 1).Style.Font.Italic = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 10;
                worksheet.Cell(rowIdx, 1).Style.Font.FontColor = XLColor.Gray;
                worksheet.Range(rowIdx, 1, rowIdx, 7).Merge();
                rowIdx++;

                var headers = new[] { "Main Part Name", "Current Name", "Drawing No", "Item Type", "Condition", "Process", "Active Status" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(rowIdx, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                var headerRow = rowIdx;
                rowIdx++;

                foreach (var r in rowList)
                {
                    worksheet.Cell(rowIdx, 1).Value = r.MainPartName ?? "";
                    worksheet.Cell(rowIdx, 2).Value = r.CurrentName ?? "";
                    worksheet.Cell(rowIdx, 3).Value = r.DrawingNo ?? "";
                    worksheet.Cell(rowIdx, 4).Value = r.ItemTypeName ?? "";
                    worksheet.Cell(rowIdx, 5).Value = r.StatusName ?? "";
                    worksheet.Cell(rowIdx, 6).Value = r.CurrentProcess ?? "";
                    worksheet.Cell(rowIdx, 7).Value = r.IsActive ? "Active" : "Inactive";
                    rowIdx++;
                }
                worksheet.Column(1).Width = 28;
                worksheet.Column(2).Width = 24;
                worksheet.Column(3).Width = 16;
                worksheet.Column(4).Width = 14;
                worksheet.Column(5).Width = 14;
                worksheet.Column(6).Width = 16;
                worksheet.Column(7).Width = 12;
                if (rowList.Count > 0)
                    worksheet.Range(headerRow, 1, rowIdx - 1, headers.Length).SetAutoFilter();
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public byte[] GenerateItemsAtVendorExcel(IEnumerable<ItemAtVendorRowDto> rows, string? locationName = null)
        {
            var rowList = rows?.ToList() ?? new List<ItemAtVendorRowDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Patterns at Vendor");
                int rowIdx = 1;

                if (!string.IsNullOrEmpty(locationName))
                {
                    worksheet.Cell(rowIdx, 1).Value = $"Location: {locationName}";
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 12;
                    worksheet.Range(rowIdx, 1, rowIdx, 6).Merge();
                    rowIdx++;
                }

                // Add Generation Timestamp
                worksheet.Cell(rowIdx, 1).Value = $"Report Generated: {DateTime.Now:dd/MM/yyyy, hh:mm tt}";
                worksheet.Cell(rowIdx, 1).Style.Font.Italic = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 10;
                worksheet.Cell(rowIdx, 1).Style.Font.FontColor = XLColor.Gray;
                worksheet.Range(rowIdx, 1, rowIdx, 6).Merge();
                rowIdx++;

                var headers = new[] { "Vendor", "Main Part Name", "Current Name", "Drawing No", "Item Type", "Process" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(rowIdx, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#E5E7EB");
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                }
                var headerRow = rowIdx;
                rowIdx++;

                foreach (var r in rowList)
                {
                    worksheet.Cell(rowIdx, 1).Value = r.VendorName ?? "";
                    worksheet.Cell(rowIdx, 2).Value = r.MainPartName ?? "";
                    worksheet.Cell(rowIdx, 3).Value = r.CurrentName ?? "";
                    worksheet.Cell(rowIdx, 4).Value = r.DrawingNo ?? "";
                    worksheet.Cell(rowIdx, 5).Value = r.ItemTypeName ?? "";
                    worksheet.Cell(rowIdx, 6).Value = r.CurrentProcess ?? "";
                    rowIdx++;
                }
                worksheet.Column(1).Width = 24;
                worksheet.Column(2).Width = 28;
                worksheet.Column(3).Width = 24;
                worksheet.Column(4).Width = 16;
                worksheet.Column(5).Width = 14;
                worksheet.Column(6).Width = 14;
                if (rowList.Count > 0)
                    worksheet.Range(headerRow, 1, rowIdx - 1, headers.Length).SetAutoFilter();
                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public byte[] GeneratePendingPIExcel(IEnumerable<PendingPIRowDto> rows, string? locationName = null)
        {
            var rowList = rows?.ToList() ?? new List<PendingPIRowDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Pending PI");
                int rowIdx = 1;

                if (!string.IsNullOrEmpty(locationName))
                {
                    worksheet.Cell(rowIdx, 1).Value = $"Location: {locationName}";
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 13;
                    worksheet.Range(rowIdx, 1, rowIdx, 9).Merge();
                    rowIdx++;
                }

                // Report title
                worksheet.Cell(rowIdx, 1).Value = "Pending Purchase Indents — Items Without Active PO";
                worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 11;
                worksheet.Range(rowIdx, 1, rowIdx, 9).Merge();
                rowIdx++;

                // Generation timestamp
                worksheet.Cell(rowIdx, 1).Value = $"Report Generated: {DateTime.Now:dd/MM/yyyy, hh:mm tt}";
                worksheet.Cell(rowIdx, 1).Style.Font.Italic = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 10;
                worksheet.Cell(rowIdx, 1).Style.Font.FontColor = XLColor.Gray;
                worksheet.Range(rowIdx, 1, rowIdx, 9).Merge();
                rowIdx++;

                // Header row
                var headers = new[] { "Sr.", "PI No", "PI Date", "PI Status", "Type", "Item Description", "Drawing No", "Item Type", "Created By" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(rowIdx, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontSize = 10;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A5F");
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }
                var headerRow = rowIdx;
                rowIdx++;

                int sr = 1;
                foreach (var r in rowList)
                {
                    var itemDesc = !string.IsNullOrWhiteSpace(r.CurrentName) ? r.CurrentName : r.MainPartName;
                    if (!string.IsNullOrWhiteSpace(r.MainPartName) && r.CurrentName != r.MainPartName)
                        itemDesc = $"{r.CurrentName} ({r.MainPartName})";

                    worksheet.Cell(rowIdx, 1).Value = sr++;
                    worksheet.Cell(rowIdx, 2).Value = r.PiNo ?? "";
                    worksheet.Cell(rowIdx, 3).Value = r.PiDate;
                    worksheet.Cell(rowIdx, 3).Style.DateFormat.Format = ExcelDateTimeFormat;
                    worksheet.Cell(rowIdx, 4).Value = r.PiStatus ?? "";
                    // Color-code PI Status cell
                    if (r.PiStatus == "PI Approved")
                        worksheet.Cell(rowIdx, 4).Style.Fill.BackgroundColor = XLColor.FromHtml("#D1FAE5");
                    else
                        worksheet.Cell(rowIdx, 4).Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");
                    worksheet.Cell(rowIdx, 5).Value = r.Type ?? "";
                    worksheet.Cell(rowIdx, 6).Value = itemDesc;
                    worksheet.Cell(rowIdx, 7).Value = r.DrawingNo ?? "";
                    worksheet.Cell(rowIdx, 8).Value = r.ItemTypeName ?? "";
                    worksheet.Cell(rowIdx, 9).Value = r.CreatorName ?? "";

                    // Alternate row shading
                    if (sr % 2 == 0)
                    {
                        for (int c = 1; c <= 9; c++)
                        {
                            var cell = worksheet.Cell(rowIdx, c);
                            if (cell.Style.Fill.BackgroundColor == XLColor.NoColor)
                                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F9FAFB");
                        }
                    }
                    rowIdx++;
                }

                worksheet.Column(1).Width = 6;
                worksheet.Column(2).Width = 14;
                worksheet.Column(3).Width = 22;
                worksheet.Column(4).Width = 18;
                worksheet.Column(5).Width = 14;
                worksheet.Column(6).Width = 40;
                worksheet.Column(7).Width = 18;
                worksheet.Column(8).Width = 16;
                worksheet.Column(9).Width = 22;

                if (rowList.Count > 0)
                    worksheet.Range(headerRow, 1, rowIdx - 1, headers.Length).SetAutoFilter();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        public byte[] GeneratePendingPOExcel(IEnumerable<PendingPORowDto> rows, string? locationName = null)
        {
            var rowList = rows?.ToList() ?? new List<PendingPORowDto>();
            using (var workbook = new XLWorkbook())
            {
                var worksheet = workbook.Worksheets.Add("Pending PO");
                int rowIdx = 1;

                if (!string.IsNullOrEmpty(locationName))
                {
                    worksheet.Cell(rowIdx, 1).Value = $"Location: {locationName}";
                    worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                    worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 13;
                    worksheet.Range(rowIdx, 1, rowIdx, 17).Merge();
                    rowIdx++;
                }

                // Report title
                worksheet.Cell(rowIdx, 1).Value = "Pending Purchase Orders — Items Without Active Inward";
                worksheet.Cell(rowIdx, 1).Style.Font.Bold = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 11;
                worksheet.Range(rowIdx, 1, rowIdx, 17).Merge();
                rowIdx++;

                // Generation timestamp
                worksheet.Cell(rowIdx, 1).Value = $"Report Generated: {DateTime.Now:dd/MM/yyyy, hh:mm tt}";
                worksheet.Cell(rowIdx, 1).Style.Font.Italic = true;
                worksheet.Cell(rowIdx, 1).Style.Font.FontSize = 10;
                worksheet.Cell(rowIdx, 1).Style.Font.FontColor = XLColor.Gray;
                worksheet.Range(rowIdx, 1, rowIdx, 17).Merge();
                rowIdx++;

                // Header row
                var headers = new[] { "Sr.", "PO No", "PO Date", "Vendor", "PO Status", "Delivery Date", "Created By", "Remarks", "PI No", "PI Date", "Item Description", "Type", "Drawing No", "Material", "Unit Rate (₹)", "Tax", "Total Amount" };
                for (int c = 0; c < headers.Length; c++)
                {
                    var cell = worksheet.Cell(rowIdx, c + 1);
                    cell.Value = headers[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontSize = 10;
                    cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A5F");
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                }
                var headerRow = rowIdx;
                rowIdx++;

                int sr = 1;
                foreach (var r in rowList)
                {
                    var itemDesc = !string.IsNullOrWhiteSpace(r.CurrentName) ? r.CurrentName : r.MainPartName;
                    if (!string.IsNullOrWhiteSpace(r.MainPartName) && r.CurrentName != r.MainPartName)
                        itemDesc = $"{r.CurrentName} ({r.MainPartName})";

                    worksheet.Cell(rowIdx, 1).Value = sr++;
                    worksheet.Cell(rowIdx, 2).Value = r.PoNo ?? "";
                    worksheet.Cell(rowIdx, 3).Value = r.PoDate;
                    worksheet.Cell(rowIdx, 3).Style.DateFormat.Format = ExcelDateTimeFormat;
                    worksheet.Cell(rowIdx, 4).Value = r.VendorName ?? "";
                    worksheet.Cell(rowIdx, 5).Value = r.PoStatus ?? "";

                    // Color-code PO Status cell
                    if (r.PoStatus == "PO Approved")
                        worksheet.Cell(rowIdx, 5).Style.Fill.BackgroundColor = XLColor.FromHtml("#D1FAE5");
                    else
                        worksheet.Cell(rowIdx, 5).Style.Fill.BackgroundColor = XLColor.FromHtml("#FEF3C7");

                    worksheet.Cell(rowIdx, 6).Value = r.DeliveryDate;
                    worksheet.Cell(rowIdx, 6).Style.DateFormat.Format = ExcelDateTimeFormat;
                    worksheet.Cell(rowIdx, 7).Value = r.CreatorName ?? "";
                    worksheet.Cell(rowIdx, 8).Value = r.Remarks ?? "";

                    worksheet.Cell(rowIdx, 9).Value = r.PiNo ?? "";
                    worksheet.Cell(rowIdx, 10).Value = r.PiDate;
                    worksheet.Cell(rowIdx, 10).Style.DateFormat.Format = ExcelDateTimeFormat;

                    worksheet.Cell(rowIdx, 11).Value = itemDesc;
                    worksheet.Cell(rowIdx, 12).Value = r.ItemTypeName ?? "";

                    var drawingRev = r.DrawingNo ?? "";
                    if (!string.IsNullOrEmpty(r.RevisionNo)) drawingRev += $" / R{r.RevisionNo}";
                    worksheet.Cell(rowIdx, 13).Value = drawingRev;

                    worksheet.Cell(rowIdx, 14).Value = r.MaterialName ?? "";
                    worksheet.Cell(rowIdx, 15).Value = (double)r.Rate;
                    worksheet.Cell(rowIdx, 15).Style.NumberFormat.Format = "₹ #,##0.00";
                    worksheet.Cell(rowIdx, 16).Value = (double)r.TaxAmount;
                    worksheet.Cell(rowIdx, 16).Style.NumberFormat.Format = "₹ #,##0.00";
                    worksheet.Cell(rowIdx, 17).Value = (double)r.TotalAmount;
                    worksheet.Cell(rowIdx, 17).Style.NumberFormat.Format = "₹ #,##0.00";

                    // Alternate row shading
                    if (sr % 2 == 0)
                    {
                        for (int c = 1; c <= 17; c++)
                        {
                            var cell = worksheet.Cell(rowIdx, c);
                            if (cell.Style.Fill.BackgroundColor == XLColor.NoColor)
                                cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#F9FAFB");
                        }
                    }
                    rowIdx++;
                }

                worksheet.Column(1).Width = 6;
                worksheet.Column(2).Width = 14;
                worksheet.Column(3).Width = 22;
                worksheet.Column(4).Width = 24;
                worksheet.Column(5).Width = 18;
                worksheet.Column(6).Width = 22;
                worksheet.Column(7).Width = 22;
                worksheet.Column(8).Width = 25;
                worksheet.Column(9).Width = 14;
                worksheet.Column(10).Width = 22;
                worksheet.Column(11).Width = 40;
                worksheet.Column(12).Width = 16;
                worksheet.Column(13).Width = 18;
                worksheet.Column(14).Width = 18;
                worksheet.Column(15).Width = 16;
                worksheet.Column(16).Width = 16;
                worksheet.Column(17).Width = 16;

                if (rowList.Count > 0)
                    worksheet.Range(headerRow, 1, rowIdx - 1, headers.Length).SetAutoFilter();

                using (var stream = new MemoryStream())
                {
                    workbook.SaveAs(stream);
                    return stream.ToArray();
                }
            }
        }

        private string SplitCamelCase(string input)
        {
            if (string.IsNullOrEmpty(input)) return input;
            return System.Text.RegularExpressions.Regex.Replace(input, "([A-Z])", " $1", System.Text.RegularExpressions.RegexOptions.Compiled).Trim();
        }
    }
}
