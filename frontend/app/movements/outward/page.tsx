"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Save, ArrowUpRight,
    Package, Building2, MapPin, Users,
    ArrowRight, ShieldCheck, Info, Briefcase
} from "lucide-react";
import api from "@/lib/api";
import { Item, Party, HolderType, MovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function OutwardEntryPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedItemId, setSelectedItemId] = useState<number>(0);
    const [targetPartyId, setTargetPartyId] = useState<number>(0);
    const [remarks, setRemarks] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: items = [], isLoading: loadingItems } = useQuery<Item[]>({
        queryKey: ["items", "active"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            // Only items currently at a Location can go Outward to a Vendor
            return res.data.data.filter((i: any) => i.currentHolderType === HolderType.Location);
        },
    });

    const { data: vendors = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/movements", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movements"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Outward movement recorded successfully");
            router.push("/movements");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Movement failed")
    });

    const filteredItems = items.filter(i =>
        i.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.mainPartName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        if (!selectedItemId || !targetPartyId) {
            toast.error("Please select item and target vendor");
            return;
        }
        createMutation.mutate({
            type: MovementType.Outward,
            itemId: selectedItemId,
            toType: HolderType.Vendor,
            toPartyId: targetPartyId,
            remarks
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12 pb-32">
            <div className="flex items-center gap-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="h-16 w-16 rounded-[2rem] bg-white shadow-xl border border-gray-100 flex items-center justify-center hover:bg-secondary-50 transition-all hover:scale-110"
                >
                    <ArrowLeft className="w-8 h-8 text-gray-400" />
                </Button>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Outward Gate Pass</h1>
                    <p className="text-gray-400 mt-2 font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                        <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                        Dispatching Assets to Vendor
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 space-y-10">
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-black/5 border border-gray-100 space-y-12 relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Step 1: Item Selection */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-rose-600"></div>
                                    I. Asset Identification
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Package className="w-4 h-4 text-rose-500" /> Item Unit
                                    </label>
                                    <select
                                        value={selectedItemId}
                                        onChange={(e) => setSelectedItemId(Number(e.target.value))}
                                        className="w-full h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-lg font-black px-8 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={0}>Select Available Unit</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.currentName} (at {i.currentLocationName})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Vendor Selection */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-rose-600"></div>
                                    II. Consignee Allocation
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary-500" /> Target Vendor / Party
                                    </label>
                                    <select
                                        value={targetPartyId}
                                        onChange={(e) => setTargetPartyId(Number(e.target.value))}
                                        className="w-full h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-lg font-black px-8 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={0}>Select Target Vendor</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-12 border-t border-gray-50">
                            <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-rose-600"></div>
                                III. Movement Justification
                            </h3>
                            <div className="space-y-4">
                                <label className="text-sm font-black text-gray-700 ml-1 uppercase">Dispatch Remarks / Purpose</label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="rounded-[2rem] min-h-[120px] bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-bold p-8 leading-relaxed text-base"
                                    placeholder="e.g. Sent for annual maintenance, Sent for cavity modification as per DRW-X..."
                                />
                            </div>
                        </div>

                        <div className="bg-rose-50/50 rounded-[2.5rem] p-10 flex items-start gap-8 border-2 border-rose-100/50">
                            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border-2 border-rose-100 shadow-sm shrink-0">
                                <Briefcase className="w-8 h-8 text-rose-500" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-rose-700 tracking-tight">Responsibility Shift</h4>
                                <p className="text-rose-600/80 font-bold leading-relaxed">
                                    Upon processing this Outward entry, the <span className="underline font-black">Stock Holder</span> for this asset will immediately shift to the selected vendor. No QC is required for outward dispatch.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !selectedItemId || !targetPartyId}
                                className="h-24 px-12 rounded-[2.5rem] bg-rose-600 hover:bg-rose-700 text-white shadow-2xl shadow-rose-500/30 flex items-center gap-6 transition-all active:scale-95 group disabled:grayscale"
                            >
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Issue Gate Pass</p>
                                    <p className="text-3xl font-black tracking-tighter">Confirm Dispatch</p>
                                </div>
                                <ArrowUpRight className="w-10 h-10 group-hover:scale-125 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
