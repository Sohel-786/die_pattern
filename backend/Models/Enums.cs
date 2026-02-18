namespace net_backend.Models
{
    public enum Role
    {
        ADMIN,
        MANAGER,
        USER
    }

    public enum PiType
    {
        New,
        Repair,
        Correction,
        Modification
    }

    public enum PiStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum PoStatus
    {
        Pending,
        Approved,
        Rejected
    }

    public enum MovementType
    {
        Outward,
        Inward,
        SystemReturn
    }

    public enum HolderType
    {
        Location,
        Vendor
    }
}
