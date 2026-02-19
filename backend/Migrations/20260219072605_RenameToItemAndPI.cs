using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class RenameToItemAndPI : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_movements_pattern_dies_PatternDieId",
                table: "movements");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_order_items_purchase_indent_items_PurchaseIndentItemId",
                table: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "pattern_change_logs");

            migrationBuilder.DropTable(
                name: "purchase_indent_items");

            migrationBuilder.DropTable(
                name: "pattern_dies");

            migrationBuilder.DropTable(
                name: "purchase_indents");

            migrationBuilder.DropTable(
                name: "pattern_statuses");

            migrationBuilder.DropTable(
                name: "pattern_types");

            migrationBuilder.RenameColumn(
                name: "PurchaseIndentItemId",
                table: "purchase_order_items",
                newName: "ProformaInvoiceItemId");

            migrationBuilder.RenameIndex(
                name: "IX_purchase_order_items_PurchaseIndentItemId",
                table: "purchase_order_items",
                newName: "IX_purchase_order_items_ProformaInvoiceItemId");

            migrationBuilder.RenameColumn(
                name: "PatternDieId",
                table: "movements",
                newName: "ItemId");

            migrationBuilder.RenameIndex(
                name: "IX_movements_PatternDieId",
                table: "movements",
                newName: "IX_movements_ItemId");

            migrationBuilder.CreateTable(
                name: "item_statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_statuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "item_types",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_types", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "proforma_invoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PiNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_proforma_invoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_proforma_invoices_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_proforma_invoices_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MainPartName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CurrentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ItemTypeId = table.Column<int>(type: "int", nullable: false),
                    DrawingNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RevisionNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    OwnerTypeId = table.Column<int>(type: "int", nullable: false),
                    StatusId = table.Column<int>(type: "int", nullable: false),
                    CurrentHolderType = table.Column<int>(type: "int", nullable: false),
                    CurrentLocationId = table.Column<int>(type: "int", nullable: true),
                    CurrentPartyId = table.Column<int>(type: "int", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_items_item_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "item_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_items_item_types_ItemTypeId",
                        column: x => x.ItemTypeId,
                        principalTable: "item_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_items_locations_CurrentLocationId",
                        column: x => x.CurrentLocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_items_materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_items_owner_types_OwnerTypeId",
                        column: x => x.OwnerTypeId,
                        principalTable: "owner_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_items_parties_CurrentPartyId",
                        column: x => x.CurrentPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "item_change_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    OldName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NewName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldRevision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NewRevision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ChangeType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_item_change_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_item_change_logs_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_item_change_logs_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "proforma_invoice_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProformaInvoiceId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_proforma_invoice_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_proforma_invoice_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_proforma_invoice_items_proforma_invoices_ProformaInvoiceId",
                        column: x => x.ProformaInvoiceId,
                        principalTable: "proforma_invoices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_item_change_logs_CreatedBy",
                table: "item_change_logs",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_item_change_logs_ItemId",
                table: "item_change_logs",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_items_CurrentLocationId",
                table: "items",
                column: "CurrentLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_items_CurrentPartyId",
                table: "items",
                column: "CurrentPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_items_ItemTypeId",
                table: "items",
                column: "ItemTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_items_MainPartName",
                table: "items",
                column: "MainPartName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_MaterialId",
                table: "items",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_items_OwnerTypeId",
                table: "items",
                column: "OwnerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_items_StatusId",
                table: "items",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "IX_proforma_invoice_items_ItemId",
                table: "proforma_invoice_items",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_proforma_invoice_items_ProformaInvoiceId",
                table: "proforma_invoice_items",
                column: "ProformaInvoiceId");

            migrationBuilder.CreateIndex(
                name: "IX_proforma_invoices_ApprovedBy",
                table: "proforma_invoices",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_proforma_invoices_CreatedBy",
                table: "proforma_invoices",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_proforma_invoices_PiNo",
                table: "proforma_invoices",
                column: "PiNo",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_movements_items_ItemId",
                table: "movements",
                column: "ItemId",
                principalTable: "items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_order_items_proforma_invoice_items_ProformaInvoiceItemId",
                table: "purchase_order_items",
                column: "ProformaInvoiceItemId",
                principalTable: "proforma_invoice_items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_movements_items_ItemId",
                table: "movements");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_order_items_proforma_invoice_items_ProformaInvoiceItemId",
                table: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "item_change_logs");

            migrationBuilder.DropTable(
                name: "proforma_invoice_items");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "proforma_invoices");

            migrationBuilder.DropTable(
                name: "item_statuses");

            migrationBuilder.DropTable(
                name: "item_types");

            migrationBuilder.RenameColumn(
                name: "ProformaInvoiceItemId",
                table: "purchase_order_items",
                newName: "PurchaseIndentItemId");

            migrationBuilder.RenameIndex(
                name: "IX_purchase_order_items_ProformaInvoiceItemId",
                table: "purchase_order_items",
                newName: "IX_purchase_order_items_PurchaseIndentItemId");

            migrationBuilder.RenameColumn(
                name: "ItemId",
                table: "movements",
                newName: "PatternDieId");

            migrationBuilder.RenameIndex(
                name: "IX_movements_ItemId",
                table: "movements",
                newName: "IX_movements_PatternDieId");

            migrationBuilder.CreateTable(
                name: "pattern_statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pattern_statuses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pattern_types",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pattern_types", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "purchase_indents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ApprovedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PiNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_indents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_indents_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_purchase_indents_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pattern_dies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CurrentLocationId = table.Column<int>(type: "int", nullable: true),
                    CurrentPartyId = table.Column<int>(type: "int", nullable: true),
                    MaterialId = table.Column<int>(type: "int", nullable: false),
                    OwnerTypeId = table.Column<int>(type: "int", nullable: false),
                    PatternTypeId = table.Column<int>(type: "int", nullable: false),
                    StatusId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CurrentHolderType = table.Column<int>(type: "int", nullable: false),
                    CurrentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DrawingNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    MainPartName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    RevisionNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pattern_dies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pattern_dies_locations_CurrentLocationId",
                        column: x => x.CurrentLocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_pattern_dies_materials_MaterialId",
                        column: x => x.MaterialId,
                        principalTable: "materials",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pattern_dies_owner_types_OwnerTypeId",
                        column: x => x.OwnerTypeId,
                        principalTable: "owner_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pattern_dies_parties_CurrentPartyId",
                        column: x => x.CurrentPartyId,
                        principalTable: "parties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_pattern_dies_pattern_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "pattern_statuses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_pattern_dies_pattern_types_PatternTypeId",
                        column: x => x.PatternTypeId,
                        principalTable: "pattern_types",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "pattern_change_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    PatternDieId = table.Column<int>(type: "int", nullable: false),
                    ChangeType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    NewName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NewRevision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldRevision = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pattern_change_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pattern_change_logs_pattern_dies_PatternDieId",
                        column: x => x.PatternDieId,
                        principalTable: "pattern_dies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pattern_change_logs_users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "purchase_indent_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatternDieId = table.Column<int>(type: "int", nullable: false),
                    PurchaseIndentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_indent_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_pattern_dies_PatternDieId",
                        column: x => x.PatternDieId,
                        principalTable: "pattern_dies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_purchase_indents_PurchaseIndentId",
                        column: x => x.PurchaseIndentId,
                        principalTable: "purchase_indents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_pattern_change_logs_CreatedBy",
                table: "pattern_change_logs",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_change_logs_PatternDieId",
                table: "pattern_change_logs",
                column: "PatternDieId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_CurrentLocationId",
                table: "pattern_dies",
                column: "CurrentLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_CurrentPartyId",
                table: "pattern_dies",
                column: "CurrentPartyId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_MainPartName",
                table: "pattern_dies",
                column: "MainPartName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_MaterialId",
                table: "pattern_dies",
                column: "MaterialId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_OwnerTypeId",
                table: "pattern_dies",
                column: "OwnerTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_PatternTypeId",
                table: "pattern_dies",
                column: "PatternTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_pattern_dies_StatusId",
                table: "pattern_dies",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_PatternDieId",
                table: "purchase_indent_items",
                column: "PatternDieId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId",
                table: "purchase_indent_items",
                column: "PurchaseIndentId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_ApprovedBy",
                table: "purchase_indents",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_CreatedBy",
                table: "purchase_indents",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_PiNo",
                table: "purchase_indents",
                column: "PiNo",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_movements_pattern_dies_PatternDieId",
                table: "movements",
                column: "PatternDieId",
                principalTable: "pattern_dies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_order_items_purchase_indent_items_PurchaseIndentItemId",
                table: "purchase_order_items",
                column: "PurchaseIndentItemId",
                principalTable: "purchase_indent_items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
