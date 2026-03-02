using net_backend.Models;

namespace net_backend.DTOs
{
    public class MovementDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty; // Outward, Inward, InitialRegistration
        public int ItemId { get; set; }
        public string? ItemName { get; set; }
        public string? MainPartName { get; set; }
        public string? TransactionNo { get; set; }
        
        public string FromName { get; set; } = "—";
        public string ToName { get; set; } = "—";
        
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Status fields for frontend UI
        public bool IsQCPending { get; set; }
        public bool IsQCApproved { get; set; }
    }
}
