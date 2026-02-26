using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Remove Location selection from Purchase Indents.</summary>
    [Migration("20260226120000_RemoveLocationIdFromPurchaseIndents")]
    public partial class RemoveLocationIdFromPurchaseIndents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_purchase_indents_locations_LocationId",
                table: "purchase_indents");

            migrationBuilder.DropIndex(
                name: "IX_purchase_indents_LocationId",
                table: "purchase_indents");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "purchase_indents");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "purchase_indents",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_LocationId",
                table: "purchase_indents",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_indents_locations_LocationId",
                table: "purchase_indents",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
