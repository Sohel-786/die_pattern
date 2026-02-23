"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Hammer, MapPin,
    Edit2, Database, Ban, CheckCircle,
    Filter, X
} from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import api from "@/lib/api";
import { Label } from "@/components/ui/label";
import { Item } from "@/types";
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
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ItemDialog } from "@/components/masters/item-dialog";
import { ItemChangeDialog } from "@/components/masters/item-change-dialog";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

export default function ItemsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const canManage = permissions?.manageItem;

    const [search, setSearch] = useState("");
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isChangeOpen, setIsChangeOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [tabState, setTabState] = useState<"all" | "Die" | "Pattern">("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [materialFilter, setMaterialFilter] = useState<string>("all");
    const [ownerFilter, setOwnerFilter] = useState<string>("all");
    const [dialogKey, setDialogKey] = useState(0);
    const [inactiveTarget, setInactiveTarget] = useState<Item | null>(null);

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

    if (permissions && !permissions.viewMaster) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-secondary-900">Access Denied</h2>
                    <p className="text-secondary-500">You don't have permission to view Die & Pattern Masters.</p>
                </div>
            </div>
        );
    }

    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["items", debouncedSearch, activeFilter, tabState, statusFilter, materialFilter, ownerFilter],
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
        mutationFn: (data: any) => api.put(`/items/${selectedItem?.id || data.id}`, { ...data, id: selectedItem?.id || data.id }),
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

    return (
        <div className="p-6 space-y-6 text-sans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Die & Pattern Masters</h1>
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
            </div>

            {/* Standard Master Filter Card */}
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
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Custodian Type</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Custodian Name</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse border-b border-secondary-100">
                                        {Array(12).fill(0).map((_, j) => (
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
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
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
                                        <td className="px-4 py-3 text-[11px] font-bold text-secondary-700 uppercase">{item.currentHolderType}</td>
                                        <td className="px-4 py-3 text-[11px] font-bold text-secondary-700 uppercase flex items-center gap-1.5">
                                            {item.currentHolderType === 'Location' ? (
                                                <Database className="w-3.5 h-3.5 text-secondary-300" />
                                            ) : (
                                                <MapPin className="w-3.5 h-3.5 text-secondary-300" />
                                            )}
                                            {item.currentLocationName || item.currentPartyName || 'UNKNOWN'}
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

                                                {canManage && (
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
                                    <td colSpan={12} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No assets found matching selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card >

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
