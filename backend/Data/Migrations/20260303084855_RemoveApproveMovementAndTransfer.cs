using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class RemoveApproveMovementAndTransfer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApproveMovement",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ApproveTransfer",
                table: "user_permissions");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ApproveMovement",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ApproveTransfer",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
