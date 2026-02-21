"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, History, Hammer, MapPin,
    MoreVertical, Download,
    Edit, Database, ShieldCheck, Upload, Ban, CheckCircle
} from "lucide-react";
import api from "@/lib/api";
import { Item } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
    const [dialogKey, setDialogKey] = useState(0);
    const [inactiveTarget, setInactiveTarget] = useState<Item | null>(null);

    const queryClient = useQueryClient();

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

    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["items"],
        queryFn: async () => {
            const res = await api.get("/items");
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

    const filteredItems = items.filter(i => {
        const matchesSearch = i.mainPartName.toLowerCase().includes(search.toLowerCase()) ||
            i.currentName.toLowerCase().includes(search.toLowerCase()) ||
            i.drawingNo?.toLowerCase().includes(search.toLowerCase());

        const matchesFilter = activeFilter === "all"
            ? true
            : activeFilter === "active"
                ? i.isActive
                : !i.isActive;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 space-y-6 text-sans">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Pattern Inventory</h1>
                    <p className="text-secondary-500 font-medium">Digital repository for engineering patterns and dies</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="import-items"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImport(file);
                            e.target.value = "";
                        }}
                    />
                    <Button
                        variant="outline"
                        className="shadow-sm border-secondary-200"
                        onClick={handleExport}
                        disabled={exportLoading}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        variant="outline"
                        className="shadow-sm border-secondary-200"
                        onClick={() => document.getElementById("import-items")?.click()}
                        disabled={importLoading}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                    <Button
                        onClick={handleAdd}
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Pattern
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-secondary-200 bg-white mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
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
                        <span className="text-sm font-medium text-secondary-700">Display</span>
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
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Pattern Identity</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Material & Type</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Engineering DNA</th>
                                <th className="px-4 py-3 font-semibold uppercase text-[10px] tracking-wider">Current Custody</th>
                                <th className="px-4 py-3 font-semibold text-center uppercase text-[10px] tracking-wider">Status</th>
                                <th className="px-4 py-3 font-semibold text-right uppercase text-[10px] tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse border-b border-secondary-100">
                                        {Array(7).fill(0).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-5 bg-secondary-100 rounded-lg w-full" /></td>
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
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight leading-none mb-1">{item.currentName}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">{item.mainPartName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-700 text-[10px] uppercase tracking-wide">{item.itemTypeName}</span>
                                                <span className="text-[9px] text-secondary-500 font-bold mt-0.5 uppercase">{item.materialName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-[10px] font-bold text-primary-600 bg-primary-100 px-2 py-0.5 rounded border border-primary-200 w-fit">{item.drawingNo || 'UNCLASSIFIED'}</span>
                                                <span className="text-[9px] text-secondary-400 font-bold ml-1 uppercase">REV: {item.revisionNo || '00'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-bold uppercase text-secondary-400 leading-none">{item.currentHolderType}</span>
                                                <span className="text-[10px] font-bold text-secondary-800 flex items-center gap-1.5 uppercase transition-colors group-hover:text-primary-700 truncate max-w-[150px]">
                                                    <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                                                    {item.currentLocationName || item.currentPartyName || 'IN TRANSIT'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${item.statusName?.toLowerCase().includes('avail')
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {item.statusName}
                                                </span>
                                                {!item.isActive && (
                                                    <span className="text-[9px] text-red-600 font-bold uppercase">Inactive</span>
                                                )}
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
                                    <td colSpan={7} className="py-12 text-center text-secondary-500 italic font-medium">
                                        No patterns found matching criteria.
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
                onClose={() => {
                    setIsEntryOpen(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
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
