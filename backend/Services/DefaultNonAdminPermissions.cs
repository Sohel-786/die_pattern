using net_backend.Models;

namespace net_backend.Services
{
    /// <summary>
    /// Default permissions for newly created non-admin users: View and Add access to
    /// Master Data Management, Core Operations, Transfer & Logistics, Purchasing, and Reports & Analytics.
    /// Edit, Approve, Import, Export, and Access Settings are not granted by default.
    /// </summary>
    public static class DefaultNonAdminPermissions
    {
        /// <summary>
        /// Creates a new <see cref="UserPermission"/> with default View + Add access for the given user.
        /// Use when creating a new user with role other than Admin, or when creating a default permission record.
        /// </summary>
        /// <param name="userId">The user id to assign.</param>
        /// <returns>A new UserPermission instance (not attached to context) with defaults set.</returns>
        public static UserPermission Create(int userId)
        {
            var now = DateTime.Now;
            return new UserPermission
            {
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now,

                ViewDashboard = true,

                // Master Data Management: View + Add (all module-level add)
                ViewMaster = true,
                AddMaster = true,
                EditMaster = false,
                ImportMaster = false,
                ExportMaster = false,
                ManageItem = true,
                ManageItemType = true,
                ManageMaterial = true,
                ManageItemStatus = true,
                ManageOwnerType = true,
                ManageParty = true,
                ManageLocation = false,  // Company/Location masters reserved for admin
                ManageCompany = false,

                // Purchasing: View + Add
                ViewPI = true,
                CreatePI = true,
                EditPI = false,
                ApprovePI = false,
                ViewPO = true,
                CreatePO = true,
                EditPO = false,
                ApprovePO = false,

                // Core Operations: Inward, QC, Job Work - View + Add
                ViewInward = true,
                CreateInward = true,
                EditInward = false,
                ViewQC = true,
                CreateQC = true,
                EditQC = false,
                ApproveQC = false,
                ViewMovement = true,
                CreateMovement = true,
                EditMovement = false,

                // Transfer & Logistics: View + Add
                ViewTransfer = true,
                CreateTransfer = true,
                EditTransfer = false,

                // Reports & Analytics: enabled
                ViewReports = true,
                ViewPIPReport = true,
                ViewInwardReport = true,
                ViewItemLedgerReport = true,

                ManageChanges = false,
                RevertChanges = false,
                AccessSettings = false,
                NavigationLayout = "SIDEBAR"
            };
        }
    }
}
