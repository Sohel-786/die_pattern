using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class InitialCreate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_settings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyLogo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SoftwareName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PrimaryColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_settings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_companies", x => x.Id);
                });

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
                name: "users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Username = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Avatar = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MobileNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "locations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_locations_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: true),
                    OldValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValues = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_audit_logs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
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
                name: "user_permissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ViewDashboard = table.Column<bool>(type: "bit", nullable: false),
                    ViewMaster = table.Column<bool>(type: "bit", nullable: false),
                    ManageMaster = table.Column<bool>(type: "bit", nullable: false),
                    ViewPI = table.Column<bool>(type: "bit", nullable: false),
                    CreatePI = table.Column<bool>(type: "bit", nullable: false),
                    ApprovePI = table.Column<bool>(type: "bit", nullable: false),
                    ViewPO = table.Column<bool>(type: "bit", nullable: false),
                    CreatePO = table.Column<bool>(type: "bit", nullable: false),
                    ApprovePO = table.Column<bool>(type: "bit", nullable: false),
                    ViewMovement = table.Column<bool>(type: "bit", nullable: false),
                    CreateMovement = table.Column<bool>(type: "bit", nullable: false),
                    ViewQC = table.Column<bool>(type: "bit", nullable: false),
                    PerformQC = table.Column<bool>(type: "bit", nullable: false),
                    ManageChanges = table.Column<bool>(type: "bit", nullable: false),
                    RevertChanges = table.Column<bool>(type: "bit", nullable: false),
                    ViewReports = table.Column<bool>(type: "bit", nullable: false),
                    ManageUsers = table.Column<bool>(type: "bit", nullable: false),
                    AccessSettings = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_permissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_permissions_users_UserId",
                        column: x => x.UserId,
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
                name: "movements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "purchase_indent_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PurchaseIndentId = table.Column<int>(type: "int", nullable: false),
                    ItemId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_purchase_indent_items", x => x.Id);
                    table.ForeignKey(
                        name: "FK_purchase_indent_items_items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "items",
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
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_purchase_order_items_purchase_orders_PurchaseOrderId",
                        column: x => x.PurchaseOrderId,
                        principalTable: "purchase_orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs",
                column: "UserId");

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
                name: "IX_locations_CompanyId",
                table: "locations",
                column: "CompanyId");

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

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_ItemId",
                table: "purchase_indent_items",
                column: "ItemId");

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

            migrationBuilder.CreateIndex(
                name: "IX_user_permissions_UserId",
                table: "user_permissions",
                column: "UserId",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "app_settings");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "item_change_logs");

            migrationBuilder.DropTable(
                name: "purchase_order_items");

            migrationBuilder.DropTable(
                name: "quality_controls");

            migrationBuilder.DropTable(
                name: "user_permissions");

            migrationBuilder.DropTable(
                name: "purchase_indent_items");

            migrationBuilder.DropTable(
                name: "movements");

            migrationBuilder.DropTable(
                name: "purchase_indents");

            migrationBuilder.DropTable(
                name: "items");

            migrationBuilder.DropTable(
                name: "purchase_orders");

            migrationBuilder.DropTable(
                name: "item_statuses");

            migrationBuilder.DropTable(
                name: "item_types");

            migrationBuilder.DropTable(
                name: "locations");

            migrationBuilder.DropTable(
                name: "materials");

            migrationBuilder.DropTable(
                name: "owner_types");

            migrationBuilder.DropTable(
                name: "parties");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "companies");
        }
    }
}
