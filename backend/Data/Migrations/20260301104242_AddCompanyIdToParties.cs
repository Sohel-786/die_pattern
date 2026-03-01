using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddCompanyIdToParties : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_parties_locations_LocationId",
                table: "parties");

            migrationBuilder.DropIndex(
                name: "IX_parties_LocationId",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "Pan",
                table: "companies");

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "parties",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_parties_CompanyId",
                table: "parties",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_parties_companies_CompanyId",
                table: "parties",
                column: "CompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_parties_companies_CompanyId",
                table: "parties");

            migrationBuilder.DropIndex(
                name: "IX_parties_CompanyId",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "parties");

            migrationBuilder.AddColumn<string>(
                name: "Pan",
                table: "companies",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_parties_LocationId",
                table: "parties",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_parties_locations_LocationId",
                table: "parties",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
