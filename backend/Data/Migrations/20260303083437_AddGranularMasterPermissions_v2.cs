using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddGranularMasterPermissions_v2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AddMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ExportMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ImportMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AddMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ExportMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ImportMaster",
                table: "user_permissions");
        }
    }
}
