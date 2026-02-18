"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Plus, Trash2, Save, ShoppingCart,
    Package, Layers, ArrowRight, Building2, IndianRupee,
    Calendar as CalendarIcon, FileDown, Paperclip
} from "lucide-react";
import api from "@/lib/api";
import { PIItem, Party } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function CreatePOPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedPiItemIds, setSelectedPiItemIds] = useState<number[]>([]);
    const [vendorId, setVendorId] = useState<number>(0);
    const [rate, setRate] = useState<number>(0);
    const [deliveryDate, setDeliveryDate] = useState("");
    const [remarks, setRemarks] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: piItems = [], isLoading: loadingItems } = useQuery<PIItem[]>({
        queryKey: ["purchase-indents", "approved-items"],
        queryFn: async () => {
            const res = await api.get("/purchase-indents/approved-items");
            return res.data.data;
        },
    });

    const { data: vendors = [], isLoading: loadingVendors } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/purchase-orders", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-indents", "approved-items"] });
            toast.success("Purchase Order issued successfully");
            router.push("/purchase-orders");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Creation failed")
    });

    const filteredPiItems = piItems.filter(i =>
        (i.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.mainPartName.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedPiItemIds.includes(i.id)
    );

    const selectedItems = piItems.filter(i => selectedPiItemIds.includes(i.id));

    const toggleItem = (id: number) => {
        setSelectedPiItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreate = () => {
        if (selectedPiItemIds.length === 0) {
            toast.error("Please select at least one item from indents");
            return;
        }
        if (!vendorId) {
            toast.error("Please select a vendor");
            return;
        }
        createMutation.mutate({
            vendorId,
            rate,
            deliveryDate,
            remarks,
            piItemIds: selectedPiItemIds
        });
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-12 pb-32">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-16 w-16 rounded-[2rem] bg-white shadow-xl border border-gray-100 flex items-center justify-center hover:bg-secondary-50 transition-all hover:scale-110 active:scale-95"
                    >
                        <ArrowLeft className="w-8 h-8 text-gray-400" />
                    </Button>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Issue Work Order</h1>
                        <p className="text-gray-400 mt-2 font-bold text-lg flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full bg-primary-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>
                            Assigning approved indents to vendor for production/repair
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-12">
                {/* Left: Configuration & Selected Summary */}
                <div className="xl:col-span-8 space-y-10">
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-black/5 border border-gray-100 space-y-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10"></div>

                        <div className="space-y-8">
                            <h3 className="text-xs font-black text-primary-600 uppercase tracking-[0.2em] flex items-center gap-4">
                                <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                Order Specification
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary-500" /> Authorized Vendor
                                    </label>
                                    <select
                                        value={vendorId}
                                        onChange={(e) => setVendorId(Number(e.target.value))}
                                        className="w-full h-16 rounded-3xl bg-secondary-50/50 border-gray-200 text-base font-black px-6 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        <option value={0}>Select Vendor Entity</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4 text-emerald-500" /> Commercial Quote
                                    </label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <Input
                                            type="number"
                                            value={rate}
                                            onChange={(e) => setRate(Number(e.target.value))}
                                            className="pl-12 rounded-3xl h-16 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-black text-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4 text-indigo-500" /> Delivery Target
                                    </label>
                                    <Input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="rounded-3xl h-16 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-black"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-gray-50 mt-10">
                                <label className="text-sm font-black text-gray-700 ml-1 uppercase">Contractual Terms / Remarks</label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="rounded-[2rem] min-h-[140px] bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-bold p-8 leading-relaxed"
                                    placeholder="Specify special instructions, quality criteria, or terms of delivery..."
                                />
                            </div>
                        </div>

                        <div className="space-y-8 pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-[0.2em] flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-primary-600"></div>
                                    Consolidated Items ({selectedPiItemIds.length})
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {selectedItems.length > 0 ? selectedItems.map((item, idx) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex items-center justify-between p-7 bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm group hover:border-primary-400 hover:shadow-xl hover:shadow-primary/5 transition-all relative"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
                                                    <Package className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-base">{item.currentName}</p>
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.1em] mt-1 italic">Linked Indent: {item.piNo || 'GEN001'}</p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => toggleItem(item.id)}
                                                className="h-12 w-12 rounded-2xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                                            >
                                                <Trash2 className="w-6 h-6" />
                                            </Button>
                                        </motion.div>
                                    )) : (
                                        <div className="col-span-full py-32 text-center border-4 border-dashed border-gray-50 rounded-[3rem] space-y-6 bg-secondary-50/20">
                                            <div className="h-24 w-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-gray-100">
                                                <Layers className="w-10 h-10 text-gray-200" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900 font-black text-xl">Allocation Stack Empty</p>
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Pull items from the indent registry to proceed</p>
                                            </div>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Indent Registry Selector */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden flex flex-col h-[850px] sticky top-8">
                        <div className="p-10 border-b border-gray-50 flex flex-col gap-8 bg-secondary-100/30">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] flex items-center gap-3">
                                    <ShoppingCart className="w-5 h-5 text-primary-600" />
                                    Indent Registry
                                </h3>
                                <span className="text-primary-800 bg-primary-100 px-4 py-1.5 rounded-full text-[10px] font-black border border-primary-200">{piItems.length} APPROVED ITEMS</span>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                                <Input
                                    placeholder="Find approved indent items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-16 h-18 rounded-[2rem] border-none bg-white shadow-xl font-black text-base placeholder:font-bold"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-hide">
                            {filteredPiItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full flex items-center justify-between p-6 rounded-[2.5rem] border-2 border-transparent hover:border-primary-100 hover:bg-primary-50/50 transition-all text-left bg-secondary-50/20 group animate-in fade-in slide-in-from-right-2 duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 border-2 border-gray-50 shadow-sm group-hover:scale-105 transition-transform">
                                            <Package className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-gray-800 leading-tight break-words max-w-[200px]">{item.currentName}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">MAIN: {item.mainPartName}</p>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                                        <Plus className="w-5 h-5 text-gray-300 group-hover:text-white" />
                                    </div>
                                </button>
                            ))}
                            {filteredPiItems.length === 0 && (
                                <div className="p-20 text-center opacity-40 grayscale">
                                    <Paperclip className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                    <p className="text-xs font-black uppercase tracking-widest">No available indents</p>
                                </div>
                            )}
                        </div>

                        <div className="p-10 bg-gray-900 border-t border-gray-800">
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || selectedPiItemIds.length === 0 || !vendorId}
                                className="w-full h-24 rounded-[2.5rem] bg-primary-600 hover:bg-primary-700 text-white shadow-2xl shadow-primary/40 flex items-center justify-center gap-6 group transition-all relative overflow-hidden active:scale-95"
                            >
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent shadow-lg"></div>
                                        <span className="text-2xl font-black uppercase tracking-tighter">Issuing Order...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-start leading-none text-left">
                                            <span className="text-xs font-black uppercase tracking-[0.3em] opacity-60 mb-2 text-primary-200">Execution Phase</span>
                                            <span className="text-3xl font-black tracking-tighter">Finalize Order</span>
                                        </div>
                                        <div className="h-16 w-16 rounded-[1.5rem] bg-primary-500/50 flex items-center justify-center group-hover:bg-white transition-colors">
                                            <ArrowRight className="w-8 h-8 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
