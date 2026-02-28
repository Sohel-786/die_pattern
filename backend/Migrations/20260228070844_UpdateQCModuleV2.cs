using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class UpdateQCModuleV2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "quality_controls");

            migrationBuilder.CreateTable(
                name: "qc_entries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QcNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    PartyId = table.Column<int>(type: "int", nullable: false),
                    SourceType = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qc_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_qc_entries_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qc_entries_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qc_entries_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qc_entries_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "qc_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QcEntryId = table.Column<int>(type: "int", nullable: false),
                    InwardLineId = table.Column<int>(type: "int", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qc_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_qc_items_inward_lines_InwardLineId",
                        column: x => x.InwardLineId,
                        principalTable: "inward_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_qc_items_qc_entries_QcEntryId",
                        column: x => x.QcEntryId,
                        principalTable: "qc_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_ApprovedBy",
                table: "qc_entries",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_CreatedBy",
                table: "qc_entries",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_LocationId",
                table: "qc_entries",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_PartyId",
                table: "qc_entries",
                column: "PartyId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_entries_QcNo",
                table: "qc_entries",
                column: "QcNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qc_items_InwardLineId",
                table: "qc_items",
                column: "InwardLineId");

            migrationBuilder.CreateIndex(
                name: "IX_qc_items_QcEntryId",
                table: "qc_items",
                column: "QcEntryId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "qc_items");

            migrationBuilder.DropTable(
                name: "qc_entries");

            migrationBuilder.CreateTable(
                name: "quality_controls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CheckedBy = table.Column<int>(type: "int", nullable: false),
                    InwardLineId = table.Column<int>(type: "int", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quality_controls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_quality_controls_inward_lines_InwardLineId",
                        column: x => x.InwardLineId,
                        principalTable: "inward_lines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quality_controls_users_CheckedBy",
                        column: x => x.CheckedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_quality_controls_CheckedBy",
                table: "quality_controls",
                column: "CheckedBy");

            migrationBuilder.CreateIndex(
                name: "IX_quality_controls_InwardLineId",
                table: "quality_controls",
                column: "InwardLineId");
        }
    }
}
