"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, MapPin, Trash2, Edit, Building2, MoreVertical } from "lucide-react";
import api from "@/lib/api";
import { Party } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { PartyDialog } from "@/components/masters/party-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PartiesPage() {
    const [search, setSearch] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const queryClient = useQueryClient();

    const { data: parties = [], isLoading } = useQuery<Party[]>({
        queryKey: ["parties"],
        queryFn: async () => {
            const res = await api.get("/parties");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/parties", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            toast.success("Party created successfully");
            setIsDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create party");
        }
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/parties/${selectedParty?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            toast.success("Party updated successfully");
            setIsDialogOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update party");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/parties/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["parties"] });
            toast.success("Party deleted successfully");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete party");
        }
    });

    const handleEdit = (party: Party) => {
        setSelectedParty(party);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setSelectedParty(null);
        setIsDialogOpen(true);
    };

    const handleSubmit = (data: any) => {
        if (selectedParty) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const filteredParties = parties.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.email?.toLowerCase().includes(search.toLowerCase()) ||
        p.phoneNumber?.includes(search)
    );

    return (
        <div className="p-6 space-y-8">
            <div className="flex items-center justify-between">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Party Master</h1>
                    <p className="text-gray-500 mt-1 font-medium">Coordinate with your external vendors and stakeholders</p>
                </motion.div>
                <Button
                    onClick={handleAdd}
                    className="rounded-2xl h-12 px-6 bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Party
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder="Search by name, email, phone..."
                        className="pl-12 h-12 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-sm font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-secondary-50/50 rounded-2xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sort:</span>
                    <select className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer">
                        <option>Name (A-Z)</option>
                        <option>Recently Added</option>
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 rounded-3xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredParties.map(party => (
                        <Card key={party.id} className="border-none shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden bg-white relative">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 to-primary-600" />
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-16 w-16 bg-gradient-to-br from-primary-50 to-primary-100/50 rounded-2xl flex items-center justify-center text-primary-600 font-extrabold text-2xl shadow-inner border border-primary-100">
                                        {party.name.charAt(0)}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary-50 transition-colors">
                                                <MoreVertical className="w-5 h-5 text-gray-400" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl p-2 w-48">
                                            <DropdownMenuItem onClick={() => handleEdit(party)} className="rounded-lg gap-2 cursor-pointer font-medium py-2.5">
                                                <Edit className="w-4 h-4 text-primary-600" /> Edit Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => { if (confirm('Are you sure you want to delete this party?')) deleteMutation.mutate(party.id); }}
                                                className="rounded-lg gap-2 cursor-pointer font-medium py-2.5 text-rose-600 hover:bg-rose-50"
                                            >
                                                <Trash2 className="w-4 h-4" /> Delete Party
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-6 truncate">{party.name}</h3>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">
                                        <div className="p-2 bg-secondary-50 rounded-lg group-hover:bg-primary-50 transition-colors"><Phone className="w-4 h-4" /></div>
                                        {party.phoneNumber || <span className="text-gray-300 italic">Not available</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">
                                        <div className="p-2 bg-secondary-50 rounded-lg group-hover:bg-primary-50 transition-colors"><Mail className="w-4 h-4" /></div>
                                        {party.email || <span className="text-gray-300 italic">Not available</span>}
                                    </div>
                                    {party.address && (
                                        <div className="flex items-start gap-3 text-sm font-semibold text-gray-500">
                                            <div className="p-2 bg-secondary-50 rounded-lg group-hover:bg-primary-50 transition-colors mt-0.5"><MapPin className="w-4 h-4" /></div>
                                            <span className="line-clamp-2 leading-relaxed">{party.address}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest border ${party.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                        {party.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: {party.id.toString().padStart(4, '0')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <PartyDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={handleSubmit}
                party={selectedParty}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />
        </div>
    );
}

// Helper to use motion without massive layout shift if it was missing imports
import { motion } from "framer-motion";
