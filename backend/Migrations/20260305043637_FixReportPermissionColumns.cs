using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    public partial class FixReportPermissionColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewPIPReport')
                    ALTER TABLE user_permissions ADD ViewPIPReport bit NOT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewInwardReport')
                    ALTER TABLE user_permissions ADD ViewInwardReport bit NOT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewItemLedgerReport')
                    ALTER TABLE user_permissions ADD ViewItemLedgerReport bit NOT NULL DEFAULT 0;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewPIPReport')
                    ALTER TABLE user_permissions DROP COLUMN ViewPIPReport;
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewInwardReport')
                    ALTER TABLE user_permissions DROP COLUMN ViewInwardReport;
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('user_permissions') AND name = 'ViewItemLedgerReport')
                    ALTER TABLE user_permissions DROP COLUMN ViewItemLedgerReport;
            ");
        }
    }
}
