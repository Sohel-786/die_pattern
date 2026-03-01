using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class UpdateJobWorkModelV2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_job_works_items_ItemId",
                table: "job_works");

            migrationBuilder.DropForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works");

            migrationBuilder.DropIndex(
                name: "IX_job_works_ItemId",
                table: "job_works");

            migrationBuilder.DropColumn(
                name: "ItemId",
                table: "job_works");

            migrationBuilder.AlterColumn<int>(
                name: "ToPartyId",
                table: "job_works",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LocationId",
                table: "job_works",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentUrlsJson",
                table: "job_works",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "job_works",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Remarks",
                table: "job_works",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "job_work_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobWorkId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    GstPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_work_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_work_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_job_work_items_job_works_JobWorkId",
                        column: x => x.JobWorkId,
                        principalTable: "job_works",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_job_work_items_ItemId",
                table: "job_work_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_job_work_items_JobWorkId",
                table: "job_work_items",
                column: "JobWorkId");

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works",
                column: "ToPartyId",
                principalTable: "parties",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works");

            migrationBuilder.DropTable(
                name: "job_work_items");

            migrationBuilder.DropColumn(
                name: "AttachmentUrlsJson",
                table: "job_works");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "job_works");

            migrationBuilder.DropColumn(
                name: "Remarks",
                table: "job_works");

            migrationBuilder.AlterColumn<int>(
                name: "ToPartyId",
                table: "job_works",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<int>(
                name: "LocationId",
                table: "job_works",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "ItemId",
                table: "job_works",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_ItemId",
                table: "job_works",
                column: "ItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_items_ItemId",
                table: "job_works",
                column: "ItemId",
                principalTable: "items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_parties_ToPartyId",
                table: "job_works",
                column: "ToPartyId",
                principalTable: "parties",
                principalColumn: "Id");
        }
    }
}
