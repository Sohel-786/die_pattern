namespace backend.DTOs
{
    public class LoginDto
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public UserPermissionDto? Permission { get; set; }
    }

    public class UserPermissionDto
    {
        public bool ViewDashboard { get; set; }
        public bool ViewMaster { get; set; }
        public bool ViewPI { get; set; }
        public bool ViewPO { get; set; }
        public bool ViewMovement { get; set; }
        public bool ViewReports { get; set; }
        public bool ManageUsers { get; set; }
        public bool AccessSettings { get; set; }
    }
}
