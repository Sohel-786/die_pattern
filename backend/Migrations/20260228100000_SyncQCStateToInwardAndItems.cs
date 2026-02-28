using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Syncs InwardLine QC flags and Item CurrentProcess from resolved QC entries so Inward page and Item Master show correct state.</summary>
    public class SyncQCStateToInwardAndItems : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1) Rejected QC entries (Status=2): set all related inward lines to IsQCPending=0, IsQCApproved=0
            migrationBuilder.Sql(@"
                UPDATE il
                SET il.IsQCPending = 0, il.IsQCApproved = 0
                FROM inward_lines il
                INNER JOIN qc_items qi ON qi.InwardLineId = il.Id
                INNER JOIN qc_entries qe ON qi.QcEntryId = qe.Id
                WHERE qe.[Status] = 2
            ");

            // 2) Approved QC entries (Status=1): set each inward line IsQCPending=0, IsQCApproved = that line's QC item resolution
            migrationBuilder.Sql(@"
                UPDATE il
                SET il.IsQCPending = 0, il.IsQCApproved = CASE WHEN qi.IsApproved = 1 THEN 1 ELSE 0 END
                FROM inward_lines il
                INNER JOIN qc_items qi ON qi.InwardLineId = il.Id
                INNER JOIN qc_entries qe ON qi.QcEntryId = qe.Id
                WHERE qe.[Status] = 1
            ");

            // 3) Items that are in any resolved (Approved or Rejected) QC entry: set In Stock at QC entry's location
            migrationBuilder.Sql(@"
                UPDATE i
                SET i.CurrentProcess = 7, i.CurrentLocationId = qe.LocationId, i.CurrentPartyId = NULL, i.UpdatedAt = GETUTCDATE()
                FROM items i
                INNER JOIN inward_lines il ON il.ItemId = i.Id
                INNER JOIN qc_items qi ON qi.InwardLineId = il.Id
                INNER JOIN qc_entries qe ON qi.QcEntryId = qe.Id
                WHERE qe.[Status] IN (1, 2)
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data correction not reversible
        }
    }
}
