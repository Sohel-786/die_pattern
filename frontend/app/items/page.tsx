"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Edit2, Ban, CheckCircle,
    Download, History
} from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Item, OpeningHistoryEntry, ImportedItemSummary } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ItemDialog } from "@/components/masters/item-dialog";
import { ItemChangeDialog } from "@/components/masters/item-change-dialog";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types";

export default function ItemsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const canManage = permissions?.manageItem;

    const [search, setSearch] = useState("");
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isChangeOpen, setIsChangeOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [tabState, setTabState] = useState<"all" | "Die" | "Pattern" | "openingHistory">("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [materialFilter, setMaterialFilter] = useState<string>("all");
    const [ownerFilter, setOwnerFilter] = useState<string>("all");
    const [dialogKey, setDialogKey] = useState(0);
    const [inactiveTarget, setInactiveTarget] = useState<Item | null>(null);
    const [viewImportedForEntry, setViewImportedForEntry] = useState<OpeningHistoryEntry | null>(null);

    const queryClient = useQueryClient();
    const debouncedSearch = useDebouncedValue(search, 400);

    const {
        handleExport,
        handleImport,
        confirmImport,
        closePreview,
        exportLoading,
        importLoading,
        isPreviewOpen,
        validationData,
    } = useMasterExportImport("items", ["items"]);

    const { data: itemTypes = [] } = useQuery({ queryKey: ["item-types", "active"], queryFn: async () => (await api.get("/masters/item-types/active")).data.data });
    const { data: materials = [] } = useQuery({ queryKey: ["materials", "active"], queryFn: async () => (await api.get("/masters/materials/active")).data.data });
    const { data: statuses = [] } = useQuery({ queryKey: ["item-statuses", "active"], queryFn: async () => (await api.get("/masters/item-statuses/active")).data.data });
    const { data: owners = [] } = useQuery({ queryKey: ["owner-types", "active"], queryFn: async () => (await api.get("/masters/owner-types/active")).data.data });

    const { data: openingHistory = [] } = useQuery<OpeningHistoryEntry[]>({
        queryKey: ["items", "opening-history"],
        queryFn: async () => {
            const res = await api.get("/items/opening-history");
            return res.data.data ?? [];
        },
        enabled: tabState === "openingHistory",
    });

    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["items", debouncedSearch, activeFilter, tabState, statusFilter, materialFilter, ownerFilter],
        enabled: tabState !== "openingHistory",
        queryFn: async () => {
            const params: any = {};
            if (debouncedSearch) params.search = debouncedSearch;
            if (activeFilter === "active") params.isActive = true;
            if (activeFilter === "inactive") params.isActive = false;

            if (tabState !== "all") {
                const type = itemTypes.find((t: any) => t.name === tabState);
                if (type) params.itemTypeId = type.id;
            }

            if (statusFilter !== "all") params.statusId = statusFilter;
            if (materialFilter !== "all") params.materialId = materialFilter;
            if (ownerFilter !== "all") params.ownerTypeId = ownerFilter;

            const res = await api.get("/items", { params });
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/items", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Item registered successfully");
            setSelectedItem(null);
            setDialogKey(prev => prev + 1);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to register")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => {
            const id = selectedItem?.id ?? data.id;
            const payload = {
                id,
                currentName: data.currentName ?? undefined,
                itemTypeId: Number(data.itemTypeId) || 0,
                drawingNo: data.drawingNo ?? undefined,
                revisionNo: data.revisionNo ?? undefined,
                materialId: Number(data.materialId) || 0,
                ownerTypeId: Number(data.ownerTypeId) || 0,
                statusId: Number(data.statusId) || 0,
                currentHolderType: data.currentHolderType,
                currentPartyId: data.currentHolderType === "Vendor" ? (Number(data.currentPartyId) || null) : null,
                isActive: Boolean(data.isActive),
            };
            return api.put(`/items/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Information updated");
            setIsEntryOpen(false);
            setSelectedItem(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const changeProcessMutation = useMutation({
        mutationFn: (data: any) => api.post("/items/change-process", { ...data, itemId: selectedItem?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Change process recorded");
            setIsChangeOpen(false);
            setSelectedItem(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Process failed")
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.put(`/items/${id}`, { isActive }),
        onSuccess: (_, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            setInactiveTarget(null);
            toast.success(isActive ? "Item activated" : "Item deactivated");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const handleEdit = (item: Item) => {
        setSelectedItem(item);
        setIsEntryOpen(true);
    };

    const handleChangeProcess = (item: Item) => {
        setSelectedItem(item);
        setIsChangeOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsEntryOpen(true);
    };

    const toggleStatus = (item: Item) => {
        if (item.isActive) {
            setInactiveTarget(item);
        } else {
            toggleActiveMutation.mutate({ id: item.id, isActive: true });
        }
    };

    // We use the server-filtered items directly
    const filteredItems = items;

    const hasActiveFilters =
        search.trim() !== "" ||
        activeFilter !== "all" ||
        statusFilter !== "all" ||
        materialFilter !== "all" ||
        ownerFilter !== "all";

    const handleResetFilters = () => {
        setSearch("");
        setActiveFilter("all");
        setStatusFilter("all");
        setMaterialFilter("all");
        setOwnerFilter("all");
    };

    if (permissions && !permissions.viewMaster) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-secondary-900">Access Denied</h2>
                    <p className="text-secondary-500">You don&apos;t have permission to view Die &amp; Pattern Masters.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 text-sans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Die &amp; Pattern Masters</h1>
                    <p className="text-secondary-500 font-medium">Systematic repository for engineering dies and pattern assets</p>
                </div>
                <div className="flex items-center gap-2">
                    {canManage && (
                        <ExportImportButtons
                            onExport={handleExport}
                            onImport={handleImport}
                            exportLoading={exportLoading}
                            importLoading={importLoading}
                            inputId="items"
                        />
                    )}
                    {canManage && (
                        <button
                            onClick={handleAdd}
                            className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold px-4 py-2 rounded-lg flex items-center transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Die/Pattern Master
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-1 p-1 bg-secondary-100/50 rounded-xl w-fit border border-secondary-200 shadow-inner">
                <button
                    onClick={() => setTabState("all")}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${tabState === "all" ? 'bg-white text-primary-600 shadow-sm border border-secondary-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    All Assets
                </button>
                <button
                    onClick={() => setTabState("Die")}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${tabState === "Die" ? 'bg-white text-primary-600 shadow-sm border border-secondary-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    Dies
                </button>
                <button
                    onClick={() => setTabState("Pattern")}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${tabState === "Pattern" ? 'bg-white text-primary-600 shadow-sm border border-secondary-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    Patterns
                </button>
                <button
                    onClick={() => setTabState("openingHistory")}
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${tabState === "openingHistory" ? 'bg-white text-primary-600 shadow-sm border border-secondary-200' : 'text-secondary-500 hover:text-secondary-700'}`}
                >
                    <History className="w-3.5 h-3.5" />
                    Opening History
                </button>
            </div>

            {/* Opening Stock History view */}
            {tabState === "openingHistory" && (
                <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
                    <div className="px-6 py-4 border-b border-secondary-100">
                        <h3 className="text-lg font-bold text-secondary-900 mb-1">
                            Opening Stock History ({openingHistory.length})
                        </h3>
                        <p className="text-sm text-secondary-500 font-medium">Every item master import is recorded here. Download the full file or the &quot;Imported only&quot; Excel to see exactly which rows were imported. Use &quot;View imported&quot; to list them.</p>
                    </div>
                    <div className="table-container overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                            <thead>
                                <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                    <th className="px-4 py-3 font-semibold w-16 text-center uppercase tracking-wider text-xs">Sr.No</th>
                                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Import Date &amp; Time</th>
                                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">File Name</th>
                                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Items Imported</th>
                                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Imported By</th>
                                    <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {openingHistory.length > 0 ? (
                                    openingHistory.map((entry, idx) => (
                                        <tr
                                            key={entry.id}
                                            className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans"
                                        >
                                            <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{openingHistory.length - idx}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-[11px]">
                                                {new Date(entry.importedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                                            </td>
                                            <td className="px-4 py-3 text-secondary-700 font-bold text-[11px]">{entry.originalFileName}</td>
                                            <td className="px-4 py-3 text-center font-bold text-secondary-700 text-[11px]">
                                                {entry.totalRowsInFile != null && entry.totalRowsInFile > 0
                                                    ? `${entry.itemsImportedCount} / ${entry.totalRowsInFile}`
                                                    : entry.itemsImportedCount}
                                            </td>
                                            <td className="px-4 py-3 text-secondary-700 font-bold text-[11px]">{entry.importedBy ?? "—"}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={async () => {
                                                            try {
                                                                const res = await api.get(`/items/opening-history/${entry.id}/download`, { responseType: "blob" });
                                                                const disposition = res.headers?.["content-disposition"];
                                                                const match = disposition?.match(/filename="?([^";\n]+)"?/);
                                                                const filename = match?.[1] ?? entry.originalFileName ?? "opening-stock.xlsx";
                                                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                                                const link = document.createElement("a");
                                                                link.href = url;
                                                                link.setAttribute("download", filename);
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                link.remove();
                                                                window.URL.revokeObjectURL(url);
                                                                toast.success("File downloaded");
                                                            } catch (e: any) {
                                                                toast.error(e.response?.data?.message ?? "Download failed");
                                                            }
                                                        }}
                                                        className="h-8 px-3 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all flex items-center gap-1.5"
                                                        title="Download full Excel file"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Full file
                                                    </Button>
                                                    {entry.importedOnlyFilePath && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await api.get(`/items/opening-history/${entry.id}/download?variant=imported`, { responseType: "blob" });
                                                                    const baseName = (entry.originalFileName ?? "opening-stock").replace(/\.xlsx$/i, "");
                                                                    const filename = `${baseName}_imported.xlsx`;
                                                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                                                    const link = document.createElement("a");
                                                                    link.href = url;
                                                                    link.setAttribute("download", filename);
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    link.remove();
                                                                    window.URL.revokeObjectURL(url);
                                                                    toast.success("Imported items file downloaded");
                                                                } catch (e: any) {
                                                                    toast.error(e.response?.data?.message ?? "Download failed");
                                                                }
                                                            }}
                                                            className="h-8 px-3 text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-lg transition-all flex items-center gap-1.5"
                                                            title="Download Excel with only the successfully imported rows"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Imported only
                                                        </Button>
                                                    )}
                                                    {entry.importedItemsJson && (() => {
                                                        try {
                                                            const arr = JSON.parse(entry.importedItemsJson) as ImportedItemSummary[];
                                                            if (!Array.isArray(arr) || arr.length === 0) return null;
                                                            return (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setViewImportedForEntry(entry)}
                                                                    className="h-8 px-3 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all flex items-center gap-1.5"
                                                                    title="View which items were imported"
                                                                >
                                                                    <History className="w-4 h-4" />
                                                                    View imported
                                                                </Button>
                                                            );
                                                        } catch { return null; }
                                                    })()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-secondary-400 italic font-medium">
                                            No opening stock import history yet. Import item masters to see records here.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Dialog: View which items were imported */}
                    <Dialog
                        isOpen={!!viewImportedForEntry}
                        onClose={() => setViewImportedForEntry(null)}
                        title={viewImportedForEntry ? `Imported items — ${viewImportedForEntry.originalFileName}` : "Imported items"}
                        size="md"
                    >
                        <div className="px-1 pb-2">
                            {viewImportedForEntry?.importedItemsJson && (() => {
                                try {
                                    const list = JSON.parse(viewImportedForEntry.importedItemsJson) as ImportedItemSummary[];
                                    if (!Array.isArray(list) || list.length === 0) return <p className="text-secondary-500 text-sm">No items.</p>;
                                    return (
                                        <div className="max-h-[60vh] overflow-auto rounded border border-secondary-200">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-secondary-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 font-semibold text-secondary-700 w-14">Row</th>
                                                        <th className="px-3 py-2 font-semibold text-secondary-700">Part Name</th>
                                                        <th className="px-3 py-2 font-semibold text-secondary-700">Display Name</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {list.map((item, i) => (
                                                        <tr key={i} className="border-t border-secondary-100">
                                                            <td className="px-3 py-2 text-secondary-600 font-medium">{item.row}</td>
                                                            <td className="px-3 py-2 font-medium text-secondary-900">{item.mainPartName}</td>
                                                            <td className="px-3 py-2 text-secondary-700">{item.displayName}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                } catch {
                                    return <p className="text-secondary-500 text-sm">Could not load list.</p>;
                                }
                            })()}
                        </div>
                    </Dialog>
                </Card>
            )}

            {/* Standard Master Filter Card - only when not Opening History */}
            {tabState !== "openingHistory" && (
                <>
                    <Card className="shadow-sm border-secondary-200 bg-white mb-6">
                        <div className="p-4 flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                    <Input
                                        placeholder="Search by name, part, or drawing..."
                                        className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm font-medium"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-secondary-700">Filter</span>
                                    <select
                                        value={activeFilter}
                                        onChange={(e) => setActiveFilter(e.target.value as any)}
                                        className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none cursor-pointer pr-8"
                                    >
                                        <option value="all">All Records</option>
                                        <option value="active">Active Only</option>
                                        <option value="inactive">Inactive Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-secondary-100 pt-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider px-1">Material</label>
                                    <select
                                        value={materialFilter}
                                        onChange={(e) => setMaterialFilter(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-secondary-200 bg-secondary-50/30 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="all">All Materials</option>
                                        {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider px-1">Condition Status</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-secondary-200 bg-secondary-50/30 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="all">All Statuses</option>
                                        {statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-wider px-1">Ownership</label>
                                    <select
                                        value={ownerFilter}
                                        onChange={(e) => setOwnerFilter(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-secondary-200 bg-secondary-50/30 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                                    >
                                        <option value="all">All Ownership</option>
                                        {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
                        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-secondary-900">
                                {tabState === 'all' ? 'All Assets' : tabState === 'Die' ? 'Dies Repository' : 'Patterns Repository'} ({filteredItems.length})
                            </h3>
                        </div>
                        <div className="table-container overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
                                <thead>
                                    <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                        <th className="px-4 py-3 font-semibold w-16 text-center uppercase tracking-wider text-xs">Sr.No</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Part Name</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Display Name</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Asset Type</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Drawing Number</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Revision</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Material</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Ownership</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Current Process</th>
                                        <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        [1, 2, 3].map((i) => (
                                            <tr key={i} className="animate-pulse border-b border-secondary-100">
                                                {Array(11).fill(0).map((_, j) => (
                                                    <td key={j} className="px-4 py-3"><div className="h-5 bg-secondary-100 rounded-lg w-full" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => (
                                            <tr
                                                key={item.id}
                                                className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans"
                                            >
                                                <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{filteredItems.length - idx}</td>
                                                <td className="px-4 py-3 font-bold text-secondary-900 uppercase tracking-tight text-[11px]">{item.mainPartName}</td>
                                                <td className="px-4 py-3 text-secondary-700 uppercase font-bold text-[11px]">{item.currentName || "—"}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.itemTypeName === 'Die' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                        {item.itemTypeName}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-secondary-700 uppercase text-[11px]">{item.drawingNo || 'N/A'}</td>
                                                <td className="px-4 py-3 text-center text-secondary-700 font-bold text-[11px]">{item.revisionNo || '00'}</td>
                                                <td className="px-4 py-3 text-secondary-700 font-bold uppercase text-[11px]">{item.materialName}</td>
                                                <td className="px-4 py-3 text-secondary-700 font-bold uppercase text-[11px]">{item.ownerTypeName}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.statusName?.toLowerCase().includes('avail')
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                            }`}>
                                                            {item.statusName}
                                                        </span>
                                                        {!item.isActive && (
                                                            <span className="text-[9px] text-red-600 font-bold uppercase px-1.5 py-0.5 bg-red-50 rounded border border-red-100">Inactive</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border bg-secondary-50 border-secondary-200 text-secondary-800">
                                                        {item.currentProcess ?? "—"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canManage && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEdit(item)}
                                                                className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                                title="Edit Asset"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                        )}

                                                        {isAdmin && canManage && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleStatus(item)}
                                                                className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${item.isActive
                                                                    ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100'
                                                                    : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                                                    }`}
                                                                title={item.isActive ? "Deactivate" : "Activate"}
                                                            >
                                                                {item.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={11} className="py-16 text-center text-secondary-400 italic font-medium">
                                                No assets found matching selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}

            <ItemDialog
                key={dialogKey}
                isOpen={isEntryOpen}
                onClose={() => setIsEntryOpen(false)}
                item={selectedItem}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
                existingItems={items}
            />

            <ItemChangeDialog
                isOpen={isChangeOpen}
                onClose={() => {
                    setIsChangeOpen(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                onSubmit={(data) => changeProcessMutation.mutate(data)}
                isLoading={changeProcessMutation.isPending}
            />

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title="Confirm Asset Deactivation"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.currentName}</span>?
                        Inactive items will be hidden from operational workflows and reports.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setInactiveTarget(null)}
                            className="flex-1 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}
                            disabled={toggleActiveMutation.isPending}
                        >
                            {toggleActiveMutation.isPending ? "Deactivating..." : "Confirm Deactivate"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <ImportPreviewModal
                isOpen={isPreviewOpen}
                onClose={closePreview}
                data={validationData}
                onConfirm={confirmImport}
                isLoading={importLoading}
                title="Import Inventory Preview"
            />
        </div >
    );
}
