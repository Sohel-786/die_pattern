"use client";

import { useState, useMemo, useCallback, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Link from "next/link";
import api from "@/lib/api";
import { DashboardMetrics, PurchaseIndent, PurchaseIndentStatus, PO, PoStatus, RecentItemChangeRow } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Package,
  FileText,
  ShoppingCart,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Eye,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Minus,
  Edit2,
  LayoutGrid,
  ClipboardList,
  Ban,
  X,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { DatePicker } from "@/components/ui/date-picker";
import { PurchaseIndentPreviewModal } from "@/components/purchase-indents/purchase-indent-preview-modal";
import { PurchaseOrderPreviewModal } from "@/components/purchase-orders/purchase-order-preview-modal";
import { cn, formatDateTime, formatRate } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PurchaseIndentDialog } from "@/components/purchase-indents/purchase-indent-dialog";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";

const filterLabelClass =
  "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
  "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
  "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

function hasAnyActive(values: Array<unknown>): boolean {
  return values.some((v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "boolean") return v;
    return true;
  });
}

const getProcessColor = (process?: string) => {
  const p = process?.replace(/\s+/g, "").toLowerCase() || "";
  switch (p) {
    case "instock":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5";
    case "notinstock":
      return "bg-slate-50 text-slate-600 border-slate-200/60 shadow-sm shadow-slate-500/5";
    case "atvendor":
      return "bg-violet-50 text-violet-700 border-violet-200/60 shadow-sm shadow-violet-500/5";
    case "inqc":
      return "bg-sky-50 text-sky-700 border-sky-200/60 shadow-sm shadow-sky-500/5";
    case "inwarddone":
      return "bg-teal-50 text-teal-700 border-teal-200/60 shadow-sm shadow-teal-500/5";
    case "pi":
    case "inpi":
    case "piissued":
      return "bg-orange-50 text-orange-700 border-orange-200/60 shadow-sm shadow-orange-500/5";
    case "po":
    case "inpo":
    case "poissued":
      return "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5";
    case "injobwork":
      return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/60 shadow-sm shadow-fuchsia-500/5";
    default:
      return "bg-secondary-50 text-secondary-700 border-secondary-200/60 shadow-sm shadow-secondary-500/5";
  }
};

const formatProcess = (process?: string) => {
  if (!process) return "—";
  if (process === "InPI") return "In PI";
  if (process === "InPO") return "In PO";
  if (process === "PI") return "PI";
  if (process === "PO") return "PO";

  return process
    .replace(/([A-Z])/g, " $1")
    .trim();
};

const getConditionColor = (condition?: string) => {
  switch (condition?.toLowerCase()) {
    case "good condition": return "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5";
    case "under repair": return "bg-amber-50 text-amber-700 border-amber-200/60 shadow-sm shadow-amber-500/5";
    case "scrapped": return "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/5";
    case "new": return "bg-blue-50 text-blue-700 border-blue-200/60 shadow-sm shadow-blue-500/5";
    case "available": return "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/5";
    case "on hold": return "bg-gray-50 text-gray-700 border-gray-200/60 shadow-sm shadow-gray-500/5";
    default: return "bg-secondary-50 text-secondary-700 border-secondary-200/60 shadow-sm shadow-secondary-500/5";
  }
};

type ExpandedSection = "location" | "at-vendor" | "pending-pi" | "pending-po" | "recent-changes" | null;

interface LocationWiseItemRow {
  id: number;
  locationName: string;
  mainPartName: string;
  currentName?: string | null;
  drawingNo?: string | null;
  itemTypeName?: string | null;
  statusName?: string | null;
  currentProcess: string;
  isActive: boolean;
}

interface ItemAtVendorRow {
  id: number;
  vendorName?: string | null;
  mainPartName: string;
  currentName?: string | null;
  drawingNo?: string | null;
  itemTypeName?: string | null;
  currentProcess: string;
}

const PROCESS_OPTIONS = [
  { id: 7, name: "In Stock" },
  { id: 4, name: "In QC" },
  { id: 3, name: "Inward Done" },
  { id: 6, name: "At Vendor" },
  { id: 5, name: "In Job Work" },
  { id: 1, name: "PI Issued" },
  { id: 2, name: "PO Issued" },
  { id: 0, name: "Not In Stock" },
];

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: permissions } = useCurrentUserPermissions();
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);

  const { selected: globalSelected } = useLocationContext();
  const [locationId, setLocationId] = useState<number | "">("");

  // Sync with global location context on mount or change
  useEffect(() => {
    if (globalSelected?.locationId) {
      setLocationId(globalSelected.locationId);
    }
  }, [globalSelected?.locationId]); // Only trigger when the ID actually changes

  const [locationSearch, setLocationSearch] = useState("");
  const [locationItemTypeId, setLocationItemTypeId] = useState<number | "">("");
  const [locationStatusId, setLocationStatusId] = useState<number | "">("");
  const [locationProcessId, setLocationProcessId] = useState<number | "">("");
  const [locationItemIds, setLocationItemIds] = useState<number[]>([]);

  // At-vendor filters
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorIds, setVendorIds] = useState<number[]>([]);
  const [atVendorItemIds, setAtVendorItemIds] = useState<number[]>([]);
  const [atVendorItemTypeId, setAtVendorItemTypeId] = useState<number | "">("");

  // Pending PI filters
  const [pendingPISearch, setPendingPISearch] = useState("");
  const [pendingPIDateFrom, setPendingPIDateFrom] = useState("");
  const [pendingPIDateTo, setPendingPIDateTo] = useState("");
  const [pendingPIItemIds, setPendingPIItemIds] = useState<number[]>([]);

  // Pending PO filters
  const [pendingPOSearch, setPendingPOSearch] = useState("");
  const [pendingPODateFrom, setPendingPODateFrom] = useState("");
  const [pendingPODateTo, setPendingPODateTo] = useState("");
  const [pendingPOVendorIds, setPendingPOVendorIds] = useState<number[]>([]);

  // Recent changes filters
  const [recentSearch, setRecentSearch] = useState("");
  const [recentDateFrom, setRecentDateFrom] = useState("");
  const [recentDateTo, setRecentDateTo] = useState("");

  const [approvalTarget, setApprovalTarget] = useState<
    { type: "pi"; pi: PurchaseIndent; action: "approve" | "reject" | "revert" } | { type: "po"; po: PO; action: "approve" | "reject" | "revert" }
    | null>(null);
  const [previewPIId, setPreviewPIId] = useState<number | null>(null);
  const [previewPOId, setPreviewPOId] = useState<number | null>(null);
  const [expandedPIId, setExpandedPIId] = useState<number | null>(null);
  const [expandedPOId, setExpandedPOId] = useState<number | null>(null);
  const [editPITarget, setEditPITarget] = useState<PurchaseIndent | null>(null);
  const [editPIDialogOpen, setEditPIDialogOpen] = useState(false);
  const [editPOTarget, setEditPOTarget] = useState<PO | null>(null);
  const [editPODialogOpen, setEditPODialogOpen] = useState(false);
  const [pendingPIStatus, setPendingPIStatus] = useState<string>("");
  const [pendingPOStatus, setPendingPOStatus] = useState<string>("");
  const router = useRouter();

  const debouncedLocationSearch = useDebouncedValue(locationSearch, 400);
  const debouncedVendorSearch = useDebouncedValue(vendorSearch, 400);
  const debouncedPendingPISearch = useDebouncedValue(pendingPISearch, 400);
  const debouncedPendingPOSearch = useDebouncedValue(pendingPOSearch, 400);
  const debouncedRecentSearch = useDebouncedValue(recentSearch, 400);

  const { data: metrics, isLoading: loadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", locationId],
    queryFn: async () => {
      const response = await api.get("/dashboard/metrics", { params: { locationId: locationId || undefined } });
      return response.data.data;
    },
  });

  // No automatic selection - let user see "All Locations" by default if they prefer
  // or they can pick one.

  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardPageSize, setDashboardPageSize] = useState(25);

  const locationWiseParams = useMemo(
    () => ({
      locationId: locationId === "" ? undefined : locationId,
      search: debouncedLocationSearch || undefined,
      itemTypeId: locationItemTypeId === "" ? undefined : locationItemTypeId,
      statusId: locationStatusId === "" ? undefined : locationStatusId,
      currentProcessId: locationProcessId === "" ? undefined : locationProcessId,
      itemIds: locationItemIds.length ? locationItemIds.join(",") : undefined,
      page: dashboardPage,
      pageSize: dashboardPageSize,
    }),
    [locationId, debouncedLocationSearch, locationItemTypeId, locationStatusId, locationProcessId, locationItemIds, dashboardPage, dashboardPageSize]
  );

  const { data: locationWiseData, isLoading: loadingLocationWise } = useQuery<
    { list: LocationWiseItemRow[]; totalCount: number }
  >({
    queryKey: ["dashboard", "location-wise-items", locationWiseParams],
    queryFn: async () => {
      if (typeof locationWiseParams.locationId !== "number") return { list: [], totalCount: 0 };
      const res = await api.get("/dashboard/location-wise-items", {
        params: locationWiseParams,
      });
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
    enabled: expandedSection === "location" && typeof locationWiseParams.locationId === "number",
  });
  const locationWiseItems = locationWiseData?.list ?? [];
  const locationWiseTotalCount = locationWiseData?.totalCount ?? 0;

  const atVendorParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedVendorSearch || undefined,
      vendorIds: vendorIds.length ? vendorIds.join(",") : undefined,
      itemIds: atVendorItemIds.length ? atVendorItemIds.join(",") : undefined,
      itemTypeId: atVendorItemTypeId === "" ? undefined : atVendorItemTypeId,
      page: dashboardPage,
      pageSize: dashboardPageSize,
    }),
    [locationId, debouncedVendorSearch, vendorIds, atVendorItemIds, atVendorItemTypeId, dashboardPage, dashboardPageSize]
  );

  const recentChangesParams = useMemo(
    () => ({
      locationId: locationId === "" ? undefined : locationId,
      search: debouncedRecentSearch || undefined,
      dateFrom: recentDateFrom || undefined,
      dateTo: recentDateTo || undefined,
    }),
    [locationId, debouncedRecentSearch, recentDateFrom, recentDateTo]
  );

  const { data: recentChangesData, isLoading: loadingRecentChanges } = useQuery<{
    data: RecentItemChangeRow[];
    total: number;
    page: number;
    limit: number;
  }>({
    queryKey: ["dashboard", "recent-item-changes", recentChangesParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/recent-item-changes", {
        params: { ...recentChangesParams, page: 1, limit: 50 },
      });
      return res.data.data;
    },
  });

  const { data: atVendorData, isLoading: loadingAtVendor } = useQuery<{ list: ItemAtVendorRow[]; totalCount: number }>({
    queryKey: ["dashboard", "items-at-vendor", atVendorParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/items-at-vendor", { params: atVendorParams });
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
    enabled: expandedSection === "at-vendor",
  });
  const itemsAtVendor = atVendorData?.list ?? [];
  const atVendorTotalCount = atVendorData?.totalCount ?? 0;

  const pendingPIParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedPendingPISearch || undefined,
      createdDateFrom: pendingPIDateFrom || undefined,
      createdDateTo: pendingPIDateTo || undefined,
      itemIds: pendingPIItemIds.length ? pendingPIItemIds.join(",") : undefined,
      status: pendingPIStatus || undefined,
      page: dashboardPage,
      pageSize: dashboardPageSize,
    }),
    [locationId, debouncedPendingPISearch, pendingPIDateFrom, pendingPIDateTo, pendingPIItemIds, pendingPIStatus, dashboardPage, dashboardPageSize]
  );

  const { data: pendingPIData, isLoading: loadingPendingPI } = useQuery<{ list: PurchaseIndent[]; totalCount: number }>({
    queryKey: ["dashboard", "pending-pi", pendingPIParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/pending-pi", { params: pendingPIParams });
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
    enabled: expandedSection === "pending-pi",
  });
  const pendingPIList = pendingPIData?.list ?? [];
  const pendingPITotalCount = pendingPIData?.totalCount ?? 0;

  const pendingPOParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedPendingPOSearch || undefined,
      poDateFrom: pendingPODateFrom || undefined,
      poDateTo: pendingPODateTo || undefined,
      vendorIds: pendingPOVendorIds.length ? pendingPOVendorIds.join(",") : undefined,
      status: pendingPOStatus || undefined,
      page: dashboardPage,
      pageSize: dashboardPageSize,
    }),
    [locationId, debouncedPendingPOSearch, pendingPODateFrom, pendingPODateTo, pendingPOVendorIds, pendingPOStatus, dashboardPage, dashboardPageSize]
  );

  const { data: pendingPOData, isLoading: loadingPendingPO } = useQuery<{ list: PO[]; totalCount: number }>({
    queryKey: ["dashboard", "pending-po", pendingPOParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/pending-po", { params: pendingPOParams });
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
    enabled: expandedSection === "pending-po",
  });
  const pendingPOList = pendingPOData?.list ?? [];
  const pendingPOTotalCount = pendingPOData?.totalCount ?? 0;

  useEffect(() => {
    setDashboardPage(1);
  }, [
    locationId,
    debouncedLocationSearch,
    locationItemTypeId,
    locationStatusId,
    locationProcessId,
    locationItemIds,
    debouncedVendorSearch,
    vendorIds,
    atVendorItemIds,
    atVendorItemTypeId,
    debouncedPendingPISearch,
    pendingPIDateFrom,
    pendingPIDateTo,
    pendingPIItemIds,
    pendingPIStatus,
    debouncedPendingPOSearch,
    pendingPODateFrom,
    pendingPODateTo,
    pendingPOVendorIds,
    pendingPOStatus,
  ]);

  const { data: itemsList = [] } = useQuery<{ id: number; currentName?: string; mainPartName?: string }[]>({
    queryKey: ["items-for-filter"],
    queryFn: async () => {
      const res = await api.get("/items/for-filter");
      return res.data.data ?? [];
    },
  });

  const { data: itemTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["item-types", "active"],
    queryFn: async () => {
      const res = await api.get("/masters/item-types/active");
      return res.data?.data ?? [];
    },
  });

  const { data: itemStatuses = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["item-statuses", "active"],
    queryFn: async () => {
      const res = await api.get("/masters/item-statuses/active");
      return res.data?.data ?? [];
    },
  });

  const { data: parties = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["parties", "active"],
    queryFn: async () => {
      const res = await api.get("/parties/active");
      return res.data?.data ?? [];
    },
  });

  const itemOptions: MultiSelectSearchOption[] = useMemo(
    () =>
      itemsList.map((i) => ({
        value: i.id,
        label: [i.currentName, i.mainPartName].filter(Boolean).join(" – ") || `Item ${i.id}`,
      })),
    [itemsList]
  );
  const vendorOptions: MultiSelectSearchOption[] = useMemo(
    () => parties.map((p) => ({ value: p.id, label: p.name })),
    [parties]
  );

  const approvePIMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-indents/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-pi"] });
      toast.success("Indent approved successfully");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed"),
  });

  const rejectPIMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-indents/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-pi"] });
      toast.success("Indent rejected successfully");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed"),
  });

  const revertToPendingMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-indents/${id}/revert-to-pending`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-pi"] });
      toast.success("Indent reverted to Pending");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Revert failed"),
  });

  const approvePOMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-po"] });
      toast.success("Order approved successfully");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed"),
  });

  const rejectPOMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-po"] });
      toast.success("Order rejected successfully");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed"),
  });

  const revertToPendingPOMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/revert-to-pending`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-po"] });
      toast.success("Order reverted to Pending");
      setApprovalTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Revert failed"),
  });

  const handleExport = useCallback(
    async (section: "location" | "at-vendor" | "pending-pi" | "pending-po" | "recent-changes") => {
      try {
        let url = "";
        const params =
          section === "location"
            ? locationWiseParams
            : section === "at-vendor"
              ? atVendorParams
              : section === "pending-pi"
                ? pendingPIParams
                : section === "pending-po"
                  ? pendingPOParams
                  : recentChangesParams;
        if (section === "location" && (typeof locationWiseParams.locationId !== "number")) {
          toast.error("Select a location first.");
          return;
        }
        const endpoint =
          section === "location"
            ? "/dashboard/export/location-wise-items"
            : section === "at-vendor"
              ? "/dashboard/export/items-at-vendor"
              : section === "pending-pi"
                ? "/dashboard/export/pending-pi"
                : section === "pending-po"
                  ? "/dashboard/export/pending-po"
                  : "/dashboard/export/recent-item-changes";
        const response = await api.get(endpoint, { responseType: "blob", params });

        // Extract filename from Content-Disposition header
        let fileName = `dashboard-${section}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
        const disposition = response.headers["content-disposition"];
        if (disposition && disposition.indexOf("attachment") !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            fileName = matches[1].replace(/['"]/g, "");
          }
        }

        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        toast.success("Export downloaded.");
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Export failed.");
      }
    },
    [
      locationWiseParams,
      atVendorParams,
      pendingPIParams,
      pendingPOParams,
      recentChangesParams,
    ]
  );

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const statCards = [
    {
      title: locationId === "" ? "Total Die/Pattern (All Locations)" : `Total Die/Pattern At Location (${metrics?.locationWiseCount?.find(l => l.locationId === locationId)?.locationName ?? "Selected Location"})`,
      value: metrics?.summary?.total ?? 0,
      icon: LayoutGrid,
      gradient: "from-blue-500 to-blue-600",
      baseBg: "bg-blue-50/40",
      shadowColor: "shadow-blue-500/20",
      iconColor: "text-blue-600",
      section: "location" as const,
    },
    {
      title: "Patterns at Vendor",
      value: metrics?.summary?.atVendor ?? 0,
      icon: Package,
      gradient: "from-amber-500 to-amber-600",
      baseBg: "bg-amber-50/40",
      shadowColor: "shadow-amber-500/20",
      iconColor: "text-amber-600",
      section: "at-vendor" as const,
    },
    {
      title: "Pending PI",
      value: metrics?.summary?.pendingPI ?? 0,
      icon: ClipboardList,
      gradient: "from-rose-500 to-rose-600",
      baseBg: "bg-rose-50/40",
      shadowColor: "shadow-rose-500/20",
      iconColor: "text-rose-600",
      section: "pending-pi" as const,
    },
    {
      title: "Pending PO",
      value: metrics?.summary?.pendingPO ?? 0,
      icon: FileText,
      gradient: "from-emerald-500 to-emerald-600",
      baseBg: "bg-emerald-50/40",
      shadowColor: "shadow-emerald-500/20",
      iconColor: "text-emerald-600",
      section: "pending-po" as const,
    },
    {
      title: "Recent Name Changes",
      value: recentChangesData?.total ?? 0,
      icon: History,
      gradient: "from-indigo-500 to-indigo-600",
      baseBg: "bg-indigo-50/40",
      shadowColor: "shadow-indigo-500/20",
      iconColor: "text-indigo-600",
      section: "recent-changes" as const,
    },
  ];

  if (loadingMetrics && !metrics) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-secondary-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
            <p className="text-secondary-600">
              Location-wise counts, items at vendor, and pending PI/PO at a glance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            const isExpanded = expandedSection === stat.section;
            return (
              <div
                key={stat.title}
                className="h-full"
              >
                <div
                  onClick={() => toggleSection(stat.section)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl cursor-pointer group h-full transition-all duration-300 border border-secondary-100/50",
                    stat.baseBg,
                    `shadow-xl ${stat.shadowColor}`,
                    isExpanded && `ring-2 ring-primary-400 bg-gradient-to-br ${stat.gradient}`
                  )}
                >
                  <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className={cn(
                          "text-sm font-medium transition-colors",
                          isExpanded ? "text-white" : "text-secondary-500"
                        )}>
                          {stat.title}
                        </p>
                        <h3 className={cn(
                          "text-4xl font-bold transition-colors tracking-tight",
                          isExpanded ? "text-white" : "text-text"
                        )}>
                          {stat.value}
                        </h3>
                        <p className={cn(
                          "text-xs mt-1 flex items-center gap-1 transition-colors",
                          isExpanded ? "text-white/90" : "text-secondary-400"
                        )}>
                          {isExpanded ? (
                            <>Collapse <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>View table <ChevronDown className="w-3 h-3" /></>
                          )}
                        </p>
                      </div>
                      <div className={cn(
                        "p-3 rounded-xl transition-all",
                        isExpanded ? "bg-white/20" : "bg-secondary-50"
                      )}>
                        <Icon className={cn(
                          "w-6 h-6",
                          isExpanded ? "text-white" : stat.iconColor
                        )} />
                      </div>
                    </div>
                  </CardContent>
                </div>
              </div>
            );
          })}
        </div>

        {/* Location Wise Table */}
        {expandedSection === "location" && (
          <div>
            <Card className="shadow-lg border border-secondary-200">
              <div className="border-b border-secondary-200 px-4 py-3">
                <h2 className="text-xl font-bold text-text">Die/Pattern Counts At Location</h2>
                <p className="text-sm text-secondary-500 mt-0.5">
                  Items currently at each location (opened company only). Select a location and apply filters.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_5.5rem_auto] gap-4 items-end">
                  <div className="flex flex-col">
                    <label className={filterLabelClass}>Search</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-4 w-4 text-secondary-400 pointer-events-none" />
                      <Input
                        type="search"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Name, drawing…"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={filterLabelClass}>Item Type</label>
                    <select
                      value={locationItemTypeId === "" ? "" : locationItemTypeId}
                      onChange={(e) => setLocationItemTypeId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={selectClass}
                    >
                      <option value="">All</option>
                      {itemTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={filterLabelClass}>Item Condition</label>
                    <select
                      value={locationStatusId === "" ? "" : locationStatusId}
                      onChange={(e) => setLocationStatusId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={selectClass}
                    >
                      <option value="">All</option>
                      {itemStatuses.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                    <label className={filterLabelClass}>Item</label>
                    <MultiSelectSearch
                      options={itemOptions}
                      value={locationItemIds as (number | string)[]}
                      onChange={(v) => setLocationItemIds(v as number[])}
                      placeholder="Select item"
                      searchPlaceholder="Search…"
                    />
                  </div>
                  <div>
                    <label className={filterLabelClass}>Current Process</label>
                    <select
                      value={locationProcessId === "" ? "" : locationProcessId}
                      onChange={(e) => setLocationProcessId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={selectClass}
                    >
                      <option value="">All</option>
                      {PROCESS_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 shrink-0 max-w-[5.5rem]">
                    <PageSizeSelect
                      value={dashboardPageSize}
                      onChange={(v) => { setDashboardPageSize(v); setDashboardPage(1); }}
                    />
                  </div>
                  {hasAnyActive([locationSearch, locationItemTypeId, locationStatusId, locationProcessId, locationItemIds]) && (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocationSearch("");
                          setLocationItemTypeId("");
                          setLocationStatusId("");
                          setLocationProcessId("");
                          setLocationItemIds([]);
                          setDashboardPage(1);
                        }}
                        className="h-9 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleExport("location")}
                    disabled={loadingLocationWise || (typeof locationId !== "number")}
                    className="shadow-sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </div>
              <div className="border-t border-secondary-100 overflow-x-auto">
                {typeof locationId !== "number" ? (
                  <div className="py-12 text-center text-secondary-500">
                    Select a location to view items at that location.
                  </div>
                ) : loadingLocationWise ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                    <p className="mt-4 text-secondary-600">Loading...</p>
                  </div>
                ) : locationWiseItems.length > 0 ? (
                  <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider w-12 text-center">#</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Main Part</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Current Name</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Drawing No</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Item Type</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Condition</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Process</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationWiseItems.map((row, idx) => (
                        <TableRow key={row.id} className="border-b border-secondary-100 transition-all hover:bg-primary-50/30">
                          <TableCell className="px-4 py-3 text-center text-secondary-600">{locationWiseItems.length - idx}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.mainPartName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.currentName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 font-mono text-sm">{row.drawingNo ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.itemTypeName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getConditionColor(row.statusName ?? undefined)}`}>
                              {row.statusName ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                              getProcessColor(row.currentProcess)
                            )}>
                              {formatProcess(row.currentProcess)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {row.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Active</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Inactive</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {locationWiseTotalCount > PAGINATION_VISIBLE_THRESHOLD && (
                    <TablePagination
                      page={dashboardPage}
                      pageSize={dashboardPageSize}
                      totalCount={locationWiseTotalCount}
                      onPageChange={setDashboardPage}
                    />
                  )}
                  </>
                ) : (
                  <div className="py-12 text-center text-secondary-500">
                    No items at this location match your filters.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Recent Item Name Changes */}
        {expandedSection === "recent-changes" && (
          <div>
            <Card className="shadow-lg border border-secondary-200">
              <div className="border-b border-secondary-200 px-4 py-3 flex flex-col gap-1">
                <h2 className="text-xl font-bold text-text">Recent Item Name Changes</h2>
                <p className="text-sm text-secondary-500">
                  Latest display name changes with traceability to Job Work, Inward, and QC entries.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-end">
                  <div className="flex flex-col">
                    <label className={filterLabelClass}>Search</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-4 w-4 text-secondary-400 pointer-events-none" />
                      <Input
                        type="search"
                        value={recentSearch}
                        onChange={(e) => setRecentSearch(e.target.value)}
                        placeholder="Item, JW/Inward/QC no…"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={filterLabelClass}>From date</label>
                    <DatePicker
                      value={recentDateFrom || undefined}
                      onChange={(date) => setRecentDateFrom(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                  </div>
                  <div>
                    <label className={filterLabelClass}>To date</label>
                    <DatePicker
                      value={recentDateTo || undefined}
                      onChange={(date) => setRecentDateTo(date ? format(date, "yyyy-MM-dd") : "")}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    {hasAnyActive([recentSearch, recentDateFrom, recentDateTo]) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRecentSearch("");
                          setRecentDateFrom("");
                          setRecentDateTo("");
                        }}
                        className="h-9 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        Clear
                      </Button>
                    )}
                    <Button onClick={() => handleExport("recent-changes")} className="shadow-sm h-9 px-4 text-xs">
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </div>
              <div className="border-t border-secondary-100 overflow-x-auto">
                {loadingRecentChanges ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                    <p className="mt-4 text-secondary-600">Loading recent changes...</p>
                  </div>
                ) : (recentChangesData?.data?.length ?? 0) > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider whitespace-nowrap">
                          Change Date/Time
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          Item
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          Old Name
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          New Name
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          Revert
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          Job Work
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          Inward
                        </TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider whitespace-nowrap">
                          QC
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentChangesData?.data?.map((row, idx) => (
                        <TableRow key={`${row.itemId}-${row.changedAt}-${idx}`} className="border-b border-secondary-100 hover:bg-primary-50/30">
                          <TableCell className="px-4 py-3 text-secondary-700 whitespace-nowrap">
                            {formatDateTime(row.changedAt)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-700">
                            <div className="flex flex-col">
                              <span className="font-medium text-text">{row.mainPartName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.oldName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-900 font-semibold">{row.newName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 whitespace-nowrap">
                            {row.revert ? (
                              <span className="text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded text-xs" title={row.revert}>
                                {row.revert}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 whitespace-nowrap">
                            {row.jobWorkNo ? (
                              <>
                                <span className="font-mono text-xs">{row.jobWorkNo}</span>
                                {row.jobWorkDate && (
                                  <div className="text-[11px] text-secondary-500">{formatDateTime(row.jobWorkDate)}</div>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 whitespace-nowrap">
                            {row.inwardNo ? (
                              <>
                                <span className="font-mono text-xs">{row.inwardNo}</span>
                                {row.inwardDate && (
                                  <div className="text-[11px] text-secondary-500">{formatDateTime(row.inwardDate)}</div>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 whitespace-nowrap">
                            {row.qcNo ? (
                              <>
                                <span className="font-mono text-xs">{row.qcNo}</span>
                                {row.qcDate && (
                                  <div className="text-[11px] text-secondary-500">{formatDateTime(row.qcDate)}</div>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-secondary-500">
                    No recent name changes match your filters.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Patterns at Vendor Table */}
        {expandedSection === "at-vendor" && (
          <div>
            <Card className="shadow-lg border border-secondary-200">
              <div className="border-b border-secondary-200 px-4 py-3">
                <h2 className="text-xl font-bold text-text">Patterns at Vendor</h2>
                <p className="text-sm text-secondary-500 mt-0.5">
                  Die and pattern currently at vendor (In Jobwork / At Vendor). Filter by vendor, item, and type.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_5.5rem_auto_auto] gap-4 items-end">
                  <div className="flex flex-col">
                    <label className={filterLabelClass}>Search</label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-4 w-4 text-secondary-400 pointer-events-none" />
                      <Input
                        type="search"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        placeholder="Name, drawing…"
                        className={cn(inputClass, "pl-9")}
                      />
                    </div>
                  </div>
                  <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                    <label className={filterLabelClass}>Vendor</label>
                    <MultiSelectSearch
                      options={vendorOptions}
                      value={vendorIds as (number | string)[]}
                      onChange={(v) => setVendorIds(v as number[])}
                      placeholder="Select vendor"
                      searchPlaceholder="Search…"
                    />
                  </div>
                  <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                    <label className={filterLabelClass}>Item</label>
                    <MultiSelectSearch
                      options={itemOptions}
                      value={atVendorItemIds as (number | string)[]}
                      onChange={(v) => setAtVendorItemIds(v as number[])}
                      placeholder="Select item"
                      searchPlaceholder="Search…"
                    />
                  </div>
                  <div>
                    <label className={filterLabelClass}>Item Type</label>
                    <select
                      value={atVendorItemTypeId === "" ? "" : atVendorItemTypeId}
                      onChange={(e) => setAtVendorItemTypeId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={selectClass}
                    >
                      <option value="">All</option>
                      {itemTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20 shrink-0 max-w-[5.5rem]">
                    <PageSizeSelect
                      value={dashboardPageSize}
                      onChange={(v) => { setDashboardPageSize(v); setDashboardPage(1); }}
                    />
                  </div>
                  {hasAnyActive([vendorSearch, vendorIds, atVendorItemIds, atVendorItemTypeId]) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setVendorSearch("");
                        setVendorIds([]);
                        setAtVendorItemIds([]);
                        setAtVendorItemTypeId("");
                        setDashboardPage(1);
                      }}
                      className="h-9 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                    >
                      <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      Clear Filter
                    </Button>
                  )}
                  <div className="flex justify-end">
                    <Button onClick={() => handleExport("at-vendor")} disabled={loadingAtVendor} className="shadow-sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </div>
              <div className="border-t border-secondary-100 overflow-x-auto">
                {loadingAtVendor ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                    <p className="mt-4 text-secondary-600">Loading...</p>
                  </div>
                ) : itemsAtVendor.length > 0 ? (
                  <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider w-12 text-center">#</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Vendor</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Main Part</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Current Name</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Drawing No</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Item Type</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Process</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsAtVendor.map((row, idx) => (
                        <TableRow key={row.id} className="border-b border-secondary-100 transition-all hover:bg-primary-50/30">
                          <TableCell className="px-4 py-3 text-center text-secondary-600">{itemsAtVendor.length - idx}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.vendorName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.mainPartName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.currentName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 font-mono text-sm">{row.drawingNo ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.itemTypeName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                              getProcessColor(row.currentProcess)
                            )}>
                              {formatProcess(row.currentProcess)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {atVendorTotalCount > PAGINATION_VISIBLE_THRESHOLD && (
                    <TablePagination
                      page={dashboardPage}
                      pageSize={dashboardPageSize}
                      totalCount={atVendorTotalCount}
                      onPageChange={setDashboardPage}
                    />
                  )}
                  </>
                ) : (
                  <div className="py-12 text-center text-secondary-500">
                    No patterns at vendor match your filters.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Pending PI Table */}
        {
          expandedSection === "pending-pi" && (
            <div>
              <Card className="shadow-lg border border-secondary-200">
                <div className="border-b border-secondary-200 px-4 py-3 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-text">Pending PI</h2>
                    <p className="text-sm text-secondary-500 mt-0.5">
                      Purchase indents awaiting approval. Approve or reject from here.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleExport("pending-pi")} 
                    disabled={loadingPendingPI} 
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_5.5rem_auto] gap-4 items-end">
                    <div className="flex flex-col">
                      <label className={filterLabelClass}>Search</label>
                      <div className="relative flex items-center">
                        <Search className="absolute left-3 h-4 w-4 text-secondary-400 pointer-events-none" />
                        <Input
                          type="search"
                          value={pendingPISearch}
                          onChange={(e) => setPendingPISearch(e.target.value)}
                          placeholder="PI No., creator, remarks…"
                          className={cn(inputClass, "pl-9")}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={filterLabelClass}>Created From</label>
                      <DatePicker
                        value={pendingPIDateFrom}
                        onChange={(d) => setPendingPIDateFrom(d ? format(d, "yyyy-MM-dd") : "")}
                        className="h-9 w-full border-secondary-200"
                        placeholder="From"
                        clearable
                      />
                    </div>
                    <div>
                      <label className={filterLabelClass}>Created To</label>
                      <DatePicker
                        value={pendingPIDateTo}
                        onChange={(d) => setPendingPIDateTo(d ? format(d, "yyyy-MM-dd") : "")}
                        className="h-9 w-full border-secondary-200"
                        placeholder="To"
                        clearable
                      />
                    </div>
                    <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                      <label className={filterLabelClass}>Item</label>
                      <MultiSelectSearch
                        options={itemOptions}
                        value={pendingPIItemIds as (number | string)[]}
                        onChange={(v) => setPendingPIItemIds(v as number[])}
                        placeholder="Select item"
                        searchPlaceholder="Search…"
                      />
                    </div>
                    <div>
                      <label className={filterLabelClass}>Status</label>
                      <select
                        value={pendingPIStatus || "All"}
                        onChange={(e) => setPendingPIStatus(e.target.value)}
                        className={selectClass}
                      >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="w-20 shrink-0 max-w-[5.5rem]">
                      <PageSizeSelect
                        value={dashboardPageSize}
                        onChange={(v) => { setDashboardPageSize(v); setDashboardPage(1); }}
                      />
                    </div>
                    {hasAnyActive([
                      pendingPISearch,
                      pendingPIDateFrom,
                      pendingPIDateTo,
                      pendingPIItemIds,
                      pendingPIStatus && pendingPIStatus !== "All" ? pendingPIStatus : "",
                    ]) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingPISearch("");
                          setPendingPIDateFrom("");
                          setPendingPIDateTo("");
                          setPendingPIItemIds([]);
                          setPendingPIStatus("All");
                          setDashboardPage(1);
                        }}
                        className="h-9 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </div>
                <div className="border-t border-secondary-100 overflow-x-auto">
                  {loadingPendingPI ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : pendingPIList.length > 0 ? (
                    <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                          <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-10 px-0 text-center"></TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider text-center">Sr.No</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider">PI No</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Date</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-center">Status</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Type</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created By</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPIList.map((pi, idx) => (
                          <Fragment key={pi.id}>
                            <TableRow
                              className={cn(
                                "border-b border-secondary-100 transition-all cursor-pointer group whitespace-nowrap",
                                expandedPIId === pi.id ? "bg-primary-50/60" : "hover:bg-primary-50/30",
                                !pi.isActive && "bg-secondary-50/50 opacity-75"
                              )}
                              onClick={() => setExpandedPIId(expandedPIId === pi.id ? null : pi.id)}
                            >
                              <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                <div className="flex items-center justify-center">
                                  <motion.div
                                    animate={{ rotate: expandedPIId === pi.id ? 90 : 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    style={{ originX: "50%", originY: "50%" }}
                                    className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                      expandedPIId === pi.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-secondary-100 group-hover:text-secondary-600"
                                    )}
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </motion.div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">
                                {String(pendingPIList.length - pendingPIList.indexOf(pi)).padStart(2, '0')}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-bold text-primary-700 text-sm uppercase tracking-tight">
                                {pi.piNo}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-600 font-medium text-xs">
                                {formatDateTime(pi.createdAt)}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center">
                                {String(pi.status).toLowerCase() === "approved" || pi.status === PurchaseIndentStatus.Approved ? (
                                  <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-green-200 shadow-sm">
                                    Approved
                                  </span>
                                ) : String(pi.status).toLowerCase() === "rejected" || pi.status === PurchaseIndentStatus.Rejected ? (
                                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-200 shadow-sm">
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200 shadow-sm">
                                    Pending Approval
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-600 text-sm font-medium">
                                {String(pi.type ?? "—")}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-500 text-sm font-medium">
                                {pi.creatorName ?? "—"}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  {permissions?.approvePI && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="min-w-[12rem] py-1">
                                        {String(pi.status).toLowerCase() !== "approved" ? (
                                          <>
                                            <DropdownMenuItem onClick={() => setApprovalTarget({ type: "pi", pi, action: "approve" })} className="flex items-center gap-2 py-2">
                                              <CheckCircle className="w-4 h-4 text-green-600" />
                                              Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setApprovalTarget({ type: "pi", pi, action: "reject" })} className="flex items-center gap-2 py-2">
                                              <XCircle className="w-4 h-4 text-rose-600" />
                                              Reject
                                            </DropdownMenuItem>
                                          </>
                                        ) : (
                                          <DropdownMenuItem onClick={() => setApprovalTarget({ type: "pi", pi, action: "revert" })} className="flex items-center gap-2 py-2">
                                            <Ban className="w-4 h-4 text-rose-500" />
                                            Revert to Pending
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600" onClick={() => setPreviewPIId(pi.id)} title="Preview">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {permissions?.editPI && pi.isActive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                      onClick={() => { setEditPITarget(pi); setEditPIDialogOpen(true); }}
                                      title="Edit PI"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            <AnimatePresence>
                              {expandedPIId === pi.id && (
                                <TableRow key={`expand-${pi.id}`} className="hover:bg-transparent border-b border-secondary-100">
                                  <td colSpan={8} className="p-0 border-none max-w-0">
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-secondary-50/10 w-full">
                                      <div className="px-4 pb-4 pt-4">
                                        <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm w-full">
                                          <div className="bg-secondary-50/50 px-4 py-2 border-b border-secondary-100 flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Indent Items</p>
                                            <span className="text-[10px] font-medium text-secondary-400">Total: {pi.items?.length || 0} item(s)</span>
                                          </div>
                                          <div className="overflow-x-auto">
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="bg-white border-b border-secondary-100 hover:bg-white">
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider w-14 text-center">SR.</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">Item Description</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">Type</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">Drawing No</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">PO No</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">Inward No</TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center pr-4">QC No</TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {(pi.items || []).map((item: any, iidx: number) => (
                                                  <TableRow key={item.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 whitespace-nowrap">
                                                    <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">{iidx + 1}</TableCell>
                                                    <TableCell className="px-4 py-2">
                                                      <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-secondary-900 text-[13px] tracking-tight">{item.currentName}</span>
                                                        <span className="text-[11px] text-secondary-500 font-medium">{item.mainPartName}</span>
                                                      </div>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-2">
                                                      <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px] uppercase">{item.itemTypeName || "—"}</span>
                                                    </TableCell>
                                                    <TableCell className="px-4 py-2 text-center text-secondary-600 text-[12px]">{item.drawingNo || "—"}</TableCell>
                                                    <TableCell className="px-4 py-2 text-center">
                                                      {item.poNo && item.poNo !== "-" ? (
                                                        <span className="bg-indigo-50 px-2.5 py-1 rounded-md text-indigo-700 border border-indigo-100 uppercase text-[10px] font-black tracking-wider">{item.poNo}</span>
                                                      ) : (
                                                        <span className="text-secondary-300 italic text-[11px]">Pending PO</span>
                                                      )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-2 text-center">
                                                      {item.inwardNo ? (
                                                        <span className="bg-amber-50 px-2.5 py-1 rounded-md text-amber-700 border border-amber-100 uppercase text-[10px] font-black tracking-wider">{item.inwardNo}</span>
                                                      ) : (
                                                        <span className="text-secondary-300 italic text-[11px]">Pending Inward</span>
                                                      )}
                                                    </TableCell>
                                                    <TableCell className="px-4 py-2 text-center pr-4">
                                                      {item.qcNo ? (
                                                        <span className="bg-emerald-50 px-2.5 py-1 rounded-md text-emerald-700 border border-emerald-100 uppercase text-[10px] font-black tracking-wider">{item.qcNo}</span>
                                                      ) : (
                                                        <span className="text-secondary-300 italic text-[11px]">Pending QC</span>
                                                      )}
                                                    </TableCell>
                                                  </TableRow>
                                                ))}
                                              </TableBody>
                                            </Table>
                                          </div>
                                          {pi.remarks && (
                                            <div className="mx-4 mb-4 mt-3 p-3 bg-secondary-50/50 rounded-xl border border-secondary-200/50 italic text-[12px] text-secondary-500">
                                              <span className="font-black not-italic uppercase text-[10px] text-secondary-400 block mb-1 tracking-widest">Indent Remarks</span>
                                              {pi.remarks}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </TableRow>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                    {pendingPITotalCount > PAGINATION_VISIBLE_THRESHOLD && (
                      <TablePagination
                        page={dashboardPage}
                        pageSize={dashboardPageSize}
                        totalCount={pendingPITotalCount}
                        onPageChange={setDashboardPage}
                      />
                    )}
                    </>
                  ) : (
                    <div className="py-12 text-center text-secondary-500">
                      No pending PIs match your filters.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        {/* Pending PO Table */}
        {
          expandedSection === "pending-po" && (
            <div>
              <Card className="shadow-lg border border-secondary-200">
                <div className="border-b border-secondary-200 px-4 py-3 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-text">Pending PO</h2>
                    <p className="text-sm text-secondary-500 mt-0.5">
                      Purchase orders awaiting approval. Approve or reject from here.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleExport("pending-po")} 
                    disabled={loadingPendingPO} 
                    className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_5.5rem_auto] gap-4 items-end">
                    <div className="flex flex-col">
                      <label className={filterLabelClass}>Search</label>
                      <div className="relative flex items-center">
                        <Search className="absolute left-3 h-4 w-4 text-secondary-400 pointer-events-none" />
                        <Input
                          type="search"
                          value={pendingPOSearch}
                          onChange={(e) => setPendingPOSearch(e.target.value)}
                          placeholder="PO No., vendor, remarks…"
                          className={cn(inputClass, "pl-9")}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={filterLabelClass}>PO Date From</label>
                      <DatePicker
                        value={pendingPODateFrom}
                        onChange={(d) => setPendingPODateFrom(d ? format(d, "yyyy-MM-dd") : "")}
                        className="h-9 w-full border-secondary-200"
                        placeholder="From"
                        clearable
                      />
                    </div>
                    <div>
                      <label className={filterLabelClass}>PO Date To</label>
                      <DatePicker
                        value={pendingPODateTo}
                        onChange={(d) => setPendingPODateTo(d ? format(d, "yyyy-MM-dd") : "")}
                        className="h-9 w-full border-secondary-200"
                        placeholder="To"
                        clearable
                      />
                    </div>
                    <div className="[&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                      <label className={filterLabelClass}>Vendor</label>
                      <MultiSelectSearch
                        options={vendorOptions}
                        value={pendingPOVendorIds as (number | string)[]}
                        onChange={(v) => setPendingPOVendorIds(v as number[])}
                        placeholder="Select vendor"
                        searchPlaceholder="Search…"
                      />
                    </div>
                    <div>
                      <label className={filterLabelClass}>Status</label>
                      <select
                        value={pendingPOStatus || "All"}
                        onChange={(e) => setPendingPOStatus(e.target.value)}
                        className={selectClass}
                      >
                        <option value="All">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="w-20 shrink-0 max-w-[5.5rem]">
                      <PageSizeSelect
                        value={dashboardPageSize}
                        onChange={(v) => { setDashboardPageSize(v); setDashboardPage(1); }}
                      />
                    </div>
                    {hasAnyActive([
                      pendingPOSearch,
                      pendingPODateFrom,
                      pendingPODateTo,
                      pendingPOVendorIds,
                      pendingPOStatus && pendingPOStatus !== "All" ? pendingPOStatus : "",
                    ]) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingPOSearch("");
                          setPendingPODateFrom("");
                          setPendingPODateTo("");
                          setPendingPOVendorIds([]);
                          setPendingPOStatus("All");
                          setDashboardPage(1);
                        }}
                        className="h-9 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                        Clear Filter
                      </Button>
                    )}
                  </div>
                </div>
                <div className="border-t border-secondary-100 overflow-x-auto">
                  {loadingPendingPO ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : pendingPOList.length > 0 ? (
                    <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                          <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-10 px-0 text-center"></TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider text-center">Sr.No</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider">PO No</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">PO Date</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Vendor</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-center">Status</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created By</TableHead>
                          <TableHead className="h-10 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPOList.map((po, idx) => (
                          <Fragment key={po.id}>
                            <TableRow
                              className={cn(
                                "border-b border-secondary-100 transition-all cursor-pointer group whitespace-nowrap",
                                expandedPOId === po.id ? "bg-primary-50/60" : "hover:bg-primary-50/30",
                                !po.isActive && "bg-secondary-50/50 opacity-75"
                              )}
                              onClick={() => setExpandedPOId(expandedPOId === po.id ? null : po.id)}
                            >
                              <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                <div className="flex items-center justify-center">
                                  <motion.div
                                    animate={{ rotate: expandedPOId === po.id ? 90 : 0 }}
                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                    style={{ originX: "50%", originY: "50%" }}
                                    className={cn(
                                      "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                      expandedPOId === po.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-secondary-100 group-hover:text-secondary-600"
                                    )}
                                  >
                                    <ChevronRight className="w-5 h-5" />
                                  </motion.div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">
                                {String(pendingPOList.length - idx).padStart(2, '0')}
                              </TableCell>
                              <TableCell className="px-4 py-3 font-bold text-primary-700 text-sm">
                                {po.poNo}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-600 font-medium text-xs">
                                {formatDateTime(po.createdAt)}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-700 font-semibold text-sm">
                                {po.vendorName ?? "—"}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-center">
                                {String(po.status).toLowerCase() === "approved" || po.status === PoStatus.Approved ? (
                                  <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-green-200 shadow-sm">
                                    Approved
                                  </span>
                                ) : String(po.status).toLowerCase() === "rejected" || po.status === PoStatus.Rejected ? (
                                  <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-rose-200 shadow-sm">
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-200 shadow-sm">
                                    Pending Approval
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-secondary-500 text-sm font-medium">
                                {po.creatorName ?? "—"}
                              </TableCell>
                              <TableCell className="px-4 py-3 text-right pr-6">
                                <div className="flex items-center justify-end gap-1">
                                  {permissions?.approvePO && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg" onClick={(e) => e.stopPropagation()}>
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="min-w-[12rem] py-1">
                                        {(String(po.status).toLowerCase() !== "approved" && po.status !== PoStatus.Approved) ? (
                                          <>
                                            <DropdownMenuItem onClick={() => setApprovalTarget({ type: "po", po, action: "approve" })} className="flex items-center gap-2 py-2">
                                              <CheckCircle className="w-4 h-4 text-green-600" />
                                              Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setApprovalTarget({ type: "po", po, action: "reject" })} className="flex items-center gap-2 py-2">
                                              <XCircle className="w-4 h-4 text-rose-600" />
                                              Reject
                                            </DropdownMenuItem>
                                          </>
                                        ) : (
                                          <DropdownMenuItem onClick={() => setApprovalTarget({ type: "po", po, action: "revert" })} className="flex items-center gap-2 py-2">
                                            <Ban className="w-4 h-4 text-rose-500" />
                                            Revert to Pending
                                          </DropdownMenuItem>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600" onClick={(e) => { e.stopPropagation(); setPreviewPOId(po.id); }} title="Preview">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {permissions?.editPO && po.isActive && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                      onClick={(e) => { e.stopPropagation(); setEditPOTarget(po); setEditPODialogOpen(true); }}
                                      title="Edit PO"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            <AnimatePresence>
                              {expandedPOId === po.id && (
                                <TableRow className="hover:bg-transparent border-b border-secondary-100">
                                  <td colSpan={8} className="p-0 border-none max-w-0">
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3, ease: "easeInOut" }}
                                      className="overflow-hidden bg-secondary-50/10 w-full"
                                    >
                                      <div className="px-4 pb-4 pt-4">
                                        <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm w-full">
                                          <div className="bg-secondary-50/50 px-4 py-2 border-b border-secondary-100 flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">
                                              Purchase Order Items
                                            </p>
                                            <span className="text-[10px] font-medium text-secondary-400">
                                              Total Items: {po.items?.length || 0}
                                            </span>
                                          </div>
                                          <div className="overflow-x-auto">
                                            <Table>
                                              <TableHeader>
                                                <TableRow className="bg-white border-b border-secondary-100 hover:bg-white">
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap w-12 text-center">
                                                    SR.NO
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    PI NO.
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    PI DATE
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    ITEM DESCRIPTION
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    TYPE
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    DRAWING / REV
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    INWARD NO.
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    INWARD DATE
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">
                                                    QC NO.
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    QC DATE
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">
                                                    MATERIAL
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center whitespace-nowrap">
                                                    GST %
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right whitespace-nowrap">
                                                    UNIT RATE (₹)
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right whitespace-nowrap">
                                                    TAX
                                                  </TableHead>
                                                  <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right whitespace-nowrap pr-6">
                                                    TOTAL
                                                  </TableHead>
                                                </TableRow>
                                              </TableHeader>
                                              <TableBody>
                                                {po.items?.map((item, idx) => {
                                                  const gstPct = po.gstPercent ?? 18;
                                                  const tax = ((item.rate ?? 0) * gstPct) / 100;
                                                  const total = (item.rate ?? 0) + tax;
                                                  return (
                                                    <TableRow
                                                      key={item.id}
                                                      className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 whitespace-nowrap"
                                                    >
                                                      <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">
                                                        {idx + 1}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-700 font-semibold text-[13px]">
                                                        {item.piNo ?? "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px]">
                                                        {item.piDate ? formatDateTime(item.piDate) : "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2">
                                                        <div className="flex flex-col min-w-0">
                                                          <span className="font-bold text-secondary-900 text-[13px] tracking-tight">
                                                            {item.currentName ?? item.mainPartName ?? "—"}
                                                          </span>
                                                          {item.currentName && item.mainPartName && item.currentName !== item.mainPartName && (
                                                            <span className="text-[11px] text-secondary-500 font-medium tracking-tight">
                                                              {item.mainPartName}
                                                            </span>
                                                          )}
                                                        </div>
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-600 text-[13px] font-medium">
                                                        {item.itemTypeName ?? "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2">
                                                        <div className="flex flex-col min-w-0">
                                                          <span className="font-bold text-secondary-800 text-[13px] tracking-tight">
                                                            {item.drawingNo ?? "N/A"}
                                                          </span>
                                                          <span className="text-[11px] font-semibold text-secondary-400">
                                                            {item.revisionNo ? `R${item.revisionNo}` : "R0"}
                                                          </span>
                                                        </div>
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2">
                                                        {item.inwardNo ? (
                                                          <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px]">
                                                            {item.inwardNo}
                                                          </span>
                                                        ) : (
                                                          <span className="text-secondary-400 text-[11px] italic font-medium">Not Inwarded</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px]">
                                                        {item.inwardNo && item.inwardDate ? formatDateTime(item.inwardDate) : "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-center">
                                                        {item.qcNo ? (
                                                          <span className="inline-flex px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100 font-bold text-[11px]">
                                                            {item.qcNo}
                                                          </span>
                                                        ) : item.inwardNo ? (
                                                          <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[11px]">
                                                            Pending QC
                                                          </span>
                                                        ) : (
                                                          <span className="text-secondary-300 text-[11px]">—</span>
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px]">
                                                        {item.qcNo && item.qcDate ? formatDateTime(item.qcDate) : "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-secondary-600 text-[13px] font-medium">
                                                        {item.materialName ?? "—"}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-center text-[13px] font-medium text-secondary-500 tabular-nums">
                                                        {gstPct}%
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-right font-bold text-secondary-900 text-[13px] tabular-nums">
                                                        {((item.rate ?? 0)).toLocaleString(
                                                          undefined,
                                                          { minimumFractionDigits: 2 }
                                                        )}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-right text-secondary-500 text-[13px] font-medium tabular-nums">
                                                        ₹{formatRate(tax)}
                                                      </TableCell>
                                                      <TableCell className="px-4 py-2 text-right font-black text-secondary-900 text-[13px] tabular-nums pr-6">
                                                        ₹{formatRate(total)}
                                                      </TableCell>
                                                    </TableRow>
                                                  );
                                                })}
                                              </TableBody>
                                            </Table>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  </td>
                                </TableRow>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                    {pendingPOTotalCount > PAGINATION_VISIBLE_THRESHOLD && (
                      <TablePagination
                        page={dashboardPage}
                        pageSize={dashboardPageSize}
                        totalCount={pendingPOTotalCount}
                        onPageChange={setDashboardPage}
                      />
                    )}
                    </>
                  ) : (
                    <div className="py-12 text-center text-secondary-500">
                      No pending POs match your filters.
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )
        }

        {/* Approve / Reject Dialog */}
        <Dialog
          isOpen={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          title={
            approvalTarget?.action === "approve"
              ? (approvalTarget.type === "pi" ? "Approve Purchase Indent" : "Approve Purchase Order")
              : approvalTarget?.action === "reject"
                ? (approvalTarget?.type === "pi" ? "Reject Purchase Indent" : "Reject Purchase Order")
                : "Revert Purchase Indent"
          }
          size="sm"
        >
          <div className="space-y-4 font-sans">
            <p className="text-secondary-600">
              {approvalTarget?.action === "revert" ? (
                <>
                  Are you sure you want to revert {approvalTarget.type === "pi" ? "indent" : "order"} <span className="font-bold text-secondary-900">{approvalTarget.type === "pi" ? approvalTarget.pi.piNo : approvalTarget.po.poNo}</span> back to Pending? {approvalTarget.type === "pi" ? "No PO has been created from this indent." : "No inward has been recorded against this PO."} This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to{" "}
                  <span className={approvalTarget?.action === "approve" ? "text-green-600 font-bold uppercase" : "text-rose-600 font-bold uppercase"}>
                    {approvalTarget?.action}
                  </span>{" "}
                  {approvalTarget?.type === "pi" ? `indent ${approvalTarget.pi.piNo}` : `order ${approvalTarget?.po?.poNo}`}?
                  This action cannot be undone.
                </>
              )}
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setApprovalTarget(null)} className="flex-1 font-bold">
                Cancel
              </Button>
              <Button
                className={cn(
                  "flex-1 text-white font-bold",
                  approvalTarget?.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-rose-600 hover:bg-rose-700"
                )}
                onClick={() => {
                  if (!approvalTarget) return;
                  if (approvalTarget.type === "pi") {
                    if (approvalTarget.action === "approve") approvePIMutation.mutate(approvalTarget.pi.id);
                    else if (approvalTarget.action === "reject") rejectPIMutation.mutate(approvalTarget.pi.id);
                    else revertToPendingMutation.mutate(approvalTarget.pi.id);
                  } else {
                    if (approvalTarget.action === "approve") approvePOMutation.mutate(approvalTarget.po.id);
                    else if (approvalTarget.action === "reject") rejectPOMutation.mutate(approvalTarget.po.id);
                    else revertToPendingPOMutation.mutate(approvalTarget.po.id);
                  }
                }}
                disabled={
                  approvePIMutation.isPending ||
                  rejectPIMutation.isPending ||
                  approvePOMutation.isPending ||
                  rejectPOMutation.isPending ||
                  revertToPendingMutation.isPending ||
                  revertToPendingPOMutation.isPending
                }
              >
                {approvePIMutation.isPending || rejectPIMutation.isPending || approvePOMutation.isPending || rejectPOMutation.isPending || revertToPendingMutation.isPending || revertToPendingPOMutation.isPending
                  ? "Processing..."
                  : approvalTarget?.action === "revert" ? "Revert to Pending" : `Confirm ${approvalTarget?.action === "approve" ? "Approve" : "Reject"}`}
              </Button>
            </div>
          </div>
        </Dialog>

        {
          previewPIId != null && (
            <PurchaseIndentPreviewModal piId={previewPIId} onClose={() => setPreviewPIId(null)} />
          )
        }
        {
          previewPOId != null && (
            <PurchaseOrderPreviewModal poId={previewPOId} onClose={() => setPreviewPOId(null)} />
          )
        }

        {
          editPIDialogOpen && (
            <PurchaseIndentDialog
              open={editPIDialogOpen}
              onOpenChange={(isOpen) => {
                setEditPIDialogOpen(isOpen);
                if (!isOpen) {
                  setEditPITarget(null);
                }
              }}
              indent={editPITarget as PurchaseIndent}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-pi"] });
              }}
            />
          )
        }
        {
          editPODialogOpen && (
            <PurchaseOrderDialog
              open={editPODialogOpen}
              onOpenChange={(isOpen) => {
                setEditPODialogOpen(isOpen);
                if (!isOpen) {
                  setEditPOTarget(null);
                }
              }}
              po={editPOTarget as PO}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["dashboard", "pending-po"] });
              }}
            />
          )
        }
      </div >
    </div >
  );
}
