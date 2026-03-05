using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class LocationWiseItems : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_items_LocationId",
                table: "items");

            migrationBuilder.DropIndex(
                name: "IX_items_MainPartName",
                table: "items");

            migrationBuilder.CreateIndex(
                name: "IX_items_LocationId_MainPartName",
                table: "items",
                columns: new[] { "LocationId", "MainPartName" },
                unique: true,
                filter: "[LocationId] IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_items_LocationId_MainPartName",
                table: "items");

            migrationBuilder.CreateIndex(
                name: "IX_items_LocationId",
                table: "items",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_items_MainPartName",
                table: "items",
                column: "MainPartName",
                unique: true);
        }
    }
}
