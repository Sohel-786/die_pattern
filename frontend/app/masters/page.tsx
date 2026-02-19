"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Layers, Database, Hammer, Info, Trash2, Edit, Users, MoreVertical } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { GeneralMasterDialog } from "@/components/masters/general-master-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MasterType = 'pattern-types' | 'materials' | 'pattern-statuses' | 'owner-types';

export default function OtherMastersPage() {
    const [activeTab, setActiveTab] = useState<MasterType>('pattern-types');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const queryClient = useQueryClient();

    const fetchMaster = async (type: string) => {
        const res = await api.get(`/masters/${type}`);
        return res.data.data;
    };

    const { data: patternTypes = [], isLoading: loadingTypes } = useQuery({ queryKey: ["pattern-types"], queryFn: () => fetchMaster("pattern-types") });
    const { data: materials = [], isLoading: loadingMaterials } = useQuery({ queryKey: ["materials"], queryFn: () => fetchMaster("materials") });
    const { data: statuses = [], isLoading: loadingStatuses } = useQuery({ queryKey: ["pattern-statuses"], queryFn: () => fetchMaster("pattern-statuses") });
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

    const currentData = activeTab === 'pattern-types' ? patternTypes
        : activeTab === 'materials' ? materials
            : activeTab === 'pattern-statuses' ? statuses
                : owners;

    const currentLoading = activeTab === 'pattern-types' ? loadingTypes
        : activeTab === 'materials' ? loadingMaterials
            : activeTab === 'pattern-statuses' ? loadingStatuses
                : loadingOwners;

    const getTitle = () => {
        if (activeTab === 'pattern-types') return "Pattern Type";
        if (activeTab === 'materials') return "Material";
        if (activeTab === 'pattern-statuses') return "Pattern Status";
        return "Owner Type";
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">System Configuration</h1>
                    <p className="text-secondary-600">Manage global parameters and master list metadata</p>
                </motion.div>
                <Button
                    onClick={handleAdd}
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add {getTitle()}
                </Button>
            </div>

            <Tabs defaultValue="pattern-types" className="w-full" onValueChange={(v) => setActiveTab(v as MasterType)}>
                <TabsList className="bg-secondary-100 p-1 rounded-full h-auto mb-8">
                    <TabsTrigger value="pattern-types" className="rounded-full px-6 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-600 transition-all"><Tag className="w-4 h-4 mr-2" /> Types</TabsTrigger>
                    <TabsTrigger value="materials" className="rounded-full px-6 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-600 transition-all"><Hammer className="w-4 h-4 mr-2" /> Materials</TabsTrigger>
                    <TabsTrigger value="pattern-statuses" className="rounded-full px-6 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-600 transition-all"><Info className="w-4 h-4 mr-2" /> Statuses</TabsTrigger>
                    <TabsTrigger value="owner-types" className="rounded-full px-6 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary-600 transition-all"><Users className="w-4 h-4 mr-2" /> Owners</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {currentData.map((item: any) => (
                                    <Card key={item.id} className="shadow-sm border-secondary-100 hover:border-primary-200 transition-all overflow-hidden bg-white">
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-600 font-bold text-xs border border-primary-100">
                                                    #{item.id}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-secondary-100"><MoreVertical className="w-4 h-4 text-secondary-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-secondary-200 shadow-xl p-1 w-40">
                                                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-lg gap-2 cursor-pointer py-2 font-medium text-secondary-700">
                                                            <Edit className="w-4 h-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }} className="rounded-lg gap-2 cursor-pointer py-2 font-medium text-red-600 hover:bg-red-50">
                                                            <Trash2 className="w-4 h-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <h3 className="text-base font-bold text-secondary-900 mb-4 line-clamp-1">{item.name}</h3>

                                            <div className="flex items-center justify-between border-t border-secondary-50 pt-3">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-500'}`}>
                                                    {item.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                ))}

                                <button
                                    onClick={handleAdd}
                                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-secondary-200 rounded-xl text-secondary-400 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/30 transition-all group space-y-2 cursor-pointer"
                                >
                                    <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold uppercase tracking-wider">New Entry</span>
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </Tabs>

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
