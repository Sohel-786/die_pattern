using Microsoft.EntityFrameworkCore;
using net_backend.Data;

namespace net_backend.Services
{
    public interface ICodeGeneratorService
    {
        Task<string> GenerateCode(string type, int? locationId = null);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        private readonly ApplicationDbContext _context;

        public CodeGeneratorService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateCode(string type, int? locationId = null)
        {
            if (type == "PI")
            {
                var lastCode = await _context.PurchaseIndents
                    .Where(p => p.PiNo.StartsWith("PI-"))
                    .OrderByDescending(p => p.Id)
                    .Select(p => p.PiNo)
                    .FirstOrDefaultAsync();
                
                int maxNo = 0;
                if (!string.IsNullOrEmpty(lastCode) && lastCode.Length > 3)
                    int.TryParse(lastCode.Substring(3), out maxNo);
                    
                return $"PI-{maxNo + 1:D2}";
            }
            if (type == "PO")
            {
                var query = _context.PurchaseOrders.Where(p => p.PoNo.StartsWith("PO-"));
                if (locationId.HasValue) query = query.Where(p => p.LocationId == locationId);
                
                var lastCode = await query.OrderByDescending(p => p.Id).Select(p => p.PoNo).FirstOrDefaultAsync();
                
                int maxNo = 0;
                if (!string.IsNullOrEmpty(lastCode) && lastCode.Length > 3)
                    int.TryParse(lastCode.Substring(3), out maxNo);
                    
                return $"PO-{maxNo + 1:D4}";
            }

            else if (type == "INWARD")
            {
                var query = _context.Inwards.Where(i => i.InwardNo.StartsWith("INW-"));
                if (locationId.HasValue) query = query.Where(i => i.LocationId == locationId);
                
                var lastCode = await query.OrderByDescending(i => i.Id).Select(i => i.InwardNo).FirstOrDefaultAsync();
                
                int maxNo = 0;
                if (!string.IsNullOrEmpty(lastCode) && lastCode.Length > 4)
                    int.TryParse(lastCode.Substring(4), out maxNo);
                    
                return $"INW-{maxNo + 1:D4}";
            }
            else if (type == "JW")
            {
                var query = _context.JobWorks.Where(j => j.JobWorkNo.StartsWith("JW-"));
                if (locationId.HasValue) query = query.Where(j => j.LocationId == locationId);
                
                var lastCode = await query.OrderByDescending(j => j.Id).Select(j => j.JobWorkNo).FirstOrDefaultAsync();
                
                int maxNo = 0;
                if (!string.IsNullOrEmpty(lastCode) && lastCode.Length > 3)
                    int.TryParse(lastCode.Substring(3), out maxNo);
                    
                return $"JW-{maxNo + 1:D4}";
            }
            else if (type == "QC")
            {
                var query = _context.QcEntries.Where(q => q.QcNo.StartsWith("QC-"));
                if (locationId.HasValue) query = query.Where(q => q.LocationId == locationId);
                
                var lastCode = await query.OrderByDescending(q => q.Id).Select(q => q.QcNo).FirstOrDefaultAsync();
                
                int maxNo = 0;
                if (!string.IsNullOrEmpty(lastCode) && lastCode.Length > 3)
                    int.TryParse(lastCode.Substring(3), out maxNo);
                    
                return $"QC-{maxNo + 1:D4}";
            }

            // Fallback for unknown type
            return $"{type}-{DateTime.Now:yyyyMM}-{Guid.NewGuid().ToString().Substring(0, 4)}";
        }
    }
}
