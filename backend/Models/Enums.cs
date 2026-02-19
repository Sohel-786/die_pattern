namespace net_backend.Models
{
    public enum Role
    {
        ADMIN,
        MANAGER,
        USER
    }

    public enum PurchaseIndentType
    {
        New,
        Repair,
        Correction,
        Modification
    }

    public enum PurchaseIndentStatus
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
