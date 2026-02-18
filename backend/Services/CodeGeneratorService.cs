using Microsoft.EntityFrameworkCore;
using net_backend.Data;

namespace net_backend.Services
{
    public interface ICodeGeneratorService
    {
        Task<string> GenerateCode(string type);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        private readonly ApplicationDbContext _context;

        public CodeGeneratorService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateCode(string type)
        {
            int count = 0;
            string prefix = type;

            if (type == "PI")
            {
                count = await _context.PurchaseIndents.CountAsync();
                prefix = "PI";
            }
            else if (type == "PO")
            {
                count = await _context.PurchaseOrders.CountAsync();
                prefix = "PO";
            }
            else if (type == "OUT")
            {
                count = await _context.Movements.CountAsync(m => m.Type == Models.MovementType.Outward);
                prefix = "MOV-OUT";
            }
            else if (type == "INW")
            {
                count = await _context.Movements.CountAsync(m => m.Type == Models.MovementType.Inward);
                prefix = "MOV-INW";
            }

            return $"{prefix}-{DateTime.Now:yyyyMM}-{count + 1:D4}";
        }
    }
}
