using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class AddPOItemRatesAndRemovePORate : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Rate",
                table: "purchase_order_items",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "purchase_order_items",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<decimal>(
                name: "Weight",
                table: "purchase_order_items",
                type: "decimal(18,4)",
                nullable: true);

            // Migrate: copy PO-level rate to items (divide by item count per PO)
            migrationBuilder.Sql(@"
                WITH ItemCounts AS (
                    SELECT PurchaseOrderId, COUNT(*) AS Cnt FROM purchase_order_items GROUP BY PurchaseOrderId
                )
                UPDATE poi SET poi.Rate = CASE WHEN ic.Cnt > 0 THEN ISNULL(po.Rate, 0) / ic.Cnt ELSE 0 END
                FROM purchase_order_items poi
                INNER JOIN purchase_orders po ON poi.PurchaseOrderId = po.Id
                INNER JOIN ItemCounts ic ON ic.PurchaseOrderId = po.Id
                WHERE po.Rate IS NOT NULL
            ");

            // Drop Rate from purchase_orders only if column exists (safe for different DB states)
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_orders') AND name = 'Rate')
                    ALTER TABLE purchase_orders DROP COLUMN Rate;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Rate",
                table: "purchase_orders",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE po SET po.Rate = (SELECT SUM(poi.Rate * poi.Quantity) FROM purchase_order_items poi WHERE poi.PurchaseOrderId = po.Id)
                FROM purchase_orders po
            ");

            migrationBuilder.DropColumn(name: "Rate", table: "purchase_order_items");
            migrationBuilder.DropColumn(name: "Quantity", table: "purchase_order_items");
            migrationBuilder.DropColumn(name: "Weight", table: "purchase_order_items");
        }
    }
}
