using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddPartyFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlternateNumber",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPerson",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CustomerType",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GstDate",
                table: "parties",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GstNo",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PartyCategory",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PartyCode",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlternateNumber",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "ContactPerson",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "CustomerType",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "GstDate",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "GstNo",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "PartyCategory",
                table: "parties");

            migrationBuilder.DropColumn(
                name: "PartyCode",
                table: "parties");
        }
    }
}
