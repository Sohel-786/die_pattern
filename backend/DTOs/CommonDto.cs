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
        public string? Address { get; set; }
        public string? Pan { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateCompanyRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string GstNo { get; set; } = string.Empty;
        public string? Pan { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
        public DateTime? GstDate { get; set; }
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
        public string? Address { get; set; }
        public string? Pan { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
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
        public string? PartyCategory { get; set; }
        public string? CustomerType { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateMasterRequest
    {
        public string? Name { get; set; }
        public bool IsActive { get; set; }
    }
}
