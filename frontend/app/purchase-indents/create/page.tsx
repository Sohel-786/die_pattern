"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Plus, Trash2, Save, FileText,
    Package, Layers, ArrowRight
} from "lucide-react";
import api from "@/lib/api";
import { Item, PurchaseIndentType, PurchaseIndent } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function CreatePIPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [type, setType] = useState<PurchaseIndentType>(PurchaseIndentType.New);
    const [remarks, setRemarks] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["items", "active"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/purchase-indents", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Purchase Indent created successfully");
            router.push("/purchase-indents");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Creation failed")
    });

    const filteredItems = items.filter(i =>
        (i.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.mainPartName.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedItemIds.includes(i.id)
    );

    const selectedItems = items.filter(i => selectedItemIds.includes(i.id));

    const toggleItem = (id: number) => {
        setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleCreate = () => {
        if (selectedItemIds.length === 0) {
            toast.error("Please select at least one item");
            return;
        }
        createMutation.mutate({
            type,
            remarks,
            itemIds: selectedItemIds
        });
    };

    const typeOptions = [
        { label: "New", value: PurchaseIndentType.New },
        { label: "Repair", value: PurchaseIndentType.Repair },
        { label: "Correction", value: PurchaseIndentType.Correction },
        { label: "Modification", value: PurchaseIndentType.Modification }
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 pb-24">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center hover:bg-secondary-50 transition-all"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-400" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Generate New Indent</h1>
                        <p className="text-gray-500 mt-1 font-semibold flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-primary-600"></span>
                            Submit a procurement or repair request
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left: Configuration */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-black/5 border border-gray-100 space-y-10">
                        <div className="space-y-6">
                            <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary-600"></div>
                                General Configuration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase">Indent Purpose</label>
                                    <div className="flex gap-2 p-1.5 bg-secondary-50 rounded-2xl border border-gray-100">
                                        {typeOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setType(opt.value)}
                                                className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${type === opt.value ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {opt.label.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-sm font-black text-gray-700 ml-1 uppercase">Additional Remarks</label>
                                    <Input
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="rounded-2xl h-14 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-bold placeholder:text-gray-300"
                                        placeholder="e.g. Urgent requirement for maintenance..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-primary-600 uppercase tracking-widest flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary-600"></div>
                                    Selected Items ({selectedItemIds.length})
                                </h3>
                            </div>

                            <div className="space-y-4">
                                {selectedItems.length > 0 ? selectedItems.map((item, idx) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-6 bg-secondary-50/50 rounded-3xl border border-gray-100 group hover:border-primary-200 transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-primary-600 shadow-sm">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900">{item.currentName}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Main: {item.mainPartName}</p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleItem(item.id)}
                                            className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                )) : (
                                    <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl space-y-3">
                                        <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                            <Layers className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No items selected yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Item Selector */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 overflow-hidden flex flex-col h-[700px]">
                        <div className="p-8 border-b border-gray-50 flex flex-col gap-6 bg-secondary-50/30">
                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center justify-between">
                                Select Components
                                <span className="text-primary-600 bg-primary-50 px-3 py-1 rounded-lg text-[9px]">{items.length} TOTAL</span>
                            </h3>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    placeholder="Find pattern/die..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-none">
                            {filteredItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => toggleItem(item.id)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-primary-100 hover:bg-primary-50/50 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center text-gray-400 border border-gray-100">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-800 leading-tight">{item.currentName}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.itemTypeName}</p>
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center transition-colors">
                                        <Plus className="w-4 h-4 text-gray-400" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={handleCreate}
                        disabled={createMutation.isPending || selectedItemIds.length === 0}
                        className="w-full h-20 rounded-[2rem] bg-primary-600 hover:bg-primary-700 text-white shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group transition-all"
                    >
                        {createMutation.isPending ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1.5 text-blue-100">Submit for Approval</span>
                                    <span className="text-xl font-black">Generate Indent</span>
                                </div>
                                <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
