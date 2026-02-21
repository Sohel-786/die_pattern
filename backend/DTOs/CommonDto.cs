namespace net_backend.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public string? Message { get; set; }
    }

    public class CompanyDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateCompanyRequest
    {
        public string Name { get; set; } = string.Empty;
        public bool? IsActive { get; set; }
    }

    public class LocationDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateLocationRequest
    {
        public string Name { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateCompanyRequest
    {
        public string? Name { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateLocationRequest
    {
        public string? Name { get; set; }
        public int? CompanyId { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdatePartyRequest
    {
        public string? Name { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateMasterRequest
    {
        public string? Name { get; set; }
        public bool IsActive { get; set; }
    }
}
