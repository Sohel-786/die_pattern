using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    [Migration("20260224160000_AddCompanyMasterFields")]
    public class AddCompanyMasterFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Pan",
                table: "companies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "State",
                table: "companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Pincode",
                table: "companies",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "companies",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Email",
                table: "companies",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Pan", table: "companies");
            migrationBuilder.DropColumn(name: "State", table: "companies");
            migrationBuilder.DropColumn(name: "City", table: "companies");
            migrationBuilder.DropColumn(name: "Pincode", table: "companies");
            migrationBuilder.DropColumn(name: "Phone", table: "companies");
            migrationBuilder.DropColumn(name: "Email", table: "companies");
        }
    }
}
