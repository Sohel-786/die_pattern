export enum Role {
    QC_USER = 'QC_USER',
    QC_MANAGER = 'QC_MANAGER',
    QC_ADMIN = 'QC_ADMIN',
}

export enum ItemStatus {
    AVAILABLE = 'AVAILABLE',
    ISSUED = 'ISSUED',
    MISSING = 'MISSING',
}

export interface Division {
    id: number;
    name: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    selectedDivisionName?: string;
    allowedDivisions?: { id: number; name: string }[];
    avatar?: string | null;
    mobileNumber?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Item {
    id: number;
    itemName: string;
    description?: string | null;
    image?: string | null;
    serialNumber?: string | null;
    categoryId?: number | null;
    divisionId: number;
    inHouseLocation?: string | null;
    status: ItemStatus;
    isActive: boolean;
    latestImage?: string | null;
    _count?: {
        issues: number;
    };
    createdAt: string;
    updatedAt: string;
    /** Inward number that recorded this item as Missing (from GET /items/missing) */
    sourceInwardCode?: string | null;
}

export interface ItemCategory {
    id: number;
    name: string;
    divisionId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Company {
    id: number;
    name: string;
    divisionId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Location {
    id: number;
    name: string;
    companyId: number;
    divisionId: number;
    company?: Company;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Contractor {
    id: number;
    name: string;
    phoneNumber: string;
    divisionId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Status {
    id: number;
    name: string;
    divisionId: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Machine {
    id: number;
    name: string;
    contractorId: number;
    divisionId: number;
    contractor?: Contractor;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface appSettings {
    id: number;
    companyName: string;
    companyLogo?: string | null;
    softwareName?: string | null;
    primaryColor?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface AppSettings {
    id: number;
    companyName: string;
    companyLogo?: string | null;
    softwareName?: string | null;
    primaryColor?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserPermission {
    id: number;
    userId: number;
    viewDashboard: boolean;
    viewMaster: boolean;
    viewDivisionMaster: boolean;
    viewCompanyMaster: boolean;
    viewLocationMaster: boolean;
    viewContractorMaster: boolean;
    viewStatusMaster: boolean;
    viewMachineMaster: boolean;
    viewItemMaster: boolean;
    viewItemCategoryMaster: boolean;
    viewOutward: boolean;
    viewInward: boolean;
    viewReports: boolean;
    viewActiveIssuesReport: boolean;
    viewMissingItemsReport: boolean;
    viewItemHistoryLedgerReport: boolean;
    importExportMaster: boolean;
    addOutward: boolean;
    editOutward: boolean;
    addInward: boolean;
    editInward: boolean;
    addMaster: boolean;
    editMaster: boolean;
    manageUsers: boolean;
    accessSettings: boolean;
    navigationLayout: 'VERTICAL' | 'HORIZONTAL';
    createdAt?: string;
    updatedAt?: string;
}

// Pattern Die / Inward / PO related types
export interface PatternDie {
    id: number;
    currentName: string;
    mainPartName?: string;
    drawingNo?: string;
    revisionNo?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Vendor {
    id: number;
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PIItem {
    id: number;
    piId: number;
    patternDieId: number;
    patternDie?: PatternDie;
    quantity: number;
    createdAt: string;
    updatedAt: string;
}

export interface POItem {
    id: number;
    poId: number;
    piItemId: number;
    piItem?: PIItem;
    purchaseOrder?: PurchaseOrder;
    quantity: number;
    receivedQuantity?: number;
    createdAt: string;
    updatedAt: string;
}

export interface PurchaseOrder {
    id: number;
    poNo: string;
    vendorId: number;
    vendor?: Vendor;
    poDate: string;
    status: 'DRAFT' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
    items?: POItem[];
    createdAt: string;
    updatedAt: string;
}

export interface InwardItem {
    id: number;
    inwardEntryId: number;
    poItemId: number;
    poItem?: POItem;
    inwardEntry?: InwardEntry;
    qcStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REWORK';
    createdAt: string;
    updatedAt: string;
}

export interface InwardEntry {
    id: number;
    inwardNo: string;
    inwardDate: string;
    poId: number;
    purchaseOrder?: PurchaseOrder;
    challanNo?: string;
    challanDate?: string;
    vehicleNo?: string;
    receiverId: number;
    receiver?: User;
    items: InwardItem[];
    createdAt: string;
    updatedAt: string;
}

export interface QCInspection {
    id: number;
    qcNo: string;
    inwardItemId: number;
    inwardItem?: InwardItem;
    status: 'APPROVED' | 'REJECTED' | 'REWORK';
    inspectionNotes?: string;
    parametersChecked?: string;
    targetLocationId?: number;
    targetLocation?: Location;
    inspectorId: number;
    inspector?: User;
    inspectedAt: string;
    createdAt: string;
    updatedAt: string;
}

