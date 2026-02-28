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
            int count = 0;
            string prefix = type;

            if (type == "PI")
            {
                // PurchaseIndent has no LocationId; count all
                count = await _context.PurchaseIndents.CountAsync();
                return $"PI-{count + 1:D2}";
            }
            if (type == "PO")
            {
                count = locationId.HasValue
                    ? await _context.PurchaseOrders.CountAsync(p => p.LocationId == locationId)
                    : await _context.PurchaseOrders.CountAsync();
                prefix = "PO";
            }
            else if (type == "OUT")
            {
                count = locationId.HasValue
                    ? await _context.Outwards.CountAsync(o => o.LocationId == locationId)
                    : await _context.Outwards.CountAsync();
                return $"OUT-{count + 1:D4}";
            }
            else if (type == "INWARD")
            {
                count = locationId.HasValue
                    ? await _context.Inwards.CountAsync(i => i.LocationId == locationId)
                    : await _context.Inwards.CountAsync();
                return $"INW-{count + 1:D4}";
            }
            else if (type == "JW")
            {
                count = locationId.HasValue
                    ? await _context.JobWorks.CountAsync(j => j.LocationId == locationId)
                    : await _context.JobWorks.CountAsync();
                return $"JW-{count + 1:D4}";
            }

            return $"{prefix}-{DateTime.Now:yyyyMM}-{count + 1:D4}";
        }
    }
}
