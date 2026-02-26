using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Assign any rows with LocationId = 0 to location 1 (PI, PO, Party, Item, etc.).</summary>
    [Migration("20260226200000_AssignZeroLocationToLocationOne")]
    public partial class AssignZeroLocationToLocationOne : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE [parties] SET [LocationId] = 1 WHERE [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [items] SET [LocationId] = 1 WHERE [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [purchase_orders] SET [LocationId] = 1 WHERE [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [job_works] SET [LocationId] = 1 WHERE [LocationId] = 0");
            migrationBuilder.Sql("UPDATE [inwards] SET [LocationId] = 1 WHERE [LocationId] = 0");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reversible data migration
        }
    }
}
