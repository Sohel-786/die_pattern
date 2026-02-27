using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddInwardLineSnapshots : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DrawingNo",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ItemTypeName",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MaterialName",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevisionNo",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DrawingNo",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "ItemTypeName",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "MaterialName",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "RevisionNo",
                table: "inward_lines");
        }
    }
}
