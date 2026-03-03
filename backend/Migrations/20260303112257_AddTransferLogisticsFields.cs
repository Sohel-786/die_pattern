using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddTransferLogisticsFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OutFor",
                table: "transfers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReasonDetails",
                table: "transfers",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VehicleNo",
                table: "transfers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PersonName",
                table: "transfers",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OutFor",
                table: "transfers");

            migrationBuilder.DropColumn(
                name: "ReasonDetails",
                table: "transfers");

            migrationBuilder.DropColumn(
                name: "VehicleNo",
                table: "transfers");

            migrationBuilder.DropColumn(
                name: "PersonName",
                table: "transfers");
        }
    }
}
