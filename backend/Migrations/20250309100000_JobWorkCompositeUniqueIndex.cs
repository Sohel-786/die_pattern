using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class JobWorkCompositeUniqueIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_job_works_JobWorkNo",
                table: "job_works");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_LocationId_JobWorkNo",
                table: "job_works",
                columns: new[] { "LocationId", "JobWorkNo" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_job_works_LocationId_JobWorkNo",
                table: "job_works");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_JobWorkNo",
                table: "job_works",
                column: "JobWorkNo",
                unique: true);
        }
    }
}
