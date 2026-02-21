export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  QC_MANAGER = 'QC_MANAGER',
  QC_ADMIN = 'QC_ADMIN',
  QC_USER = 'QC_USER',
}

export enum PurchaseIndentStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2
}

export enum PurchaseIndentType {
  New = 0,
  Repair = 1,
  Correction = 2,
  Modification = 3
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
  alternateNumber?: string;
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
  items: PurchaseIndentItem[];
}

export interface PurchaseIndentItem {
  id: number;
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
  itemName?: string;
  fromType: HolderType;
  fromName?: string;
  toType: HolderType;
  toName?: string;
  remarks?: string;
  reason?: string;
  isQCPending: boolean;
  isQCApproved: boolean;
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
  viewMaster: boolean;
  manageMaster: boolean;
  viewPI: boolean;
  createPI: boolean;
  approvePI: boolean;
  viewPO: boolean;
  createPO: boolean;
  approvePO: boolean;
  viewMovement: boolean;
  createMovement: boolean;
  viewQC: boolean;
  performQC: boolean;
  manageChanges: boolean;
  revertChanges: boolean;
  viewReports: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
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
