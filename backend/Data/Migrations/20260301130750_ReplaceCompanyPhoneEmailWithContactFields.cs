using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class ReplaceCompanyPhoneEmailWithContactFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "companies");

            migrationBuilder.RenameColumn(
                name: "Phone",
                table: "companies",
                newName: "ContactNumber");

            migrationBuilder.AddColumn<string>(
                name: "ContactPerson",
                table: "companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactPerson",
                table: "companies");

            migrationBuilder.RenameColumn(
                name: "ContactNumber",
                table: "companies",
                newName: "Phone");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "companies",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }
    }
}
