using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace net_backend.Migrations
{
    /// <summary>Location-scoped app: UserLocationAccess, User default company/location, LocationId on Party, Item, PI, PO, JobWork.</summary>
    public partial class LocationScopedApp : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_location_access",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    LocationId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_location_access", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_location_access_companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_location_access_locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_user_location_access_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_location_access_UserId_CompanyId_LocationId",
                table: "user_location_access",
                columns: new[] { "UserId", "CompanyId", "LocationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_location_access_CompanyId",
                table: "user_location_access",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_user_location_access_LocationId",
                table: "user_location_access",
                column: "LocationId");

            migrationBuilder.AddColumn<int>(
                name: "DefaultCompanyId",
                table: "users",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultLocationId",
                table: "users",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_DefaultCompanyId",
                table: "users",
                column: "DefaultCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_users_DefaultLocationId",
                table: "users",
                column: "DefaultLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_users_companies_DefaultCompanyId",
                table: "users",
                column: "DefaultCompanyId",
                principalTable: "companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_users_locations_DefaultLocationId",
                table: "users",
                column: "DefaultLocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "parties",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_parties_LocationId",
                table: "parties",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_parties_locations_LocationId",
                table: "parties",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "items",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_items_LocationId",
                table: "items",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_items_locations_LocationId",
                table: "items",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Idempotent: purchase_indents may already have LocationId from an earlier migration
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_indents') AND name = 'LocationId')
                BEGIN
                    ALTER TABLE [purchase_indents] ADD [LocationId] int NULL;
                END
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('purchase_indents') AND name = 'IX_purchase_indents_LocationId')
                BEGIN
                    CREATE INDEX [IX_purchase_indents_LocationId] ON [purchase_indents] ([LocationId]);
                END
            ");
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('purchase_indents') AND name = 'FK_purchase_indents_locations_LocationId')
                BEGIN
                    ALTER TABLE [purchase_indents] ADD CONSTRAINT [FK_purchase_indents_locations_LocationId]
                        FOREIGN KEY ([LocationId]) REFERENCES [locations] ([Id]) ON DELETE NO ACTION;
                END
            ");

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "purchase_orders",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_purchase_orders_LocationId",
                table: "purchase_orders",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_locations_LocationId",
                table: "purchase_orders",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "job_works",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_job_works_LocationId",
                table: "job_works",
                column: "LocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_job_works_locations_LocationId",
                table: "job_works",
                column: "LocationId",
                principalTable: "locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_job_works_locations_LocationId", table: "job_works");
            migrationBuilder.DropIndex(name: "IX_job_works_LocationId", table: "job_works");
            migrationBuilder.DropColumn(name: "LocationId", table: "job_works");

            migrationBuilder.DropForeignKey(name: "FK_purchase_orders_locations_LocationId", table: "purchase_orders");
            migrationBuilder.DropIndex(name: "IX_purchase_orders_LocationId", table: "purchase_orders");
            migrationBuilder.DropColumn(name: "LocationId", table: "purchase_orders");

            migrationBuilder.DropForeignKey(name: "FK_purchase_indents_locations_LocationId", table: "purchase_indents");
            migrationBuilder.DropIndex(name: "IX_purchase_indents_LocationId", table: "purchase_indents");
            migrationBuilder.DropColumn(name: "LocationId", table: "purchase_indents");

            migrationBuilder.DropForeignKey(name: "FK_items_locations_LocationId", table: "items");
            migrationBuilder.DropIndex(name: "IX_items_LocationId", table: "items");
            migrationBuilder.DropColumn(name: "LocationId", table: "items");

            migrationBuilder.DropForeignKey(name: "FK_parties_locations_LocationId", table: "parties");
            migrationBuilder.DropIndex(name: "IX_parties_LocationId", table: "parties");
            migrationBuilder.DropColumn(name: "LocationId", table: "parties");

            migrationBuilder.DropForeignKey(name: "FK_users_companies_DefaultCompanyId", table: "users");
            migrationBuilder.DropForeignKey(name: "FK_users_locations_DefaultLocationId", table: "users");
            migrationBuilder.DropIndex(name: "IX_users_DefaultCompanyId", table: "users");
            migrationBuilder.DropIndex(name: "IX_users_DefaultLocationId", table: "users");
            migrationBuilder.DropColumn(name: "DefaultCompanyId", table: "users");
            migrationBuilder.DropColumn(name: "DefaultLocationId", table: "users");

            migrationBuilder.DropTable(name: "user_location_access");
        }
    }
}
