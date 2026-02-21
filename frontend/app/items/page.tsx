"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, History, Hammer, MapPin,
    MoreVertical,
    Edit, Database, ShieldCheck, Ban, CheckCircle,
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

export default function ItemsPage() {
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
                    <ExportImportButtons
                        onExport={handleExport}
                        onImport={handleImport}
                        exportLoading={exportLoading}
                        importLoading={importLoading}
                        inputId="items"
                    />
                    <Button
                        onClick={handleAdd}
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Die/Pattern Master
                    </Button>
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

            {/* Professional Filter Card - QC Tool Style */}
            <Card className="shadow-sm border-secondary-200 bg-white overflow-visible">
                <CardContent className="p-5">
                    <div className="flex flex-col gap-6 overflow-visible">
                        {/* Search & Header Row */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-secondary-200 bg-secondary-50 text-secondary-600"
                                aria-hidden
                            >
                                <Filter className="h-4 w-4" />
                            </div>
                            <div className="relative flex-1 min-w-[200px] max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                                <Input
                                    type="search"
                                    placeholder="Search by name, part, or drawing..."
                                    className="pl-9 h-10 rounded-lg border-secondary-300 bg-white focus-visible:ring-2 focus-visible:ring-primary-500 text-sm font-medium"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetFilters}
                                    className="shrink-0 h-9 px-3 text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 font-bold"
                                >
                                    <X className="h-4 w-4 mr-1.5" />
                                    Clear filters
                                </Button>
                            )}
                        </div>

                        {/* Filter Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-visible items-start">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-secondary-700">Record Status</Label>
                                <select
                                    value={activeFilter}
                                    onChange={(e) => setActiveFilter(e.target.value as any)}
                                    className="w-full h-10 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:ring-primary-500 font-medium cursor-pointer"
                                >
                                    <option value="all">Active & Inactive</option>
                                    <option value="active">Active Only</option>
                                    <option value="inactive">Inactive Only</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-secondary-700">Material</Label>
                                <select
                                    value={materialFilter}
                                    onChange={(e) => setMaterialFilter(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:ring-primary-500 font-medium cursor-pointer"
                                >
                                    <option value="all">All Materials</option>
                                    {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-secondary-700">Condition Status</Label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:ring-primary-500 font-medium cursor-pointer"
                                >
                                    <option value="all">All Statuses</option>
                                    {statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-secondary-700">Ownership</Label>
                                <select
                                    value={ownerFilter}
                                    onChange={(e) => setOwnerFilter(e.target.value)}
                                    className="w-full h-10 rounded-lg border border-secondary-200 bg-white px-3 text-sm focus:ring-primary-500 font-medium cursor-pointer"
                                >
                                    <option value="all">All Ownership</option>
                                    {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
                <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-secondary-900">
                        Pattern Repository ({filteredItems.length})
                    </h3>
                </div>
                <div className="table-container">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <th className="px-4 py-3 font-semibold text-center w-16 uppercase text-[10px] tracking-wider">Sr.No</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Part Name</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Display Name</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Asset Type</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Drawing No</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Revision</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Material</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Ownership</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Status</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Custodian Info</th>
                                <th className="px-4 py-3 font-semibold text-right uppercase text-[10px] tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse border-b border-secondary-100">
                                        {Array(11).fill(0).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 bg-secondary-100 rounded-lg w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <span className="font-bold text-secondary-900 uppercase tracking-tight text-xs">{item.mainPartName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-secondary-700 uppercase text-xs">{item.currentName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.itemTypeName === 'Die' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {item.itemTypeName}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                                                {item.drawingNo || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-[10px] font-bold text-secondary-500">{item.revisionNo || '00'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold text-secondary-600 uppercase">{item.materialName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold text-secondary-600 uppercase italic">{item.ownerTypeName}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.statusName?.toLowerCase().includes('avail')
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                    {item.statusName}
                                                </span>
                                                {!item.isActive && (
                                                    <span className="text-[9px] text-red-500 font-bold uppercase text-center">Disabled</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold uppercase text-secondary-400">{item.currentHolderType}</span>
                                                <span className="text-[10px] font-bold text-secondary-800 flex items-center gap-1 group-hover:text-primary-700 transition-colors">
                                                    <MapPin className="w-3 h-3" />
                                                    {item.currentLocationName || item.currentPartyName || 'UNKNOWN'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-white border hover:border-secondary-100 transition-all"><MoreVertical className="w-4 h-4 text-secondary-500" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-secondary-200 shadow-xl p-1 w-56 bg-white">
                                                    <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-lg gap-2 cursor-pointer font-bold text-xs text-secondary-700 hover:text-primary-600 hover:bg-primary-50">
                                                        <Edit className="w-3.5 h-3.5 text-blue-500" />
                                                        Review Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleChangeProcess(item)} className="rounded-lg gap-2 cursor-pointer font-bold text-xs text-secondary-700 hover:text-amber-700 hover:bg-amber-50">
                                                        <Hammer className="w-3.5 h-3.5 text-amber-500" />
                                                        Change Process
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer font-bold text-xs text-secondary-700 hover:text-primary-600 hover:bg-primary-50">
                                                        <History className="w-3.5 h-3.5 text-indigo-500" />
                                                        View Asset Timeline
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-secondary-100 my-1" />
                                                    <DropdownMenuItem onClick={() => toggleStatus(item)} className={`rounded-lg gap-2 cursor-pointer font-bold text-xs ${item.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                        {item.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                        {item.isActive ? 'Mark Inactive' : 'Mark Active'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={11} className="py-12 text-center text-secondary-500 italic font-medium">
                                        No assets found matching selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

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
        </div>
    );
}
