using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddItemDisplayNameVersioning : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "WillChangeName",
                table: "job_work_items",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProposedNewName",
                table: "job_work_items",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OriginalNameSnapshot",
                table: "job_work_items",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ItemNameSnapshot",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NewItemNameFromJobWork",
                table: "inward_lines",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ItemNameSnapshot",
                table: "transfer_items",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "item_change_logs",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "JobWorkId",
                table: "item_change_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "JobWorkItemId",
                table: "item_change_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InwardId",
                table: "item_change_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InwardLineId",
                table: "item_change_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "QcEntryId",
                table: "item_change_logs",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RevertedFromLogId",
                table: "item_change_logs",
                type: "int",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "WillChangeName", table: "job_work_items");
            migrationBuilder.DropColumn(name: "ProposedNewName", table: "job_work_items");
            migrationBuilder.DropColumn(name: "OriginalNameSnapshot", table: "job_work_items");
            migrationBuilder.DropColumn(name: "ItemNameSnapshot", table: "inward_lines");
            migrationBuilder.DropColumn(name: "NewItemNameFromJobWork", table: "inward_lines");
            migrationBuilder.DropColumn(name: "ItemNameSnapshot", table: "transfer_items");
            migrationBuilder.DropColumn(name: "Source", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "JobWorkId", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "JobWorkItemId", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "InwardId", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "InwardLineId", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "QcEntryId", table: "item_change_logs");
            migrationBuilder.DropColumn(name: "RevertedFromLogId", table: "item_change_logs");
        }
    }
}
