using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RemoveQuantityWeightFromPOItems : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "purchase_order_items");

            migrationBuilder.DropColumn(
                name: "Weight",
                table: "purchase_order_items");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "purchase_order_items",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<decimal>(
                name: "Weight",
                table: "purchase_order_items",
                type: "decimal(18,4)",
                nullable: true);
        }
    }
}
