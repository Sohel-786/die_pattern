using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RefactorInwardForMultipleSourcesAndRemarks : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works");

            migrationBuilder.DropColumn(
                name: "SourceRefId",
                table: "inwards");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "inwards");

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceRefId",
                table: "inward_lines",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SourceType",
                table: "inward_lines",
                type: "int",
                nullable: false,
                defaultValue: 0);

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

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "SourceRefId",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "inward_lines");

            migrationBuilder.AddColumn<int>(
                name: "SourceRefId",
                table: "inwards",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "SourceType",
                table: "inwards",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works",
                column: "ToPartyId",
                principalTable: "parties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
