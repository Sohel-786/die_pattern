"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Save, RotateCcw,
    Package, MapPin, ArrowRight, ShieldCheck,
    Info, AlertCircle, HelpCircle
} from "lucide-react";
import api from "@/lib/api";
import { Item, Location, HolderType, MovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function SystemReturnPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedItemId, setSelectedItemId] = useState<number>(0);
    const [targetLocationId, setTargetLocationId] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [remarks, setRemarks] = useState("");

    const { data: items = [], isLoading: loadingItems } = useQuery<Item[]>({
        queryKey: ["items", "active"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return res.data.data;
        },
    });

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations/active");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/movements", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movements"] });
            toast.success("Return recorded. Sent for QC verification.");
            router.push("/movements");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Execution failed")
    });

    const handleCreate = () => {
        if (!selectedItemId || !targetLocationId || !reason) {
            toast.error("Please fill all mandatory fields (Item, Location, Reason)");
            return;
        }
        createMutation.mutate({
            type: MovementType.SystemReturn,
            itemId: selectedItemId,
            toType: HolderType.Location,
            toLocationId: targetLocationId,
            reason,
            remarks
        });
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-12 pb-32">
            <div className="flex items-center gap-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="h-16 w-16 rounded-[2rem] bg-white shadow-xl border border-gray-100 flex items-center justify-center hover:bg-secondary-50 transition-all"
                >
                    <ArrowLeft className="w-8 h-8 text-gray-400" />
                </Button>
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">System Stock Return</h1>
                    <p className="text-gray-400 mt-2 font-bold flex items-center gap-2 uppercase text-xs tracking-widest text-amber-600">
                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
                        Internal Reconciliation & Stock Adjustment
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 space-y-10">
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-black/5 border border-gray-100 space-y-12 relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Step 1: Item Selection */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                                    I. Entity Identification
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Package className="w-4 h-4 text-amber-500" /> Item Unit
                                    </label>
                                    <select
                                        value={selectedItemId}
                                        onChange={(e) => setSelectedItemId(Number(e.target.value))}
                                        className="w-full h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-lg font-black px-8 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={0}>Select Unit for Return</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.currentName} (Currently: {i.currentHolderType === HolderType.Location ? i.currentLocationName : i.currentPartyName})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Target Location Selection */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                                    II. Destination Rack
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-amber-500" /> Target Storage Zone
                                    </label>
                                    <select
                                        value={targetLocationId}
                                        onChange={(e) => setTargetLocationId(Number(e.target.value))}
                                        className="w-full h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-lg font-black px-8 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={0}>Select Target Location</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-12 border-t border-gray-50">
                            <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                                III. Audit Compliance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <HelpCircle className="w-4 h-4 text-amber-500" /> Primary Reason (Mandatory)
                                    </label>
                                    <Input
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        className="h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-base font-black px-8 focus:bg-white transition-all"
                                        placeholder="e.g. Incorrect stock entry, Damage during transport..."
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Info className="w-4 h-4 text-gray-400" /> Detailed Explanation (Optional)
                                    </label>
                                    <Input
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-base font-black px-8 focus:bg-white transition-all shadow-sm"
                                        placeholder="Provide further context if needed..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-[2.5rem] p-10 flex items-start gap-8 border-2 border-amber-100/50 shadow-inner">
                            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border-2 border-amber-100 shadow-sm shrink-0">
                                <AlertCircle className="w-8 h-8 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-amber-700 tracking-tight">Pre-QC Quarantine</h4>
                                <p className="text-amber-600/80 font-bold leading-relaxed">
                                    System Returns are treated as high-risk movements. This unit will be locked in the <span className="underline font-black">QC WAITING</span> pool until a certification officer approves the state of the asset.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !selectedItemId || !targetLocationId || !reason}
                                className="h-24 px-12 rounded-[2.5rem] bg-amber-600 hover:bg-amber-700 text-white shadow-2xl shadow-amber-500/30 flex items-center gap-6 transition-all active:scale-95 group disabled:grayscale"
                            >
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Audit Log Execution</p>
                                    <p className="text-3xl font-black tracking-tighter">Submit Return</p>
                                </div>
                                <RotateCcw className="w-10 h-10 group-hover:rotate-180 transition-transform duration-700" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
