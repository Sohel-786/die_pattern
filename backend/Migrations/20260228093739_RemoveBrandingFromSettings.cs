using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RemoveBrandingFromSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompanyLogo",
                table: "app_settings");

            migrationBuilder.DropColumn(
                name: "CompanyName",
                table: "app_settings");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CompanyLogo",
                table: "app_settings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CompanyName",
                table: "app_settings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
