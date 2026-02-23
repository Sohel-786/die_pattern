export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  QC_MANAGER = 'QC_MANAGER',
  QC_ADMIN = 'QC_ADMIN',
  QC_USER = 'QC_USER',
}

export enum PurchaseIndentStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected'
}

export enum PurchaseIndentType {
  New = 'New',
  Repair = 'Repair',
  Correction = 'Correction',
  Modification = 'Modification'
}

export enum PoStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export enum MovementType {
  Outward = 'Outward',
  Inward = 'Inward',
  SystemReturn = 'SystemReturn',
}

export enum ItemStatus {
  AVAILABLE = 'AVAILABLE',
  ISSUED = 'ISSUED',
  MAINTENANCE = 'MAINTENANCE',
  MISSING = 'MISSING',
  SCRAPPED = 'SCRAPPED',
}

export const RETURN_CONDITIONS = [
  "Good",
  "Damaged",
  "Repairable",
  "Scrap"
] as const;

export enum HolderType {
  Location = 'Location',
  Vendor = 'Vendor',
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  avatar?: string | null;
  mobileNumber?: string | null;
}

export interface Company {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Location {
  id: number;
  name: string;
  companyId: number;
  company?: Company;
  isActive: boolean;
}

export interface Party {
  id: number;
  name: string;
  partyCategory?: string;
  partyCode?: string;
  customerType?: string;
  address?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  gstNo?: string;
  gstDate?: string;
  isActive: boolean;
}

export interface ItemType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface ItemStatusMaster {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Material {
  id: number;
  name: string;
  isActive: boolean;
}

export interface OwnerType {
  id: number;
  name: string;
  isActive: boolean;
}

export interface StoreItem {
  id: number;
  name: string;
  itemName: string;
  itemCode?: string;
  serialNumber?: string;
  description?: string;
  inHouseLocation?: string;
  image?: string;
  latestImage?: string;
  status: ItemStatus;
  isActive: boolean;
  _count?: { issues?: number };
}

export interface Issue {
  id: number;
  issueNo?: string;
  itemId: number;
  locationId?: number;
  location?: { id: number; name: string };
  issuedTo?: string;
  remarks?: string;
  issueImage?: string;
  isActive: boolean;
  isReturned?: boolean;
  issuedAt?: string;
  createdAt: string;
}

export interface Status {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Return {
  id: number;
  returnCode?: string;
  issueId?: number;
  issue?: Issue;
  itemId?: number;
  item?: StoreItem;
  locationId?: number;
  location?: { id: number; name: string };
  condition?: string;
  statusId?: number;
  status?: Status;
  remarks?: string;
  receivedBy?: string;
  returnImage?: string;
  sourceInwardCode?: string;
  isActive: boolean;
  returnedAt: string;
  createdAt: string;
}

export interface Item {
  id: number;
  mainPartName: string;
  currentName: string;
  itemTypeId: number;
  itemTypeName?: string;
  drawingNo?: string;
  revisionNo?: string;
  materialId: number;
  materialName?: string;
  ownerTypeId: number;
  ownerTypeName?: string;
  statusId: number;
  statusName?: string;
  currentHolderType: HolderType;
  currentLocationId?: number;
  currentLocationName?: string;
  currentPartyId?: number;
  currentPartyName?: string;
  isActive: boolean;
}

export interface PurchaseIndent {
  id: number;
  piNo: string;
  type: PurchaseIndentType;
  status: PurchaseIndentStatus;
  remarks?: string;
  createdBy: number;
  creatorName: string;
  createdAt: string;
  isActive: boolean;
  items: PurchaseIndentItem[];
}

export interface PurchaseIndentItem {
  id: number;
  purchaseIndentId: number;
  itemId: number;
  mainPartName: string;
  currentName: string;
  isInPO?: boolean;
  piNo?: string;
}

export interface PO {
  id: number;
  poNo: string;
  vendorId: number;
  vendorName?: string;
  rate?: number;
  deliveryDate?: string;
  quotationUrl?: string;
  status: PoStatus;
  items: POItem[];
  createdAt: string;
}

export interface POItem {
  id: number;
  purchaseIndentItemId: number;
  itemId: number;
  mainPartName: string;
  currentName: string;
  piNo: string;
}

export interface Movement {
  id: number;
  type: MovementType;
  itemId: number;
  item?: Item;
  transactionNo?: string;
  fromType: HolderType;
  fromLocationId?: number;
  fromLocation?: Location;
  fromPartyId?: number;
  fromParty?: Party;
  toType: HolderType;
  toLocationId?: number;
  toLocation?: Location;
  toPartyId?: number;
  toParty?: Party;
  toLocationName?: string;
  remarks?: string;
  reason?: string;
  purchaseOrderId?: number;
  purchaseOrder?: PO;
  isQCPending: boolean;
  isQCApproved: boolean;
  createdBy: number;
  // Flattened display fields from backend DTO
  itemName?: string;
  fromName?: string;
  toName?: string;
  createdAt: string;
}

export interface DashboardMetrics {
  summary: {
    total: number;
    atVendor: number;
    atLocation: number;
    pendingPI: number;
    pendingPO: number;
  };
  locationWiseCount: { locationName: string; count: number }[];
  recentChanges: any[];
  recentSystemAdjustments: any[];
}

export interface UserPermission {
  id: number;
  userId: number;
  viewDashboard: boolean;

  // Master Permissions
  viewMaster: boolean;
  manageItem: boolean;
  manageItemType: boolean;
  manageMaterial: boolean;
  manageItemStatus: boolean;
  manageOwnerType: boolean;
  manageParty: boolean;
  manageLocation: boolean;
  manageCompany: boolean;

  // Transactional
  viewPI: boolean;
  createPI: boolean;
  editPI: boolean;
  approvePI: boolean;

  viewPO: boolean;
  createPO: boolean;
  editPO: boolean;
  approvePO: boolean;

  viewInward: boolean;
  createInward: boolean;
  editInward: boolean;

  viewQC: boolean;
  createQC: boolean;
  editQC: boolean;
  approveQC: boolean;

  viewMovement: boolean;
  createMovement: boolean;

  manageChanges: boolean;
  revertChanges: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
  navigationLayout: 'SIDEBAR' | 'HORIZONTAL';
}

export interface AppSettings {
  id: number;
  companyName: string;
  companyLogo?: string | null;
  softwareName?: string | null;
  primaryColor?: string | null;
}

export interface ValidationEntry {
  row: number;
  data: any;
  message?: string;
}

export interface ValidationResult {
  valid: ValidationEntry[];
  invalid: ValidationEntry[];
  duplicates: ValidationEntry[];
  alreadyExists: ValidationEntry[];
  totalRows: number;
}
