using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddItemNameSnapshotToPurchaseIndentItem : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ItemNameSnapshot",
                table: "purchase_indent_items",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ItemNameSnapshot",
                table: "purchase_indent_items");
        }
    }
}
