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
        <div className="p-8 space-y-10">
            <div className="flex items-center justify-between">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Configuration</h1>
                    <p className="text-gray-500 mt-2 font-semibold">Manage global parameters and metadata</p>
                </motion.div>
                <Button
                    onClick={handleAdd}
                    className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    <Plus className="w-6 h-6 mr-2" />
                    Add {getTitle()}
                </Button>
            </div>

            <Tabs defaultValue="pattern-types" className="w-full" onValueChange={(v) => setActiveTab(v as MasterType)}>
                <TabsList className="bg-secondary-100/50 p-2 rounded-[2rem] h-auto gap-3">
                    <TabsTrigger value="pattern-types" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary-600 font-extrabold transition-all"><Tag className="w-5 h-5 mr-3" /> TYPES</TabsTrigger>
                    <TabsTrigger value="materials" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary-600 font-extrabold transition-all"><Hammer className="w-5 h-5 mr-3" /> MATERIALS</TabsTrigger>
                    <TabsTrigger value="pattern-statuses" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary-600 font-extrabold transition-all"><Info className="w-5 h-5 mr-3" /> STATUSES</TabsTrigger>
                    <TabsTrigger value="owner-types" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary-600 font-extrabold transition-all"><Users className="w-5 h-5 mr-3" /> OWNERS</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="mt-10"
                    >
                        {currentLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-3xl bg-gray-100 animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {currentData.map((item: any) => (
                                    <Card key={item.id} className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white/50 backdrop-blur-sm rounded-3xl relative">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 font-black text-sm`}>
                                                    {item.id}
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="group-hover:bg-white rounded-xl"><MoreVertical className="w-5 h-5 text-gray-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-40">
                                                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-xl gap-2 cursor-pointer font-bold"><Edit className="w-4 h-4 text-primary-600" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(item.id); }} className="rounded-xl gap-2 cursor-pointer font-bold text-rose-600"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            <h3 className="text-lg font-black text-gray-800 break-words pr-2">{item.name}</h3>

                                            <div className="mt-6 flex items-center justify-between">
                                                <span className={`h-2 w-2 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${item.isActive ? 'text-emerald-500' : 'text-gray-400'}`}>
                                                    {item.isActive ? 'Active' : 'Disabled'}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                <button
                                    onClick={handleAdd}
                                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-gray-300 hover:border-primary-400 hover:text-primary-600 hover:bg-white transition-all group space-y-3 cursor-pointer"
                                >
                                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-primary-50 transition-colors">
                                        <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <span className="text-sm font-black uppercase tracking-widest">New {getTitle()}</span>
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
