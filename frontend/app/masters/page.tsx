"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Database, Layers, Tag, Hammer, Info, Users, Edit2, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { GeneralMasterDialog } from "@/components/masters/general-master-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type MasterType = 'item-types' | 'materials' | 'item-statuses' | 'owner-types';

export default function OtherMastersPage() {
    const [activeTab, setActiveTab] = useState<MasterType>('item-types');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

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
            setIsDialogOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/masters/${activeTab}/${selectedItem.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            toast.success("Entry updated");
            setIsDialogOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update")
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/masters/${activeTab}/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            toast.success("Entry deleted");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete")
    });

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsDialogOpen(true);
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

    const getIcon = () => {
        if (activeTab === 'item-types') return <Tag className="w-5 h-5 text-primary-600" />;
        if (activeTab === 'materials') return <Hammer className="w-5 h-5 text-primary-600" />;
        if (activeTab === 'item-statuses') return <Info className="w-5 h-5 text-primary-600" />;
        return <Users className="w-5 h-5 text-primary-600" />;
    };

    const filteredData = currentData.filter((item: any) =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">System Masters</h1>
                    <p className="text-secondary-500 font-medium">Manage global parameters and metadata categories for the system</p>
                </motion.div>
                <Button
                    onClick={handleAdd}
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 font-bold h-11 px-6 active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Register {getTitle()}
                </Button>
            </div>

            <Card className="shadow-sm border-secondary-200/60 bg-white">
                <div className="p-5 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder={`Filter ${getTitle().toLowerCase()}s by name...`}
                            className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Tabs value={activeTab} className="w-full sm:w-auto" onValueChange={(v) => setActiveTab(v as MasterType)}>
                        <TabsList className="bg-secondary-100/80 p-1.5 rounded-2xl h-12">
                            <TabsTrigger value="item-types" className="rounded-xl px-6 text-[11px] font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md">Types</TabsTrigger>
                            <TabsTrigger value="materials" className="rounded-xl px-6 text-[11px] font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md">Materials</TabsTrigger>
                            <TabsTrigger value="item-statuses" className="rounded-xl px-6 text-[11px] font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md">Statuses</TabsTrigger>
                            <TabsTrigger value="owner-types" className="rounded-xl px-6 text-[11px] font-bold uppercase tracking-wider transition-all data-[state=active]:bg-white data-[state=active]:text-primary-600 data-[state=active]:shadow-md">Owners</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </Card>

            <Card className="shadow-xl shadow-secondary-200/20 border-secondary-200/60 overflow-hidden bg-white">
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-gradient-to-r from-white to-secondary-50/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-secondary-900 tracking-tight">{getTitle()} Ledger</h3>
                            <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredData.length} Records Found</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-secondary-50/50">
                            <TableRow className="border-secondary-100">
                                <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                                <TableHead className="w-32 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Reference</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">{getTitle()} Label</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Lifecycle</TableHead>
                                <TableHead className="w-[120px] pr-6 text-right font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {currentLoading ? (
                                    [1, 2, 3, 4, 5].map((i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            {Array(5).fill(0).map((_, j) => (
                                                <TableCell key={j}><div className="h-5 bg-secondary-100 rounded-lg w-full" /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((item: any, idx: number) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                                        >
                                            <TableCell className="pl-6 py-5 font-bold text-secondary-400 text-xs">{String(idx + 1).padStart(2, '0')}</TableCell>
                                            <TableCell className="py-5">
                                                <span className="px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-600 font-bold text-[10px]">ID-{item.id}</span>
                                            </TableCell>
                                            <TableCell className="py-5 font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors">{item.name}</TableCell>
                                            <TableCell className="py-5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${item.isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${item.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                    {item.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(item)}
                                                        className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
                                                        title="Edit entry"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { if (confirm('Are you sure you want to permanently delete this record?')) deleteMutation.mutate(item.id); }}
                                                        className="h-9 w-9 p-0 text-secondary-500 hover:text-rose-600 hover:bg-white border hover:border-rose-100 rounded-xl transition-all shadow-sm"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-24 text-center bg-secondary-50/20">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-secondary-200/50 flex items-center justify-center text-secondary-300">
                                                    <Database className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-secondary-900 font-bold text-lg">No Master Data Found</p>
                                                    <p className="text-secondary-400 text-sm font-medium">We couldn't find any {getTitle().toLowerCase()} records matching your filters.</p>
                                                </div>
                                                <Button variant="outline" onClick={() => setSearch("")} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Reset Search View</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <GeneralMasterDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                item={selectedItem}
                title={getTitle()}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
}


