"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import Link from "next/link";
import api from "@/lib/api";
import { DashboardMetrics, PurchaseIndent, PurchaseIndentStatus, PO, PoStatus } from "@/types";
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
  LayoutGrid,
  ClipboardList,
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
import { cn } from "@/lib/utils";

const filterLabelClass =
  "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
  "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
  "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

type ExpandedSection = "location" | "at-vendor" | "pending-pi" | "pending-po" | null;

interface LocationWiseItemRow {
  id: number;
  locationName: string;
  mainPartName: string;
  currentName?: string | null;
  drawingNo?: string | null;
  itemTypeName?: string | null;
  statusName?: string | null;
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

  const [approvalTarget, setApprovalTarget] = useState<
    { type: "pi"; pi: PurchaseIndent; action: "approve" | "reject" } | { type: "po"; po: PO; action: "approve" | "reject" }
    | null>(null);
  const [previewPIId, setPreviewPIId] = useState<number | null>(null);
  const [previewPOId, setPreviewPOId] = useState<number | null>(null);

  const debouncedLocationSearch = useDebouncedValue(locationSearch, 400);
  const debouncedVendorSearch = useDebouncedValue(vendorSearch, 400);
  const debouncedPendingPISearch = useDebouncedValue(pendingPISearch, 400);
  const debouncedPendingPOSearch = useDebouncedValue(pendingPOSearch, 400);

  const { data: metrics, isLoading: loadingMetrics } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics", locationId],
    queryFn: async () => {
      const response = await api.get("/dashboard/metrics", { params: { locationId: locationId || undefined } });
      return response.data.data;
    },
  });

  // No automatic selection - let user see "All Locations" by default if they prefer
  // or they can pick one.

  const locationWiseParams = useMemo(
    () => ({
      locationId: locationId === "" ? undefined : locationId,
      search: debouncedLocationSearch || undefined,
      itemTypeId: locationItemTypeId === "" ? undefined : locationItemTypeId,
      statusId: locationStatusId === "" ? undefined : locationStatusId,
      itemIds: locationItemIds.length ? locationItemIds.join(",") : undefined,
    }),
    [locationId, debouncedLocationSearch, locationItemTypeId, locationStatusId, locationItemIds]
  );

  const { data: locationWiseItems = [], isLoading: loadingLocationWise } = useQuery<
    LocationWiseItemRow[]
  >({
    queryKey: ["dashboard", "location-wise-items", locationWiseParams],
    queryFn: async () => {
      if (typeof locationWiseParams.locationId !== "number") return [];
      const res = await api.get("/dashboard/location-wise-items", {
        params: locationWiseParams,
      });
      return res.data?.data ?? [];
    },
    enabled: expandedSection === "location" && typeof locationWiseParams.locationId === "number",
  });

  const atVendorParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedVendorSearch || undefined,
      vendorIds: vendorIds.length ? vendorIds.join(",") : undefined,
      itemIds: atVendorItemIds.length ? atVendorItemIds.join(",") : undefined,
      itemTypeId: atVendorItemTypeId === "" ? undefined : atVendorItemTypeId,
    }),
    [locationId, debouncedVendorSearch, vendorIds, atVendorItemIds, atVendorItemTypeId]
  );

  const { data: itemsAtVendor = [], isLoading: loadingAtVendor } = useQuery<ItemAtVendorRow[]>({
    queryKey: ["dashboard", "items-at-vendor", atVendorParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/items-at-vendor", { params: atVendorParams });
      return res.data?.data ?? [];
    },
    enabled: expandedSection === "at-vendor",
  });

  const pendingPIParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedPendingPISearch || undefined,
      createdDateFrom: pendingPIDateFrom || undefined,
      createdDateTo: pendingPIDateTo || undefined,
      itemIds: pendingPIItemIds.length ? pendingPIItemIds.join(",") : undefined,
    }),
    [locationId, debouncedPendingPISearch, pendingPIDateFrom, pendingPIDateTo, pendingPIItemIds]
  );

  const { data: pendingPIList = [], isLoading: loadingPendingPI } = useQuery<PurchaseIndent[]>({
    queryKey: ["dashboard", "pending-pi", pendingPIParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/pending-pi", { params: pendingPIParams });
      return res.data?.data ?? [];
    },
    enabled: expandedSection === "pending-pi",
  });

  const pendingPOParams = useMemo(
    () => ({
      locationId: locationId || undefined,
      search: debouncedPendingPOSearch || undefined,
      poDateFrom: pendingPODateFrom || undefined,
      poDateTo: pendingPODateTo || undefined,
      vendorIds: pendingPOVendorIds.length ? pendingPOVendorIds.join(",") : undefined,
    }),
    [locationId, debouncedPendingPOSearch, pendingPODateFrom, pendingPODateTo, pendingPOVendorIds]
  );

  const { data: pendingPOList = [], isLoading: loadingPendingPO } = useQuery<PO[]>({
    queryKey: ["dashboard", "pending-po", pendingPOParams],
    queryFn: async () => {
      const res = await api.get("/dashboard/pending-po", { params: pendingPOParams });
      return res.data?.data ?? [];
    },
    enabled: expandedSection === "pending-po",
  });

  const { data: itemsList = [] } = useQuery<{ id: number; currentName?: string; mainPartName?: string }[]>({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
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

  const handleExport = useCallback(
    async (section: "location" | "at-vendor" | "pending-pi" | "pending-po") => {
      try {
        let url = "";
        const params =
          section === "location"
            ? locationWiseParams
            : section === "at-vendor"
              ? atVendorParams
              : section === "pending-pi"
                ? pendingPIParams
                : pendingPOParams;
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
                : "/dashboard/export/pending-po";
        const response = await api.get(endpoint, { responseType: "blob", params });
        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute(
          "download",
          `dashboard-${section}-${format(new Date(), "yyyy-MM-dd")}.xlsx`
        );
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
    ]
  );

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const statCards = [
    {
      title: locationId === "" ? "Total Die/Pattern (All Locations)" : `Total Die/Pattern (${metrics?.locationWiseCount?.find(l => l.locationId === locationId)?.locationName ?? "Selected Location"})`,
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
                <h2 className="text-xl font-bold text-text">Location Wise Die/Pattern Count</h2>
                <p className="text-sm text-secondary-500 mt-0.5">
                  Items currently at each location (opened company only). Select a location and apply filters.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider w-12 text-center">#</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Main Part</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Current Name</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Drawing No</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Item Type</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Condition</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationWiseItems.map((row, idx) => (
                        <TableRow key={row.id} className="border-b border-secondary-100 hover:bg-primary-50/50">
                          <TableCell className="px-4 py-3 text-center text-secondary-600">{locationWiseItems.length - idx}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.mainPartName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.currentName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 font-mono text-sm">{row.drawingNo ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.itemTypeName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.statusName ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-secondary-500">
                    No items at this location match your filters.
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                        <TableRow key={row.id} className="border-b border-secondary-100 hover:bg-primary-50/50">
                          <TableCell className="px-4 py-3 text-center text-secondary-600">{itemsAtVendor.length - idx}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.vendorName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 font-medium text-text">{row.mainPartName}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.currentName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 font-mono text-sm">{row.drawingNo ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{row.itemTypeName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              {row.currentProcess}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                <div className="border-b border-secondary-200 px-4 py-3">
                  <h2 className="text-xl font-bold text-text">Pending PI</h2>
                  <p className="text-sm text-secondary-500 mt-0.5">
                    Purchase indents awaiting approval. Approve or reject from here.
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                    <div className="flex justify-end">
                      <Button onClick={() => handleExport("pending-pi")} disabled={loadingPendingPI} className="shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="border-t border-secondary-100 overflow-x-auto">
                  {loadingPendingPI ? (
                    <div className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                      <p className="mt-4 text-secondary-600">Loading...</p>
                    </div>
                  ) : pendingPIList.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider">PI No</TableHead>
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Type</TableHead>
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Status</TableHead>
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created</TableHead>
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created By</TableHead>
                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right pr-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPIList.map((pi) => (
                          <TableRow key={pi.id} className="border-b border-secondary-100 hover:bg-primary-50/50">
                            <TableCell className="px-4 py-3 font-medium text-text">{pi.piNo}</TableCell>
                            <TableCell className="px-4 py-3 text-secondary-600">{pi.type}</TableCell>
                            <TableCell className="px-4 py-3">
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                                {pi.status}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-secondary-600 text-sm">
                              {format(new Date(pi.createdAt), "dd MMM yyyy, HH:mm")}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-secondary-600">{pi.creatorName ?? "—"}</TableCell>
                            <TableCell className="px-4 py-3 text-right pr-6">
                              <div className="flex items-center justify-end gap-1">
                                {permissions?.approvePI && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[12rem] py-1">
                                      <DropdownMenuItem onClick={() => setApprovalTarget({ type: "pi", pi, action: "approve" })} className="flex items-center gap-2 py-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => setApprovalTarget({ type: "pi", pi, action: "reject" })} className="flex items-center gap-2 py-2">
                                        <XCircle className="w-4 h-4 text-rose-600" />
                                        Reject
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPreviewPIId(pi.id)} title="Preview">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Link href="/purchase-indents">
                                  <Button variant="outline" size="sm" className="h-8 text-xs">
                                    Open PI
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
        {expandedSection === "pending-po" && (
          <div>
            <Card className="shadow-lg border border-secondary-200">
              <div className="border-b border-secondary-200 px-4 py-3">
                <h2 className="text-xl font-bold text-text">Pending PO</h2>
                <p className="text-sm text-secondary-500 mt-0.5">
                  Purchase orders awaiting approval. Approve or reject from here.
                </p>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
                  <div className="flex justify-end">
                    <Button onClick={() => handleExport("pending-po")} disabled={loadingPendingPO} className="shadow-sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </div>
              <div className="border-t border-secondary-100 overflow-x-auto">
                {loadingPendingPO ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                    <p className="mt-4 text-secondary-600">Loading...</p>
                  </div>
                ) : pendingPOList.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary-100 border-b border-primary-200 hover:bg-primary-100">
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider">PO No</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Vendor</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Status</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">Created By</TableHead>
                        <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPOList.map((po) => (
                        <TableRow key={po.id} className="border-b border-secondary-100 hover:bg-primary-50/50">
                          <TableCell className="px-4 py-3 font-medium text-text">{po.poNo}</TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{po.vendorName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                              {po.status}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600 text-sm">
                            {format(new Date(po.createdAt), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-secondary-600">{po.creatorName ?? "—"}</TableCell>
                          <TableCell className="px-4 py-3 text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              {permissions?.approvePO && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-[12rem] py-1">
                                    <DropdownMenuItem onClick={() => setApprovalTarget({ type: "po", po, action: "approve" })} className="flex items-center gap-2 py-2">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setApprovalTarget({ type: "po", po, action: "reject" })} className="flex items-center gap-2 py-2">
                                      <XCircle className="w-4 h-4 text-rose-600" />
                                      Reject
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPreviewPOId(po.id)} title="Preview">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Link href="/purchase-orders">
                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                  Open PO
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-secondary-500">
                    No pending POs match your filters.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Approve / Reject Dialog */}
        <Dialog
          isOpen={!!approvalTarget}
          onClose={() => setApprovalTarget(null)}
          title={approvalTarget?.action === "approve" ? (approvalTarget.type === "pi" ? "Approve Purchase Indent" : "Approve Purchase Order") : (approvalTarget?.type === "pi" ? "Reject Purchase Indent" : "Reject Purchase Order")}
          size="sm"
        >
          <div className="space-y-4 font-sans">
            <p className="text-secondary-600">
              Are you sure you want to{" "}
              <span className={approvalTarget?.action === "approve" ? "text-green-600 font-bold uppercase" : "text-rose-600 font-bold uppercase"}>
                {approvalTarget?.action}
              </span>{" "}
              {approvalTarget?.type === "pi" ? `indent ${approvalTarget.pi.piNo}` : `order ${approvalTarget?.po.poNo}`}?
              This action cannot be undone.
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
                    else rejectPIMutation.mutate(approvalTarget.pi.id);
                  } else {
                    if (approvalTarget.action === "approve") approvePOMutation.mutate(approvalTarget.po.id);
                    else rejectPOMutation.mutate(approvalTarget.po.id);
                  }
                }}
                disabled={
                  approvePIMutation.isPending ||
                  rejectPIMutation.isPending ||
                  approvePOMutation.isPending ||
                  rejectPOMutation.isPending
                }
              >
                {approvePIMutation.isPending || rejectPIMutation.isPending || approvePOMutation.isPending || rejectPOMutation.isPending
                  ? "Processing..."
                  : `Confirm ${approvalTarget?.action === "approve" ? "Approve" : "Reject"}`}
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
      </div>
    </div>
  );
}
