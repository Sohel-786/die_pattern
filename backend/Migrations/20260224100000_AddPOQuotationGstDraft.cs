using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    [Migration("20260224100000_AddPOQuotationGstDraft")]
    public partial class AddPOQuotationGstDraft : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "GstPercent",
                table: "purchase_orders",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GstType",
                table: "purchase_orders",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuotationUrlsJson",
                table: "purchase_orders",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "GstPercent", table: "purchase_orders");
            migrationBuilder.DropColumn(name: "GstType", table: "purchase_orders");
            migrationBuilder.DropColumn(name: "QuotationUrlsJson", table: "purchase_orders");
        }
    }
}
