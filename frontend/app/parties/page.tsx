"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Party } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Ban, CheckCircle } from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import { toast } from "react-hot-toast";
import { PartyDialog } from "@/components/masters/party-dialog";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { Dialog } from "@/components/ui/dialog";

export default function PartiesPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Party | null>(null);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [dialogKey, setDialogKey] = useState(0);
    const [inactiveTarget, setInactiveTarget] = useState<Party | null>(null);

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
    } = useMasterExportImport("parties", ["parties"]);

    const { data: parties = [], isLoading } = useQuery<Party[]>({
        queryKey: ["parties"],
        queryFn: async () => {
            const res = await api.get("/parties");
            return res.data?.data ?? [];
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/parties", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            toast.success("Party registered successfully");
            setSelectedItem(null);
            setDialogKey(prev => prev + 1); // Reset for next entry
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/parties/${selectedItem?.id || data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            toast.success("Details updated successfully");
            setIsDialogOpen(false);
            setSelectedItem(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.put(`/parties/${id}`, { isActive }),
        onSuccess: (_, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            setInactiveTarget(null);
            toast.success(isActive ? "Party activated" : "Party deactivated");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const handleEdit = (item: Party) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsDialogOpen(true);
    };

    const toggleStatus = (item: Party) => {
        if (item.isActive) {
            setInactiveTarget(item);
        } else {
            toggleActiveMutation.mutate({ id: item.id, isActive: true });
        }
    };

    const filteredParties = parties.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.email || "").toLowerCase().includes(search.toLowerCase()) ||
            (p.phoneNumber || "").toLowerCase().includes(search.toLowerCase());
        const matchesFilter = activeFilter === "all"
            ? true
            : activeFilter === "active"
                ? p.isActive
                : !p.isActive;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Party Master</h1>
                    <p className="text-secondary-500 font-medium">Manage master data for vendors & external entities</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportImportButtons
                        onExport={handleExport}
                        onImport={handleImport}
                        exportLoading={exportLoading}
                        importLoading={importLoading}
                        inputId="parties"
                    />
                    <Button
                        onClick={handleAdd}
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Party
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-secondary-200 bg-white mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by name, email or phone..."
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
            </Card>

            <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
                <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-secondary-900">Registered Parties ({filteredParties.length})</h3>
                </div>
                <div className="table-container">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <th className="px-4 py-3 font-semibold w-16 text-center">Sr.No</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Name</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Category / Type</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Contact Info</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">GST No</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
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
                            ) : filteredParties.length > 0 ? (
                                filteredParties.map((party, idx) => (
                                    <tr
                                        key={party.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-secondary-900 uppercase tracking-tight">{party.name}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-secondary-700 text-xs">{party.partyCategory || "—"}</div>
                                            <div className="text-[10px] text-secondary-400 font-medium uppercase">{party.customerType || "—"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-secondary-700">{party.phoneNumber || "—"}</div>
                                            <div className="text-[10px] text-secondary-500 italic">{party.email || "—"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-secondary-700 text-xs">{party.gstNo || "—"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${party.isActive
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {party.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(party)}
                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatus(party)}
                                                    className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${party.isActive
                                                        ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                                        : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                                        }`}
                                                    title={party.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {party.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-secondary-500 italic font-medium">
                                        No parties found matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <PartyDialog
                key={dialogKey}
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedItem(null);
                }}
                party={selectedItem}
                existingParties={parties}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title="Confirm Inactivation"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.name}</span>?
                        This party will no longer be available for new transactions like purchase orders.
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
                            {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate Entity"}
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
                title="Import Parties Preview"
            />
        </div>
    );
}
