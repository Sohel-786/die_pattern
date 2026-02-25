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
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    public enum PoStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }

    /// <summary>Indian GST types for PO calculation.</summary>
    public enum GstType
    {
        CGST_SGST,
        IGST,
        UGST
    }

    public enum MovementType
    {
        Outward,
        Inward,
        SystemReturn
    }

    /// <summary>Source of an Inward document: PO, return from vendor (Outward), or Job Work.</summary>
    public enum InwardSourceType
    {
        PO,
        OutwardReturn,
        JobWork
    }

    public enum InwardStatus
    {
        Draft = 0,
        Submitted = 1
    }

    public enum JobWorkStatus
    {
        Pending = 0,
        InTransit = 1,
        Completed = 2
    }

    public enum HolderType
    {
        Location,
        Vendor
    }

    /// <summary>Single global process state for an item: one item can only be in one of these at a time.</summary>
    public enum ItemProcessState
    {
        NotInStock = 0,
        InPI = 1,
        InPO = 2,
        InQC = 3,
        InJobwork = 4,
        Outward = 5,
        InStock = 6
    }
}
