using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddUpdatedAtToTransfers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_job_works_LocationId",
                table: "job_works");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "transfers",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "transfers");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_LocationId",
                table: "job_works",
                column: "LocationId");
        }
    }
}
