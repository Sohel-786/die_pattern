using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Services;
using System.Security.Claims;

namespace backend.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class QCInspectionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ICodeGeneratorService _codeGen;

        public QCInspectionsController(ApplicationDbContext context, ICodeGeneratorService codeGen)
        {
            _context = context;
            _codeGen = codeGen;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<QCInspection>>> GetInspections()
        {
            return await _context.QCInspections
                .Include(q => q.InwardItem)
                    .ThenInclude(ii => ii!.InwardEntry)
                .Include(q => q.InwardItem)
                    .ThenInclude(ii => ii!.POItem)
                        .ThenInclude(poi => poi!.PIItem)
                            .ThenInclude(pii => pii!.PatternDie)
                .Include(q => q.Inspector)
                .OrderByDescending(q => q.InspectedAt)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<QCInspection>> PostInspection(QCInspection qc)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            
            qc.QCNo = await _codeGen.GenerateCodeAsync("QC", "qc_inspections", "QCNo");
            qc.InspectedBy = userId;
            qc.InspectedAt = DateTime.Now;

            var inwardItem = await _context.InwardItems
                .Include(ii => ii.POItem)
                    .ThenInclude(poi => poi!.PIItem)
                .FirstOrDefaultAsync(ii => ii.Id == qc.InwardItemId);

            if (inwardItem != null)
            {
                inwardItem.IsQCProcessed = true;
                
                if (qc.Status == QCStatus.APPROVED)
                {
                    inwardItem.POItem!.IsQCApproved = true;
                    
                    // Update PatternDie location and status
                    var die = await _context.PatternDies.FindAsync(inwardItem.POItem.PIItem!.PatternDieId);
                    if (die != null)
                    {
                        die.CurrentLocationId = qc.TargetLocationId;
                        die.CurrentVendorId = null; // Back in house
                        die.UpdatedAt = DateTime.Now;
                    }
                }
            }

            _context.QCInspections.Add(qc);
            await _context.SaveChangesAsync();

            return Ok(qc);
        }
    }
}
