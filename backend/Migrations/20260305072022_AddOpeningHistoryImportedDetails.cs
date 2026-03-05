using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddOpeningHistoryImportedDetails : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImportedItemsJson",
                table: "item_master_opening_history",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImportedOnlyFilePath",
                table: "item_master_opening_history",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TotalRowsInFile",
                table: "item_master_opening_history",
                type: "int",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImportedItemsJson",
                table: "item_master_opening_history");

            migrationBuilder.DropColumn(
                name: "ImportedOnlyFilePath",
                table: "item_master_opening_history");

            migrationBuilder.DropColumn(
                name: "TotalRowsInFile",
                table: "item_master_opening_history");
        }
    }
}
