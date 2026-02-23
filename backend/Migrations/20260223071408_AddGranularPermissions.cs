using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddGranularPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlternateNumber",
                table: "parties");

            migrationBuilder.RenameColumn(
                name: "PerformQC",
                table: "user_permissions",
                newName: "ViewInward");

            migrationBuilder.RenameColumn(
                name: "ManageMaster",
                table: "user_permissions",
                newName: "ManageParty");

            migrationBuilder.AddColumn<bool>(
                name: "ApproveQC",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CreateInward",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CreateQC",
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
                name: "EditPI",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditPO",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EditQC",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageCompany",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageItem",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageItemStatus",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageItemType",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageLocation",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageMaterial",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ManageOwnerType",
                table: "user_permissions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApproveQC",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "CreateInward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "CreateQC",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditInward",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditPI",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditPO",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "EditQC",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageCompany",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageItem",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageItemStatus",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageItemType",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageLocation",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageMaterial",
                table: "user_permissions");

            migrationBuilder.DropColumn(
                name: "ManageOwnerType",
                table: "user_permissions");

            migrationBuilder.RenameColumn(
                name: "ViewInward",
                table: "user_permissions",
                newName: "PerformQC");

            migrationBuilder.RenameColumn(
                name: "ManageParty",
                table: "user_permissions",
                newName: "ManageMaster");

            migrationBuilder.AddColumn<string>(
                name: "AlternateNumber",
                table: "parties",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
