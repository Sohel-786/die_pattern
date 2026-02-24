using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RenameQuotationUrlToQuotationNo : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "QuotationUrl",
                table: "purchase_orders",
                newName: "QuotationNo");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "QuotationNo",
                table: "purchase_orders",
                newName: "QuotationUrl");
        }
    }
}
