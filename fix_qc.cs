using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.Models;

var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
optionsBuilder.UseSqlServer("Server=(localdb)\\mssqllocaldb;Database=die_pattern_db;Trusted_Connection=True;MultipleActiveResultSets=true");

using var context = new ApplicationDbContext(optionsBuilder.Options);

var movements = await context.Movements
    .Where(m => m.Type == MovementType.Inward && !m.IsQCPending && !m.IsQCApproved)
    .ToListAsync();

foreach (var m in movements)
{
    m.IsQCPending = true;
}

await context.SaveChangesAsync();
Console.WriteLine($"Updated {movements.Count} movements to Pending QC.");
