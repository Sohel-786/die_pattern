using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class FinalSchemaFix_v3 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_companies_divisions_DivisionId",
                table: "companies");

            migrationBuilder.DropForeignKey(
                name: "FK_locations_divisions_DivisionId",
                table: "locations");

            migrationBuilder.DropForeignKey(
                name: "FK_users_divisions_DivisionId",
                table: "users");

            migrationBuilder.DropTable(
                name: "operators");

            migrationBuilder.DropTable(
                name: "returns");

            migrationBuilder.DropTable(
                name: "user_divisions");

            migrationBuilder.DropTable(
                name: "issues");

            migrationBuilder.DropTable(
                name: "statuses");

            migrationBuilder.DropTable(
                name: "machines");

            migrationBuilder.DropTable(
                name: "tools");

            migrationBuilder.DropTable(
                name: "contractors");

            migrationBuilder.DropTable(
                name: "tool_categories");

            migrationBuilder.DropTable(
                name: "divisions");

            migrationBuilder.DropIndex(
                name: "IX_users_DivisionId",
                table: "users");

            migrationBuilder.DropIndex(
                name: "IX_Locations_Division_CompanyId_Name_Unique",
                table: "locations");

            migrationBuilder.DropIndex(
                name: "IX_Companies_Division_Name_Unique",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "users");

            migrationBuilder.DropColumn(
                name: "AddInward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "AddMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "AddOutward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditInward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditOutward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ImportExportMaster",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "NavigationLayout",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "locations");

            migrationBuilder.DropColumn(
                name: "DivisionId",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "app_settings");

            migrationBuilder.DropColumn(
                name: "SupportEmail",
                table: "app_settings");

            migrationBuilder.DropColumn(
                name: "SupportPhone",
                table: "app_settings");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "app_settings");

            migrationBuilder.RenameColumn(
                name: "ViewStatusMaster",
                table: "user_permissions",
                newName: "ViewQC");

            migrationBuilder.RenameColumn(
                name: "ViewOutward",
                table: "user_permissions",
                newName: "ViewPO");

            migrationBuilder.RenameColumn(
                name: "ViewMissingItemsReport",
                table: "user_permissions",
                newName: "ViewPI");

            migrationBuilder.RenameColumn(
                name: "ViewMachineMaster",
                table: "user_permissions",
                newName: "ViewMovement");

            migrationBuilder.RenameColumn(
                name: "ViewLocationMaster",
                table: "user_permissions",
                newName: "RevertChanges");

            migrationBuilder.RenameColumn(
                name: "ViewItemMaster",
                table: "user_permissions",
                newName: "PerformQC");

            migrationBuilder.RenameColumn(
                name: "ViewItemHistoryLedgerReport",
                table: "user_permissions",
                newName: "ManageMaster");

            migrationBuilder.RenameColumn(
                name: "ViewItemCategoryMaster",
                table: "user_permissions",
                newName: "ManageChanges");

            migrationBuilder.RenameColumn(
                name: "ViewInward",
                table: "user_permissions",
                newName: "CreatePO");

            migrationBuilder.RenameColumn(
                name: "ViewDivisionMaster",
                table: "user_permissions",
                newName: "CreatePI");

            migrationBuilder.RenameColumn(
                name: "ViewContractorMaster",
                table: "user_permissions",
                newName: "CreateMovement");

            migrationBuilder.RenameColumn(
                name: "ViewCompanyMaster",
                table: "user_permissions",
                newName: "ApprovePO");

            migrationBuilder.RenameColumn(
                name: "ViewActiveIssuesReport",
                table: "user_permissions",
                newName: "ApprovePI");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "locations",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "companies",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.CreateTable(
                name: "materials",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_materials", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "owner_types",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_owner_types", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "parties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_parties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "pattern_statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
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
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
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
                name: "purchase_orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PoNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    VendorId = table.Column<int>(type: "int", nullable: false),
                    Rate = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    DeliveryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    QuotationUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    table.PrimaryKey("PK_purchase_orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_orders_parties_VendorId",
                        column: x => x.VendorId,
                        principalTable: "parties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_orders_users_ApprovedBy",
                        column: x => x.ApprovedBy,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_purchase_orders_users_CreatedBy",
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
                    MainPartName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CurrentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PatternTypeId = table.Column<int>(type: "int", nullable: false),
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
                name: "movements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    PatternDieId = table.Column<int>(type: "int", nullable: false),
                    FromType = table.Column<int>(type: "int", nullable: false),
                    FromLocationId = table.Column<int>(type: "int", nullable: true),
                    FromPartyId = table.Column<int>(type: "int", nullable: true),
                    ToType = table.Column<int>(type: "int", nullable: false),
                    ToLocationId = table.Column<int>(type: "int", nullable: true),
                    ToPartyId = table.Column<int>(type: "int", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseOrderId = table.Column<int>(type: "int", nullable: true),
                    IsQCPending = table.Column<bool>(type: "bit", nullable: false),
                    IsQCApproved = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movements", x => x.Id);
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
                        name: "FK_movements_pattern_dies_PatternDieId",
                        column: x => x.PatternDieId,
                        principalTable: "pattern_dies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
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

            migrationBuilder.CreateTable(
                name: "pattern_change_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatternDieId = table.Column<int>(type: "int", nullable: false),
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
                    PurchaseIndentId = table.Column<int>(type: "int", nullable: false),
                    PatternDieId = table.Column<int>(type: "int", nullable: false)
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

            migrationBuilder.CreateTable(
                name: "quality_controls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MovementId = table.Column<int>(type: "int", nullable: false),
                    IsApproved = table.Column<bool>(type: "bit", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CheckedBy = table.Column<int>(type: "int", nullable: false),
                    CheckedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_quality_controls", x => x.Id);
                    table.ForeignKey(
                        name: "FK_quality_controls_movements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "movements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_quality_controls_users_CheckedBy",
                        column: x => x.CheckedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "purchase_order_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseOrderId = table.Column<int>(type: "int", nullable: false),
                    PurchaseIndentItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_order_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_indent_items_PurchaseIndentItemId",
                        column: x => x.PurchaseIndentItemId,
                        principalTable: "purchase_indent_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

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
                name: "IX_movements_PatternDieId",
                table: "movements",
                column: "PatternDieId");

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

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_PurchaseIndentItemId",
                table: "purchase_order_items",
                column: "PurchaseIndentItemId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_order_items_PurchaseOrderId",
                table: "purchase_order_items",
                column: "PurchaseOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_ApprovedBy",
                table: "purchase_orders",
                column: "ApprovedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_CreatedBy",
                table: "purchase_orders",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_PoNo",
                table: "purchase_orders",
                column: "PoNo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_VendorId",
                table: "purchase_orders",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_quality_controls_CheckedBy",
                table: "quality_controls",
                column: "CheckedBy");

            migrationBuilder.CreateIndex(
                name: "IX_quality_controls_MovementId",
                table: "quality_controls",
                column: "MovementId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pattern_change_logs");

            migrationBuilder.DropTable(
                name: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "quality_controls");

            migrationBuilder.DropTable(
                name: "purchase_indent_items");

            migrationBuilder.DropTable(
                name: "movements");

            migrationBuilder.DropTable(
                name: "purchase_indents");

            migrationBuilder.DropTable(
                name: "pattern_dies");

            migrationBuilder.DropTable(
                name: "purchase_orders");

            migrationBuilder.DropTable(
                name: "materials");

            migrationBuilder.DropTable(
                name: "owner_types");

            migrationBuilder.DropTable(
                name: "pattern_statuses");

            migrationBuilder.DropTable(
                name: "pattern_types");

            migrationBuilder.DropTable(
                name: "parties");

            migrationBuilder.RenameColumn(
                name: "ViewQC",
                table: "user_permissions",
                newName: "ViewStatusMaster");

            migrationBuilder.RenameColumn(
                name: "ViewPO",
                table: "user_permissions",
                newName: "ViewOutward");

            migrationBuilder.RenameColumn(
                name: "ViewPI",
                table: "user_permissions",
                newName: "ViewMissingItemsReport");

            migrationBuilder.RenameColumn(
                name: "ViewMovement",
                table: "user_permissions",
                newName: "ViewMachineMaster");

            migrationBuilder.RenameColumn(
                name: "RevertChanges",
                table: "user_permissions",
                newName: "ViewLocationMaster");

            migrationBuilder.RenameColumn(
                name: "PerformQC",
                table: "user_permissions",
                newName: "ViewItemMaster");

            migrationBuilder.RenameColumn(
                name: "ManageMaster",
                table: "user_permissions",
                newName: "ViewItemHistoryLedgerReport");

            migrationBuilder.RenameColumn(
                name: "ManageChanges",
                table: "user_permissions",
                newName: "ViewItemCategoryMaster");

            migrationBuilder.RenameColumn(
                name: "CreatePO",
                table: "user_permissions",
                newName: "ViewInward");

            migrationBuilder.RenameColumn(
                name: "CreatePI",
                table: "user_permissions",
                newName: "ViewDivisionMaster");

            migrationBuilder.RenameColumn(
                name: "CreateMovement",
                table: "user_permissions",
                newName: "ViewContractorMaster");

            migrationBuilder.RenameColumn(
                name: "ApprovePO",
                table: "user_permissions",
                newName: "ViewCompanyMaster");

            migrationBuilder.RenameColumn(
                name: "ApprovePI",
                table: "user_permissions",
                newName: "ViewActiveIssuesReport");

            migrationBuilder.AddColumn<int>(
                name: "DivisionId",
                table: "users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AddInward",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AddMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AddOutward",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditInward",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditOutward",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ImportExportMaster",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "NavigationLayout",
                table: "user_permissions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "locations",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "DivisionId",
                table: "locations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "companies",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<int>(
                name: "DivisionId",
                table: "companies",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "app_settings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupportEmail",
                table: "app_settings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SupportPhone",
                table: "app_settings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "app_settings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "divisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_divisions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "contractors",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_contractors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_contractors_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "operators",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    Address = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FingerprintTemplate = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProfileImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_operators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_operators_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "statuses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_statuses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_statuses_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tool_categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tool_categories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tool_categories_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "user_divisions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_divisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_divisions_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_divisions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "machines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ContractorId = table.Column<int>(type: "int", nullable: false),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_machines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_machines_contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "contractors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_machines_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tools",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    categoryId = table.Column<int>(type: "int", nullable: true),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Image = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    InHouseLocation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    toolName = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tools_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_tools_tool_categories_categoryId",
                        column: x => x.categoryId,
                        principalTable: "tool_categories",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "issues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    ContractorId = table.Column<int>(type: "int", nullable: false),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    IssuedBy = table.Column<int>(type: "int", nullable: false),
                    toolId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    MachineId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsReturned = table.Column<bool>(type: "bit", nullable: false),
                    IssueImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssueNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IssuedTo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_issues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_issues_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "contractors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_issues_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "machines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_tools_toolId",
                        column: x => x.toolId,
                        principalTable: "tools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_issues_users_IssuedBy",
                        column: x => x.IssuedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "returns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: true),
                    ContractorId = table.Column<int>(type: "int", nullable: true),
                    DivisionId = table.Column<int>(type: "int", nullable: false),
                    IssueId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    LocationId = table.Column<int>(type: "int", nullable: true),
                    MachineId = table.Column<int>(type: "int", nullable: true),
                    ReturnedBy = table.Column<int>(type: "int", nullable: false),
                    StatusId = table.Column<int>(type: "int", nullable: true),
                    Condition = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    ReceivedBy = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReturnCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReturnImage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReturnedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_returns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_returns_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_contractors_ContractorId",
                        column: x => x.ContractorId,
                        principalTable: "contractors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_divisions_DivisionId",
                        column: x => x.DivisionId,
                        principalTable: "divisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_returns_issues_IssueId",
                        column: x => x.IssueId,
                        principalTable: "issues",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_machines_MachineId",
                        column: x => x.MachineId,
                        principalTable: "machines",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_statuses_StatusId",
                        column: x => x.StatusId,
                        principalTable: "statuses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_returns_tools_ItemId",
                        column: x => x.ItemId,
                        principalTable: "tools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_returns_users_ReturnedBy",
                        column: x => x.ReturnedBy,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_users_DivisionId",
                table: "users",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_Division_CompanyId_Name_Unique",
                table: "locations",
                columns: new[] { "DivisionId", "CompanyId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Companies_Division_Name_Unique",
                table: "companies",
                columns: new[] { "DivisionId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Contractors_Division_Name_Unique",
                table: "contractors",
                columns: new[] { "DivisionId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Divisions_Name_Unique",
                table: "divisions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_issues_CompanyId",
                table: "issues",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_ContractorId",
                table: "issues",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_DivisionId",
                table: "issues",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_IssuedBy",
                table: "issues",
                column: "IssuedBy");

            migrationBuilder.CreateIndex(
                name: "IX_issues_LocationId",
                table: "issues",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_MachineId",
                table: "issues",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_issues_toolId",
                table: "issues",
                column: "toolId");

            migrationBuilder.CreateIndex(
                name: "IX_machines_ContractorId",
                table: "machines",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_Machines_Division_ContractorId_Name_Unique",
                table: "machines",
                columns: new[] { "DivisionId", "ContractorId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_operators_DivisionId",
                table: "operators",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_CompanyId",
                table: "returns",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ContractorId",
                table: "returns",
                column: "ContractorId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_DivisionId",
                table: "returns",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_IssueId",
                table: "returns",
                column: "IssueId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ItemId",
                table: "returns",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_LocationId",
                table: "returns",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_MachineId",
                table: "returns",
                column: "MachineId");

            migrationBuilder.CreateIndex(
                name: "IX_returns_ReturnedBy",
                table: "returns",
                column: "ReturnedBy");

            migrationBuilder.CreateIndex(
                name: "IX_returns_StatusId",
                table: "returns",
                column: "StatusId");

            migrationBuilder.CreateIndex(
                name: "IX_Statuses_Division_Name_Unique",
                table: "statuses",
                columns: new[] { "DivisionId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ItemCategories_Division_Name_Unique",
                table: "tool_categories",
                columns: new[] { "DivisionId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Items_Division_CategoryId_ItemName_Unique",
                table: "tools",
                columns: new[] { "DivisionId", "categoryId", "toolName" },
                unique: true,
                filter: "[categoryId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_tools_categoryId",
                table: "tools",
                column: "categoryId");

            migrationBuilder.CreateIndex(
                name: "IX_user_divisions_DivisionId",
                table: "user_divisions",
                column: "DivisionId");

            migrationBuilder.CreateIndex(
                name: "IX_UserDivisions_UserId_DivisionId_Unique",
                table: "user_divisions",
                columns: new[] { "UserId", "DivisionId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_companies_divisions_DivisionId",
                table: "companies",
                column: "DivisionId",
                principalTable: "divisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_locations_divisions_DivisionId",
                table: "locations",
                column: "DivisionId",
                principalTable: "divisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_users_divisions_DivisionId",
                table: "users",
                column: "DivisionId",
                principalTable: "divisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
