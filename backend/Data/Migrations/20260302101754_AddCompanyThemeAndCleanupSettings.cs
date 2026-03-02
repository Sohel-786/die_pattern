using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddCompanyThemeAndCleanupSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrimaryColor",
                table: "app_settings");

            migrationBuilder.AddColumn<string>(
                name: "ThemeColor",
                table: "companies",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThemeColor",
                table: "companies");

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                table: "app_settings",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);
        }
    }
}
