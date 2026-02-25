using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Convert any PI/PO in Draft (3) to Pending (0) before removing Draft concept.</summary>
    [Migration("20260225120000_RemoveDraftFromPIAndPO")]
    public partial class RemoveDraftFromPIAndPO : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // PurchaseIndentStatus: Draft = 3, Pending = 0
            migrationBuilder.Sql(@"
                UPDATE purchase_indents SET Status = 0 WHERE Status = 3;
            ");
            // PoStatus: Draft = 3, Pending = 0
            migrationBuilder.Sql(@"
                UPDATE purchase_orders SET Status = 0 WHERE Status = 3;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No reversible mapping: we don't know which Pending rows were originally Draft
        }
    }
}
