using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddLinkedCompanyId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LinkedCompanyId",
                table: "parties",
                type: "int",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LinkedCompanyId",
                table: "parties");
        }
    }
}
