using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class PI_Company_Location_UniqueItem : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId",
                table: "purchase_indent_items");

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "purchase_indents",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "companies",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GstDate",
                table: "companies",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNo",
                table: "companies",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "companies",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indents_LocationId",
                table: "purchase_indents",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId_ItemId",
                table: "purchase_indent_items",
                columns: new[] { "PurchaseIndentId", "ItemId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_indents_locations_LocationId",
                table: "purchase_indents",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_purchase_indents_locations_LocationId",
                table: "purchase_indents");

            migrationBuilder.DropIndex(
                name: "IX_purchase_indents_LocationId",
                table: "purchase_indents");

            migrationBuilder.DropIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId_ItemId",
                table: "purchase_indent_items");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "purchase_indents");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "GstDate",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "GstNo",
                table: "companies");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "companies");

            migrationBuilder.CreateIndex(
                name: "IX_purchase_indent_items_PurchaseIndentId",
                table: "purchase_indent_items",
                column: "PurchaseIndentId");
        }
    }
}
