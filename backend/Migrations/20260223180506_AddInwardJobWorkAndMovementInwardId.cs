using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddInwardJobWorkAndMovementInwardId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "job_works",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    JobWorkNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_job_works", x => x.Id);
                    table.ForeignKey(
                        name: "FK_job_works_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_job_works_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inwards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InwardNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    InwardDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    SourceRefId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    VendorId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inwards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inwards_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inwards_parties_VendorId",
                        column: x => x.VendorId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_inwards_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "inward_lines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InwardId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    MovementId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_inward_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_inward_lines_inwards_InwardId",
                        column: x => x.InwardId,
                        principalTable: "inwards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_inward_lines_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.AddColumn<int>(
                name: "InwardId",
                table: "movements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_ItemId",
                table: "job_works",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_job_works_JobWorkNo",
                table: "job_works",
                column: "JobWorkNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_CreatedBy",
                table: "job_works",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_inwards_LocationId",
                table: "inwards",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_inwards_InwardNo",
                table: "inwards",
                column: "InwardNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_inwards_VendorId",
                table: "inwards",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_inwards_CreatedBy",
                table: "inwards",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_InwardId",
                table: "inward_lines",
                column: "InwardId");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_ItemId",
                table: "inward_lines",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_MovementId",
                table: "inward_lines",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_InwardId",
                table: "movements",
                column: "InwardId");

            migrationBuilder.AddForeignKey(
                name: "FK_inward_lines_movements_MovementId",
                table: "inward_lines",
                column: "MovementId",
                principalTable: "movements",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_movements_inwards_InwardId",
                table: "movements",
                column: "InwardId",
                principalTable: "inwards",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_movements_inwards_InwardId",
                table: "movements");

            migrationBuilder.DropForeignKey(
                name: "FK_inward_lines_movements_MovementId",
                table: "inward_lines");

            migrationBuilder.DropIndex(
                name: "IX_movements_InwardId",
                table: "movements");

            migrationBuilder.DropColumn(
                name: "InwardId",
                table: "movements");

            migrationBuilder.DropTable(
                name: "inward_lines");

            migrationBuilder.DropTable(
                name: "inwards");

            migrationBuilder.DropTable(
                name: "job_works");
        }
    }
}
