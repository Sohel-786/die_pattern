"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Save, ArrowDownLeft,
    Package, Building2, MapPin, ShoppingCart,
    ArrowRight, ShieldCheck, Info
} from "lucide-react";
import api from "@/lib/api";
import { PO, Location, HolderType, MovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function InwardEntryPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedPoId, setSelectedPoId] = useState<number>(0);
    const [selectedItemId, setSelectedItemId] = useState<number>(0);
    const [targetLocationId, setTargetLocationId] = useState<number>(0);
    const [remarks, setRemarks] = useState("");

    const { data: orders = [], isLoading: loadingOrders } = useQuery<PO[]>({
        queryKey: ["purchase-orders", "approved"],
        queryFn: async () => {
            const res = await api.get("/purchase-orders");
            return res.data.data.filter((po: any) => po.status === 'Approved');
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
            toast.success("Inward entry recorded. Sent for QC.");
            router.push("/movements");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Entry failed")
    });

    const selectedPo = orders.find(o => o.id === selectedPoId);

    const handleCreate = () => {
        if (!selectedItemId || !targetLocationId) {
            toast.error("Please select item and target location");
            return;
        }
        createMutation.mutate({
            type: MovementType.Inward,
            itemId: selectedItemId,
            toType: HolderType.Location,
            toLocationId: targetLocationId,
            purchaseOrderId: selectedPoId,
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
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Inward Material Entry</h1>
                    <p className="text-gray-400 mt-2 font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        Reception & Quality Control Initiation
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 space-y-10">
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-black/5 border border-gray-100 space-y-12 relative overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Step 1: PO Selection */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                    I. Authorization Reference
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-primary-500" /> Purchase Order Number
                                    </label>
                                    <SearchableSelect
                                        options={orders.map(o => ({ value: o.id, label: `${o.poNo} - ${o.vendorName}` }))}
                                        value={selectedPoId || ""}
                                        onChange={(val) => {
                                            setSelectedPoId(Number(val));
                                            setSelectedItemId(0);
                                        }}
                                        placeholder="Select Active PO"
                                    />
                                </div>
                            </div>

                            {/* Step 2: Item Selection (based on PO) */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                    II. Cargo Identification
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Package className="w-4 h-4 text-emerald-500" /> Item Unit
                                    </label>
                                    <SearchableSelect
                                        disabled={!selectedPoId}
                                        options={(selectedPo?.items || []).map(i => ({ value: i.itemId, label: i.currentName }))}
                                        value={selectedItemId || ""}
                                        onChange={(val) => setSelectedItemId(Number(val))}
                                        placeholder="Select Unit from PO"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-gray-50 pt-12">
                            {/* Step 3: Destination */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                    III. Storage Destination
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-amber-500" /> Direct Inward Location
                                    </label>
                                    <SearchableSelect
                                        options={locations.map(l => ({ value: l.id, label: `${l.name} (${l.company?.name || ''})` }))}
                                        value={targetLocationId || ""}
                                        onChange={(val) => setTargetLocationId(Number(val))}
                                        placeholder="Select Inspection Rack"
                                    />
                                </div>
                            </div>

                            {/* Step 4: Remarks */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                    IV. Condition Report
                                </h3>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase">Visual Observations / Docs</label>
                                    <Input
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="h-18 rounded-3xl bg-secondary-50/50 border-gray-200 text-base font-black px-8 focus:bg-white transition-all"
                                        placeholder="e.g. Received in good condition with test reports"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-[2.5rem] p-10 flex items-start gap-8 border-2 border-amber-100/50">
                            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center border-2 border-amber-100 shadow-sm shrink-0">
                                <ShieldCheck className="w-8 h-8 text-amber-500" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-amber-700 tracking-tight">Quality Control Protocol</h4>
                                <p className="text-amber-600/80 font-bold leading-relaxed">
                                    This Inward entry will be placed in a <span className="underline font-black">QUARANTINE</span> state. No production movements will be allowed until a formal Quality Control inspection is performed and approved.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !selectedItemId || !targetLocationId}
                                className="h-24 px-12 rounded-[2.5rem] bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl shadow-emerald-500/30 flex items-center gap-6 transition-all active:scale-95 group disabled:grayscale"
                            >
                                <div className="text-left">
                                    <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">Submit Transaction</p>
                                    <p className="text-3xl font-black tracking-tighter">Process Inward</p>
                                </div>
                                <ArrowDownLeft className="w-10 h-10 group-hover:scale-125 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
