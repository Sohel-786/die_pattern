"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Search, Plus, Trash2, Save, ShoppingCart,
    Package, Layers, ArrowRight, Building2, IndianRupee,
    Calendar as CalendarIcon, Paperclip, Loader2, Upload, X
} from "lucide-react";
import api from "@/lib/api";
import { PurchaseIndentItem, Party, GstType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export default function CreatePOPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const piIdsParam = searchParams.get('piIds');

    const [selectedPiItemIds, setSelectedPiItemIds] = useState<number[]>([]);
    const [vendorId, setVendorId] = useState<number>(0);
    const [rate, setRate] = useState<number>(0);
    const [deliveryDate, setDeliveryDate] = useState("");
    const [remarks, setRemarks] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [gstType, setGstType] = useState<GstType | "">("");
    const [gstPercent, setGstPercent] = useState<number>(18);
    const [quotationUrls, setQuotationUrls] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    const { data: piItems = [], isLoading: loadingItems } = useQuery<PurchaseIndentItem[]>({
        queryKey: ["purchase-indents", "approved-items"],
        queryFn: async () => {
            const res = await api.get("/purchase-indents/approved-items");
            return res.data.data;
        },
    });

    useEffect(() => {
        if (piIdsParam && piItems.length > 0) {
            const piIds = piIdsParam.split(',').map(Number);
            const itemsToSelect = piItems
                .filter(item => piIds.includes(item.purchaseIndentId))
                .map(item => item.id);

            if (itemsToSelect.length > 0) {
                setSelectedPiItemIds(prev => {
                    const combined = new Set([...prev, ...itemsToSelect]);
                    return Array.from(combined);
                });
            }
        }
    }, [piIdsParam, piItems]);

    const { data: vendors = [], isLoading: loadingVendors } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/purchase-orders", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-indents", "approved-items"] });
            toast.success("Purchase Order saved as draft");
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const form = new FormData();
                form.append("file", files[i]);
                const res = await api.post("/purchase-orders/upload-quotation", form, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                const url = res.data?.data?.url;
                if (url) setQuotationUrls((prev) => [...prev, url]);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const removeQuotation = (index: number) => {
        setQuotationUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const gstAmount = rate && gstPercent != null ? Math.round((rate * gstPercent) / 100 * 100) / 100 : 0;
    const totalAmount = rate != null ? (gstAmount + rate) : 0;

    const handleCreate = () => {
        if (selectedPiItemIds.length === 0) {
            toast.error("Please select at least one item from purchase indents");
            return;
        }
        if (!vendorId) {
            toast.error("Please select a vendor");
            return;
        }
        createMutation.mutate({
            vendorId,
            rate: rate || undefined,
            deliveryDate: deliveryDate || undefined,
            remarks: remarks || undefined,
            quotationUrls: quotationUrls.length ? quotationUrls : undefined,
            gstType: gstType || undefined,
            gstPercent: gstPercent ?? undefined,
            purchaseIndentItemIds: selectedPiItemIds
        });
    };

    return (
        <div className="p-4 bg-secondary-50/30 min-h-screen pb-20">
            <div className="max-w-[1400px] mx-auto space-y-4">
                <div className="flex items-center gap-4 mb-2">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-lg bg-white shadow-sm border border-secondary-200 flex items-center justify-center hover:bg-secondary-50 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Issue Work Order</h1>
                        <p className="text-secondary-500 text-sm">Convert approved indents into production purchase orders</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Configuration */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-secondary-200 shadow-sm overflow-hidden">
                            <div className="p-6 bg-white border-b border-secondary-100 italic">
                                <h3 className="text-xs font-bold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>
                                    Order Specification
                                </h3>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Vendor Entity</Label>
                                        <SearchableSelect
                                            options={vendors.map(v => ({ value: v.id, label: v.name }))}
                                            value={vendorId || ""}
                                            onChange={(val) => setVendorId(Number(val))}
                                            placeholder="Select Vendor..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Commercial Quote</Label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                            <Input
                                                type="number"
                                                value={rate}
                                                onChange={(e) => setRate(Number(e.target.value))}
                                                className="pl-9 h-10 border-secondary-200 focus:border-primary-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Delivery Target</Label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                            <Input
                                                type="date"
                                                value={deliveryDate}
                                                onChange={(e) => setDeliveryDate(e.target.value)}
                                                className="pl-9 h-10 border-secondary-200 focus:border-primary-500 transition-all font-bold text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">GST Type</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-md border border-secondary-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                                            value={gstType}
                                            onChange={(e) => setGstType(e.target.value as GstType | "")}
                                        >
                                            <option value="">— Select —</option>
                                            <option value={GstType.CGST_SGST}>CGST + SGST</option>
                                            <option value={GstType.IGST}>IGST</option>
                                            <option value={GstType.UGST}>UGST</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">GST %</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={gstPercent}
                                            onChange={(e) => setGstPercent(Number(e.target.value) || 0)}
                                            className="h-10 border-secondary-200 focus:border-primary-500 font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Taxable · GST · Total</Label>
                                        <div className="h-10 px-3 flex items-center gap-2 text-sm font-bold text-secondary-700 bg-secondary-50 rounded-md border border-secondary-200">
                                            <span>₹ {rate?.toLocaleString() ?? "0"}</span>
                                            <span className="text-primary-600">+ ₹ {gstAmount.toLocaleString()}</span>
                                            <span>= ₹ {totalAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Quotation attachments</Label>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-sm font-medium text-secondary-700">
                                            <Upload className="w-4 h-4" />
                                            {uploading ? "Uploading..." : "Add file(s)"}
                                            <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" multiple onChange={handleFileSelect} disabled={uploading} />
                                        </label>
                                        {quotationUrls.map((url, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-secondary-100 rounded text-xs font-medium text-secondary-700">
                                                {url.split("/").pop()?.slice(0, 20)}…
                                                <button type="button" onClick={() => removeQuotation(i)} className="p-0.5 hover:bg-secondary-200 rounded"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Contractual Terms / Remarks</Label>
                                    <Textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="min-h-[100px] border-secondary-200 focus:border-primary-500 transition-all font-medium p-4 text-sm"
                                        placeholder="Special instructions, quality criteria, or terms of delivery..."
                                    />
                                </div>
                            </div>
                        </Card>

                        <Card className="border-secondary-200 shadow-sm overflow-hidden">
                            <div className="p-6 bg-white border-b border-secondary-100 flex items-center justify-between">
                                <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary-500" />
                                    Selected Items ({selectedPiItemIds.length})
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {selectedItems.length > 0 ? selectedItems.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="flex items-center justify-between p-4 bg-white rounded-xl border border-secondary-200 hover:border-primary-200 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                                        <Package className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900 text-[11px] uppercase leading-tight">{item.currentName}</p>
                                                        <p className="text-[9px] font-bold text-secondary-400 uppercase tracking-wider italic">Ref: {item.piNo || 'GEN-IND'}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleItem(item.id)}
                                                    className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </motion.div>
                                        )) : (
                                            <div className="col-span-full py-16 text-center border-2 border-dashed border-secondary-100 rounded-2xl bg-secondary-50/20">
                                                <Layers className="w-10 h-10 text-secondary-200 mx-auto mb-3" />
                                                <p className="text-secondary-400 font-bold uppercase text-[10px] tracking-widest">No items selected yet</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Panel: Registry */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card className="border-secondary-200 shadow-sm overflow-hidden h-[calc(100vh-200px)] flex flex-col sticky top-4">
                            <div className="p-6 bg-secondary-900 text-white space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4 text-primary-400" />
                                        Indent Registry
                                    </h3>
                                    <span className="bg-primary-600 px-2 py-0.5 rounded text-[9px] font-bold">{piItems.length}</span>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                    <Input
                                        placeholder="Search indents..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-10 pl-10 border-none bg-white/10 focus:bg-white/20 text-white text-sm font-medium placeholder:text-secondary-500 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                                {filteredPiItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-secondary-100 hover:border-primary-100 hover:bg-primary-50/50 transition-all text-left bg-white group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-secondary-50 rounded-lg flex items-center justify-center text-secondary-400 group-hover:scale-110 transition-transform">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-secondary-800 leading-tight block truncate w-40">{item.currentName}</p>
                                                <p className="text-[9px] font-bold text-secondary-400 uppercase mt-0.5">{item.mainPartName}</p>
                                            </div>
                                        </div>
                                        <div className="h-7 w-7 rounded-lg bg-secondary-50 border border-secondary-100 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                                            <Plus className="w-4 h-4 text-secondary-300 group-hover:text-white" />
                                        </div>
                                    </button>
                                ))}
                                {filteredPiItems.length === 0 && (
                                    <div className="py-20 text-center opacity-40">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-400">Registry Empty</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-white border-t border-secondary-100">
                                <Button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending || selectedPiItemIds.length === 0 || !vendorId}
                                    className="w-full h-12 bg-secondary-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-between px-6"
                                >
                                    <span className="text-sm uppercase tracking-wider">Save as Draft</span>
                                    {createMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
