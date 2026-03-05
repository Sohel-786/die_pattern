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
  | 'AtVendor'
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
  Inward = 'Inward',
  SystemReturn = 'SystemReturn',
}

export enum InwardSourceType {
  PO = 0,
  JobWork = 1,
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
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  logoUrl?: string | null;
  gstNo?: string | null;
  gstDate?: string | null;
  useAsParty: boolean;
  themeColor: string;
  isActive: boolean;
}

export interface Location {
  id: number;
  name: string;
  address: string;
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

/** One successfully imported item in opening history (for traceability). */
export interface ImportedItemSummary {
  row: number;
  mainPartName: string;
  displayName: string;
}

export interface OpeningHistoryEntry {
  id: number;
  originalFileName: string;
  importedAt: string;
  itemsImportedCount: number;
  /** Total data rows in the uploaded file (e.g. "2 of 20 imported"). */
  totalRowsInFile?: number | null;
  /** JSON string of ImportedItemSummary[] — parse to show which items were imported. */
  importedItemsJson?: string | null;
  /** If set, user can download an Excel with only the successfully imported rows. */
  importedOnlyFilePath?: string | null;
  importedBy?: string | null;
}

export interface PurchaseIndent {
  id: number;
  piNo: string;
  type: PurchaseIndentType;
  status: PurchaseIndentStatus;
  remarks?: string;
  reqDateOfDelivery?: string | null;
  mtcReq: boolean;
  documentNo?: string | null;
  revisionNo?: string | null;
  revisionDate?: string | null;
  createdBy: number;
  creatorName: string;
  approvedBy?: number | null;
  approverName?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  isActive: boolean;
  items: PurchaseIndentItem[];
}

export interface PurchaseIndentPrintData {
  companyName: string;
  locationName: string;
  documentNo: string;
  revisionNo: string;
  revisionDate: string | null;
  indentNo: string;
  indentDate: string;
  reqDateOfDelivery: string | null;
  mtcReq: boolean;
  indentedBy: string;
  authorisedBy: string;
  receivedBy: string;
  rows: PurchaseIndentPrintRow[];
}

export interface PurchaseIndentPrintRow {
  srNo: number;
  itemDescription: string;
  itemType: string;
  itemMaterial: string;
  drgNo: string;
}

export enum DocumentType {
  PurchaseIndent = 0,
  PurchaseOrder = 1,
  JobWork = 2,
  TransferEntry = 3,
}

export interface DocumentControlDto {
  id: number;
  documentType: DocumentType;
  documentNo: string;
  revisionNo: string;
  revisionDate: string;
  isApplied: boolean;
  isActive: boolean;
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
  gstPercent?: number | null;
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
  createdAt?: string;
  updatedAt?: string;
  attachmentUrls?: string[];
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
  rate?: number | null;
  gstPercent?: number | null;
  sourceRate?: number | null;
  sourceGstPercent?: number | null;
  qcNo?: string | null;
  movementId?: number | null;
  isQCPending: boolean;
  isQCApproved: boolean;
  sourceDate?: string | null;
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
  attachmentUrls?: string[];
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
  inwardDate?: string | null;
  sourceDate?: string | null;
}

export interface PendingQC {
  inwardLineId: number;
  itemId: number;
  itemName?: string;
  mainPartName?: string;
  itemTypeName?: string;
  drawingNo?: string;
  revisionNo?: string;
  materialName?: string;
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
  rate?: number | null;
  gstPercent?: number | null;
}

export interface JobWorkItem {
  id: number;
  jobWorkId: number;
  itemId: number;
  itemName?: string;
  mainPartName?: string;
  itemTypeName?: string;
  materialName?: string;
  drawingNo?: string;
  revisionNo?: string;
  rate?: number | null;
  gstPercent?: number | null;
  remarks?: string;
  inwardNo?: string | null;
  qcNo?: string | null;
  isQCPending?: boolean;
  isQCApproved?: boolean;
  /** Authoritative QC item decision: null=not yet decided/no QC, true=approved, false=rejected */
  qcDecision?: boolean | null;
  /** True when the QC entry for this item has been finalised (status is Approved or Rejected) */
  isQCEntryFinalised?: boolean;
  isInwarded?: boolean;
}

export interface JobWork {
  id: number;
  jobWorkNo: string;
  toPartyId: number;
  toPartyName?: string;
  description?: string | null;
  remarks?: string | null;
  status: JobWorkStatus;
  attachmentUrls: string[];
  items: JobWorkItem[];
  creatorName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateJobWorkDto {
  toPartyId: number;
  description?: string;
  remarks?: string;
  attachmentUrls?: string[];
  items: {
    itemId: number;
    rate?: number | null;
    gstPercent?: number | null;
    remarks?: string;
  }[];
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
  recentChanges: { mainPartName?: string; oldName?: string; newName?: string; changeType?: string; createdAt?: string }[];
  recentChangesCount?: number;
  recentSystemAdjustments: any[];
}

export interface UserPermission {
  id: number;
  userId: number;
  viewDashboard: boolean;

  // Master Permissions
  viewMaster: boolean;
  addMaster: boolean;
  editMaster: boolean;
  importMaster: boolean;
  exportMaster: boolean;

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
  editMovement: boolean;

  viewTransfer: boolean;
  createTransfer: boolean;
  editTransfer: boolean;

  manageChanges: boolean;
  revertChanges: boolean;
  viewReports: boolean;
  viewPIPReport: boolean;
  viewInwardReport: boolean;
  viewItemLedgerReport: boolean;
  manageUsers: boolean;
  accessSettings: boolean;
  navigationLayout: 'SIDEBAR' | 'HORIZONTAL';
}

/** One row in Purchase Indent report. */
export interface PIReportRow {
  id: number;
  piNo: string;
  type: string;
  status: string;
  createdAt: string;
  approvedAt?: string | null;
  creatorName?: string | null;
  approverName?: string | null;
  itemCount: number;
  reqDateOfDelivery?: string | null;
  mtcReq: boolean;
}

/** One row in Inward report. */
export interface InwardReportRow {
  id: number;
  inwardNo: string;
  inwardDate: string;
  status: string;
  locationName?: string | null;
  vendorName?: string | null;
  lineCount: number;
  creatorName?: string | null;
  createdAt: string;
}

/** One row in Item Ledger report (location-scoped). */
export interface ItemLedgerRow {
  eventDate: string;
  eventType: string;
  referenceNo: string;
  locationName?: string | null;
  partyName?: string | null;
  /** Only for Transfer: "From X → To Y". */
  fromToDisplay?: string | null;
  description?: string | null;
  preparedBy?: string | null;
  authorizedBy?: string | null;
}

export interface AppSettings {
  id: number;
  softwareName?: string | null;
  logoUrl?: string | null;
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

export interface TransferItem {
  id: number;
  itemId: number;
  mainPartName?: string;
  currentName?: string;
  itemTypeName?: string;
  materialName?: string;
  drawingNo?: string;
  revisionNo?: string;
  remarks?: string;
}

export interface Transfer {
  id: number;
  transferNo: string;
  fromPartyId?: number;
  fromPartyName?: string;
  toPartyId?: number;
  toPartyName?: string;
  transferDate: string;
  remarks?: string;
  outFor?: string;
  reasonDetails?: string;
  vehicleNo?: string;
  personName?: string;
  creatorName?: string;
  isActive: boolean;
  createdAt: string;
  attachmentUrls?: string[];
  items: TransferItem[];
}

export interface CreateTransferItem {
  itemId: number;
  remarks?: string;
}

export interface CreateTransfer {
  fromPartyId?: number;
  toPartyId?: number;
  transferDate?: string;
  remarks?: string;
  outFor?: string;
  reasonDetails?: string;
  vehicleNo?: string;
  personName?: string;
  attachmentUrls?: string[];
  items: CreateTransferItem[];
}
