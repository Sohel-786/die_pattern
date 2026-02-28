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
  Rejected = 'Rejected',
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

export type PurchaseType = 'Regular' | 'Urgent' | 'Critical';

export type ItemProcessState =
  | 'NotInStock'
  | 'InPI'
  | 'InPO'
  | 'InwardDone'
  | 'InQC'
  | 'InJobwork'
  | 'Outward'
  | 'InStock';

export interface ItemWithStatus {
  itemId: number;
  currentName?: string | null;
  mainPartName?: string | null;
  itemTypeName?: string | null;
  status: ItemProcessState;
}

export enum GstType {
  CGST_SGST = 'CGST_SGST',
  IGST = 'IGST',
  UGST = 'UGST',
}

export enum MovementType {
  Outward = 'Outward',
  Inward = 'Inward',
  SystemReturn = 'SystemReturn',
}

export enum InwardSourceType {
  PO = 0,
  OutwardReturn = 1,
  JobWork = 2,
}

export enum InwardStatus {
  Draft = 0,
  Submitted = 1,
}

export enum JobWorkStatus {
  Pending = 0,
  InTransit = 1,
  Completed = 2,
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
  NotInStock = 'NotInStock',
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
  /** From API: default company/location (camelCase from backend DefaultCompanyId/DefaultLocationId). */
  defaultCompanyId?: number | null;
  defaultLocationId?: number | null;
  /** Convenience: same as defaultCompanyId/defaultLocationId when present. */
  companyId?: number;
  locationId?: number;
}

export interface Company {
  id: number;
  name: string;
  address?: string | null;
  pan?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  gstNo?: string | null;
  gstDate?: string | null;
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
  /** Latest process for display: PI Issued, PO Issued, In QC, In Job Work, In Outward, In Stock, Not In Stock */
  currentProcess?: string | null;
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
  approvedBy?: number | null;
  approverName?: string | null;
  approvedAt?: string | null;
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
  itemTypeName?: string;
  drawingNo?: string;
  revisionNo?: string;
  materialName?: string;
  isInPO?: boolean;
  piNo?: string;
  poNo?: string;
  poId?: number | null;
  inwardNo?: string;
  qcNo?: string;
}

export interface PO {
  id: number;
  poNo: string;
  vendorId: number;
  vendorName?: string;
  deliveryDate?: string;
  quotationNo?: string;
  quotationUrls?: string[];
  gstType?: GstType | null;
  gstPercent?: number | null;
  subtotal?: number;
  gstAmount?: number | null;
  totalAmount?: number;
  status: PoStatus;
  remarks?: string;
  purchaseType?: PurchaseType;
  creatorName?: string;
  approvedBy?: number | null;
  approverName?: string | null;
  approvedAt?: string | null;
  items: POItem[];
  createdAt: string;
  isActive?: boolean;
  /** True if any inward has been done against this PO (edit not allowed). */
  hasInward?: boolean;
}

export interface POItem {
  id: number;
  purchaseIndentItemId: number;
  itemId: number;
  mainPartName: string;
  currentName: string;
  itemTypeName?: string;
  drawingNo?: string;
  revisionNo?: string;
  materialName?: string;
  piNo: string;
  rate: number;
  lineAmount?: number; // same as rate (one unit per die/pattern)
  inwardNo?: string;
  qcNo?: string;
}

export interface CreatePOItem {
  purchaseIndentItemId: number;
  rate: number;
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
  inwardId?: number | null;
  inwardNo?: string | null;
  sourceType?: InwardSourceType | null;
  sourceRefDisplay?: string | null;
  isQCPending: boolean;
  isQCApproved: boolean;
  createdBy: number;
  // Flattened display fields from backend DTO
  itemName?: string;
  mainPartName?: string;
  fromName?: string;
  toName?: string;
  poNo?: string;
  createdAt: string;
}

export interface Inward {
  id: number;
  inwardNo: string;
  inwardDate: string;
  locationId: number;
  locationName?: string;
  vendorId?: number | null;
  vendorName?: string | null;
  remarks?: string | null;
  status: InwardStatus;
  createdBy: number;
  creatorName?: string | null;
  isActive: boolean;
  inwardFrom?: string | null;
  lines: InwardLine[];
}

export interface InwardLine {
  id: number;
  inwardId: number;
  itemId: number;
  itemName?: string;
  mainPartName?: string;
  quantity: number;
  itemTypeName?: string;
  materialName?: string;
  drawingNo?: string;
  revisionNo?: string;
  sourceType: InwardSourceType;
  sourceRefId: number;
  sourceRefDisplay?: string;
  remarks?: string;
  qcNo?: string | null;
  movementId?: number | null;
  isQCPending: boolean;
  isQCApproved: boolean;
}

export enum QcStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export interface QC {
  id: number;
  qcNo: string;
  partyId: number;
  partyName?: string;
  sourceType: InwardSourceType;
  remarks?: string;
  status: QcStatus;
  createdBy: number;
  creatorName?: string;
  approvedBy?: number | null;
  approverName?: string | null;
  approvedAt?: string | null;
  isActive: boolean;
  createdAt: string;
  items: QCItem[];
}

export interface QCItem {
  id: number;
  inwardLineId: number;
  itemId: number;
  mainPartName?: string;
  currentName?: string;
  itemTypeName?: string;
  drawingNo?: string;
  revisionNo?: string;
  materialName?: string;
  inwardNo?: string;
  inwardId: number;
  isApproved?: boolean | null;
  remarks?: string;
  sourceRefDisplay?: string;
}

export interface PendingQC {
  inwardLineId: number;
  itemId: number;
  itemName?: string;
  mainPartName?: string;
  inwardId?: number;
  inwardNo?: string;
  sourceType?: InwardSourceType;
  sourceRefDisplay?: string;
  vendorName?: string;
  isQCPending: boolean;
  isQCApproved: boolean;
  inwardDate: string;
}

export interface CreateInwardDto {
  inwardDate?: string;
  vendorId?: number | null;
  remarks?: string | null;
  lines: CreateInwardLineDto[];
}

export interface CreateInwardLineDto {
  itemId: number;
  quantity: number;
  sourceType: InwardSourceType;
  sourceRefId: number;
  remarks?: string;
}

export interface JobWork {
  id: number;
  jobWorkNo: string;
  itemId: number;
  itemName?: string;
  description?: string | null;
  status: JobWorkStatus;
  createdAt: string;
}

export interface DashboardMetrics {
  summary: {
    total: number;
    atVendor: number;
    atLocation: number;
    notInStock?: number;
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
