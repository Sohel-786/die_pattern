using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddPurchaseIndentPrintAndDocumentControl : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "document_controls",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DocumentType = table.Column<int>(type: "int", nullable: false),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RevisionNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RevisionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsApplied = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_document_controls", x => x.Id);
                });

            migrationBuilder.AddColumn<DateTime>(
                name: "ReqDateOfDelivery",
                table: "purchase_indents",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "MtcReq",
                table: "purchase_indents",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "DocumentNo",
                table: "purchase_indents",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RevisionNo",
                table: "purchase_indents",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RevisionDate",
                table: "purchase_indents",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "document_controls");

            migrationBuilder.DropColumn(name: "ReqDateOfDelivery", table: "purchase_indents");
            migrationBuilder.DropColumn(name: "MtcReq", table: "purchase_indents");
            migrationBuilder.DropColumn(name: "DocumentNo", table: "purchase_indents");
            migrationBuilder.DropColumn(name: "RevisionNo", table: "purchase_indents");
            migrationBuilder.DropColumn(name: "RevisionDate", table: "purchase_indents");
        }
    }
}
