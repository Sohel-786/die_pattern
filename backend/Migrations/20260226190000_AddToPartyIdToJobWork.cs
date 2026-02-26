using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    [Migration("20260226190000_AddToPartyIdToJobWork")]
    public partial class AddToPartyIdToJobWork : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ToPartyId",
                table: "job_works",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_ToPartyId",
                table: "job_works",
                column: "ToPartyId");

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works",
                column: "ToPartyId",
                principalTable: "parties",
                principalColumn: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works");

            migrationBuilder.DropIndex(
                name: "IX_job_works_ToPartyId",
                table: "job_works");

            migrationBuilder.DropColumn(
                name: "ToPartyId",
                table: "job_works");
        }
    }
}
