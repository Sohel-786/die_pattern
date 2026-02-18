namespace backend.Models
{
    public enum Role
    {
        ADMIN,
        MANAGER,
        USER
    }

    public enum DiePatternType
    {
        DIE,
        PATTERN
    }

    public enum ItemStatus
    {
        AVAILABLE,
        ISSUED,
        MAINTENANCE,
        SCRAPPED
    }

    public enum PIStatus
    {
        PENDING,
        APPROVED,
        REJECTED
    }

    public enum POStatus
    {
        PENDING,
        APPROVED,
        COMPLETED,
        CANCELLED
    }

    public enum MovementType
    {
        ISSUE_TO_VENDOR,
        RECEIVE_FROM_VENDOR,
        INTERNAL_TRANSFER,
        SYSTEM_RETURN
    }

    public enum QCStatus
    {
        PENDING,
        APPROVED,
        REJECTED,
        REWORK
    }
}
