using Microsoft.EntityFrameworkCore;

namespace backend.Services
{
    public interface ICodeGeneratorService
    {
        Task<string> GenerateCodeAsync(string prefix, string tableName, string columnName);
    }

    public class CodeGeneratorService : ICodeGeneratorService
    {
        private readonly Data.ApplicationDbContext _context;

        public CodeGeneratorService(Data.ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string> GenerateCodeAsync(string prefix, string tableName, string columnName)
        {
            // Simple logic: count entries + 1
            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();
                
            using var command = connection.CreateCommand();
            command.CommandText = $"SELECT COUNT(*) FROM {tableName}";
            var count = (int)(await command.ExecuteScalarAsync() ?? 0);
            
            var year = DateTime.Now.ToString("yy");
            return $"{prefix}-{year}-{(count + 1):D4}";
        }
    }
}
