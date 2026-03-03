using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddTransferAttachments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrlsJson",
                table: "transfers",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentUrlsJson",
                table: "transfers");
        }
    }
}
