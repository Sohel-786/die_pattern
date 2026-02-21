"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Download, Edit2, Ban, CheckCircle, Upload } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { GeneralMasterDialog } from "@/components/masters/general-master-dialog";
import { Input } from "@/components/ui/input";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { Dialog } from "@/components/ui/dialog";

type MasterType = 'item-types' | 'materials' | 'item-statuses' | 'owner-types';

export default function OtherMastersPage() {
    const [activeTab, setActiveTab] = useState<MasterType>('item-types');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [search, setSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
    const [dialogKey, setDialogKey] = useState(0);
    const [inactiveTarget, setInactiveTarget] = useState<any | null>(null);
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
    } = useMasterExportImport(`masters/${activeTab}`, [activeTab]);

    const fetchMaster = async (type: string) => {
        const res = await api.get(`/masters/${type}`);
        return res.data.data;
    };

    const { data: itemTypes = [], isLoading: loadingTypes } = useQuery({ queryKey: ["item-types"], queryFn: () => fetchMaster("item-types") });
    const { data: materials = [], isLoading: loadingMaterials } = useQuery({ queryKey: ["materials"], queryFn: () => fetchMaster("materials") });
    const { data: statuses = [], isLoading: loadingStatuses } = useQuery({ queryKey: ["item-statuses"], queryFn: () => fetchMaster("item-statuses") });
    const { data: owners = [], isLoading: loadingOwners } = useQuery({ queryKey: ["owner-types"], queryFn: () => fetchMaster("owner-types") });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post(`/masters/${activeTab}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            toast.success("Entry created");
            setSelectedItem(null);
            setDialogKey(prev => prev + 1);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/masters/${activeTab}/${selectedItem?.id || data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            toast.success("Details updated successfully");
            setIsDialogOpen(false);
            setSelectedItem(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update")
    });

    const toggleActiveMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.put(`/masters/${activeTab}/${id}`, { isActive }),
        onSuccess: (_, { isActive }) => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            setInactiveTarget(null);
            toast.success(isActive ? "Record activated" : "Record deactivated");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsDialogOpen(true);
    };

    const toggleStatus = (item: any) => {
        if (item.isActive) {
            setInactiveTarget(item);
        } else {
            toggleActiveMutation.mutate({ id: item.id, isActive: true });
        }
    };

    const currentData = activeTab === 'item-types' ? itemTypes
        : activeTab === 'materials' ? materials
            : activeTab === 'item-statuses' ? statuses
                : owners;

    const currentLoading = activeTab === 'item-types' ? loadingTypes
        : activeTab === 'materials' ? loadingMaterials
            : activeTab === 'item-statuses' ? loadingStatuses
                : loadingOwners;

    const getTitle = () => {
        if (activeTab === 'item-types') return "Item Type";
        if (activeTab === 'materials') return "Material";
        if (activeTab === 'item-statuses') return "Item Status";
        return "Owner Type";
    };

    const filteredData = currentData.filter((item: any) => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = activeFilter === "all"
            ? true
            : activeFilter === "active"
                ? item.isActive
                : !item.isActive;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Other Masters</h1>
                    <p className="text-secondary-500 font-medium">Manage supplementary parameters and metadata categories</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        id="import-masters"
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
                        onClick={() => document.getElementById("import-masters")?.click()}
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
                        Add {getTitle()}
                    </Button>
                </div>
            </div>

            <div className="mb-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MasterType)}>
                    <TabsList className="bg-white border border-secondary-200 p-1.5 rounded-xl h-12 shadow-sm">
                        <TabsTrigger value="item-types" className="rounded-lg px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600">Types</TabsTrigger>
                        <TabsTrigger value="materials" className="rounded-lg px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600">Materials</TabsTrigger>
                        <TabsTrigger value="item-statuses" className="rounded-lg px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600">Statuses</TabsTrigger>
                        <TabsTrigger value="owner-types" className="rounded-lg px-6 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-primary-50 data-[state=active]:text-primary-600">Owners</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Card className="shadow-sm border-secondary-200 bg-white mb-6">
                <div className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder={`Search ${getTitle().toLowerCase()}s...`}
                            className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm"
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
                <div className="px-6 py-4 border-b border-secondary-100">
                    <h3 className="text-lg font-bold text-secondary-900">
                        All Records ({filteredData.length})
                    </h3>
                </div>
                <div className="table-container">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <th className="px-4 py-3 font-semibold w-16 text-center">Sr.No</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-center">Status</th>
                                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentLoading ? (
                                [1, 2, 3].map((i) => (
                                    <tr key={i} className="animate-pulse border-b border-secondary-100">
                                        {Array(4).fill(0).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-5 bg-secondary-100 rounded-lg w-full" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : filteredData.length > 0 ? (
                                filteredData.map((item: any, idx: number) => (
                                    <tr
                                        key={`${activeTab}-${item.id}`}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-secondary-900 uppercase tracking-tight">{item.name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.isActive
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                                }`}>
                                                {item.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(item)}
                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatus(item)}
                                                    className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${item.isActive
                                                        ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                                        : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                                        }`}
                                                    title={item.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {item.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-secondary-500 italic font-medium">
                                        No records found matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <GeneralMasterDialog
                key={dialogKey}
                isOpen={isDialogOpen}
                onClose={() => {
                    setIsDialogOpen(false);
                    setSelectedItem(null);
                }}
                item={selectedItem}
                title={getTitle()}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title={`Confirm ${getTitle()} Deactivation`}
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.name}</span>?
                        This {getTitle().toLowerCase()} will no longer be available for selection in item definitions.
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
                            {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate Record"}
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
                title={`Import ${getTitle()} Preview`}
            />
        </div>
    );
}
