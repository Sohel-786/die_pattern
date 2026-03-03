using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Data.Migrations
{
    public partial class AddTransfersAndPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "outward_lines");

            migrationBuilder.DropTable(
                name: "outwards");

            migrationBuilder.AddColumn<bool>(
                name: "ApproveMovement",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ApproveTransfer",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CreateTransfer",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditMovement",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditTransfer",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ViewTransfer",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "transfers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TransferNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    FromPartyId = table.Column<int>(type: "int", nullable: true),
                    ToPartyId = table.Column<int>(type: "int", nullable: true),
                    TransferDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transfers_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transfers_parties_FromPartyId",
                        column: x => x.FromPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transfers_parties_ToPartyId",
                        column: x => x.ToPartyId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transfers_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "transfer_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TransferId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transfer_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_transfer_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_transfer_items_transfers_TransferId",
                        column: x => x.TransferId,
                        principalTable: "transfers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_transfer_items_ItemId",
                table: "transfer_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_transfer_items_TransferId",
                table: "transfer_items",
                column: "TransferId");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_CreatedBy",
                table: "transfers",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_FromPartyId",
                table: "transfers",
                column: "FromPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_LocationId",
                table: "transfers",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_ToPartyId",
                table: "transfers",
                column: "ToPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_transfers_TransferNo",
                table: "transfers",
                column: "TransferNo",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "transfer_items");

            migrationBuilder.DropTable(
                name: "transfers");

            migrationBuilder.DropColumn(
                name: "ApproveMovement",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ApproveTransfer",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "CreateTransfer",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditMovement",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditTransfer",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ViewTransfer",
                table: "user_permissions");

            migrationBuilder.CreateTable(
                name: "outwards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    PartyId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    OutwardDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OutwardNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    OutwardId = table.Column<int>(type: "int", nullable: false),
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
        }
    }
}
