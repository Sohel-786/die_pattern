"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Mail, Phone, MapPin, Trash2, Edit, Building2, MoreVertical } from "lucide-react";
import api from "@/lib/api";
import { Party } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { PartyDialog } from "@/components/masters/party-dialog";
import { motion, AnimatePresence } from "framer-motion";
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
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">Party Master</h1>
                    <p className="text-secondary-600">Coordinate with your external vendors and stakeholders</p>
                </motion.div>
                <Button
                    onClick={handleAdd}
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Party
                </Button>
            </div>

            <Card className="shadow-sm">
                <div className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by name, email, phone..."
                            className="pl-10 h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card className="shadow-sm">
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                    <h3 className="text-xl font-semibold leading-none tracking-tight text-secondary-900">
                        All Parties ({filteredParties.length})
                    </h3>
                </div>
                <div>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
                        </div>
                    ) : filteredParties.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-secondary-200 m-6 mt-0">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-primary-200 bg-primary-50">
                                        <th className="px-4 py-3 font-semibold text-primary-900 w-16">Sr.No</th>
                                        <th className="px-4 py-3 font-semibold text-primary-900">Name</th>
                                        <th className="px-4 py-3 font-semibold text-primary-900">Contact</th>
                                        <th className="px-4 py-3 font-semibold text-primary-900">Status</th>
                                        <th className="px-4 py-3 font-semibold text-primary-900 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filteredParties.map((party, idx) => (
                                            <motion.tr
                                                key={party.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                                className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-secondary-600">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-secondary-900">{party.name}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1 text-xs text-secondary-600">
                                                        {party.email && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Mail className="w-3 h-3" />
                                                                {party.email}
                                                            </div>
                                                        )}
                                                        {party.phoneNumber && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3 h-3" />
                                                                {party.phoneNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${party.isActive
                                                        ? 'bg-green-100 text-green-700 border-green-200'
                                                        : 'bg-red-100 text-red-700 border-red-200'
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
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Edit className="w-4 h-4 text-secondary-500" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-secondary-500 text-lg">No parties found.</p>
                        </div>
                    )}
                </div>
            </Card>

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
