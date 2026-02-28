using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RefineItemTrackingAndOutward : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_inward_lines_movements_MovementId",
                table: "inward_lines");

            migrationBuilder.DropForeignKey(
                name: "FK_quality_controls_movements_MovementId",
                table: "quality_controls");

            migrationBuilder.DropTable(
                name: "movements");

            migrationBuilder.DropIndex(
                name: "IX_inward_lines_MovementId",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "MovementId",
                table: "inward_lines");

            migrationBuilder.RenameColumn(
                name: "MovementId",
                table: "quality_controls",
                newName: "InwardLineId");

            migrationBuilder.RenameIndex(
                name: "IX_quality_controls_MovementId",
                table: "quality_controls",
                newName: "IX_quality_controls_InwardLineId");

            migrationBuilder.RenameColumn(
                name: "CurrentHolderType",
                table: "items",
                newName: "CurrentProcess");

            migrationBuilder.AddColumn<bool>(
                name: "IsQCApproved",
                table: "inward_lines",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsQCPending",
                table: "inward_lines",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "outwards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OutwardNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    OutwardDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    PartyId = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outwards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_outwards_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_outwards_parties_PartyId",
                        column: x => x.PartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_outwards_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "outward_lines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OutwardId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_outward_lines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_outward_lines_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_outward_lines_outwards_OutwardId",
                        column: x => x.OutwardId,
                        principalTable: "outwards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_outward_lines_ItemId",
                table: "outward_lines",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_outward_lines_OutwardId",
                table: "outward_lines",
                column: "OutwardId");

            migrationBuilder.CreateIndex(
                name: "IX_outwards_CreatedBy",
                table: "outwards",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_outwards_LocationId",
                table: "outwards",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_outwards_OutwardNo",
                table: "outwards",
                column: "OutwardNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_outwards_PartyId",
                table: "outwards",
                column: "PartyId");

            migrationBuilder.AddForeignKey(
                name: "FK_quality_controls_inward_lines_InwardLineId",
                table: "quality_controls",
                column: "InwardLineId",
                principalTable: "inward_lines",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_quality_controls_inward_lines_InwardLineId",
                table: "quality_controls");

            migrationBuilder.DropTable(
                name: "outward_lines");

            migrationBuilder.DropTable(
                name: "outwards");

            migrationBuilder.DropColumn(
                name: "IsQCApproved",
                table: "inward_lines");

            migrationBuilder.DropColumn(
                name: "IsQCPending",
                table: "inward_lines");

            migrationBuilder.RenameColumn(
                name: "InwardLineId",
                table: "quality_controls",
                newName: "MovementId");

            migrationBuilder.RenameIndex(
                name: "IX_quality_controls_InwardLineId",
                table: "quality_controls",
                newName: "IX_quality_controls_MovementId");

            migrationBuilder.RenameColumn(
                name: "CurrentProcess",
                table: "items",
                newName: "CurrentHolderType");

            migrationBuilder.AddColumn<int>(
                name: "MovementId",
                table: "inward_lines",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "movements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    FromLocationId = table.Column<int>(type: "int", nullable: true),
                    FromPartyId = table.Column<int>(type: "int", nullable: true),
                    InwardId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    PurchaseOrderId = table.Column<int>(type: "int", nullable: true),
                    ToLocationId = table.Column<int>(type: "int", nullable: true),
                    ToPartyId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FromType = table.Column<int>(type: "int", nullable: false),
                    IsQCApproved = table.Column<bool>(type: "bit", nullable: false),
                    IsQCPending = table.Column<bool>(type: "bit", nullable: false),
                    MovementNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ToType = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_movements_inwards_InwardId",
                        column: x => x.InwardId,
                        principalTable: "inwards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_movements_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_movements_locations_FromLocationId",
                        column: x => x.FromLocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_movements_locations_ToLocationId",
                        column: x => x.ToLocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_movements_parties_FromPartyId",
                        column: x => x.FromPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_movements_parties_ToPartyId",
                        column: x => x.ToPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_movements_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_movements_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_inward_lines_MovementId",
                table: "inward_lines",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_CreatedBy",
                table: "movements",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_movements_FromLocationId",
                table: "movements",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_FromPartyId",
                table: "movements",
                column: "FromPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_InwardId",
                table: "movements",
                column: "InwardId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_ItemId",
                table: "movements",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_PurchaseOrderId",
                table: "movements",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_ToLocationId",
                table: "movements",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_movements_ToPartyId",
                table: "movements",
                column: "ToPartyId");

            migrationBuilder.AddForeignKey(
                name: "FK_inward_lines_movements_MovementId",
                table: "inward_lines",
                column: "MovementId",
                principalTable: "movements",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_quality_controls_movements_MovementId",
                table: "quality_controls",
                column: "MovementId",
                principalTable: "movements",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
