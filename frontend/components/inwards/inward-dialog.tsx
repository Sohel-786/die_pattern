"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2, Calendar, Package, FileText, Truck, Briefcase, Trash2, Info, Building2, ChevronRight, Plus
} from "lucide-react";
import api from "@/lib/api";
import { Inward, InwardSourceType, Party } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SourceSelectionDialog } from "./source-selection-dialog";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InwardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inwardId?: number | null;
}

interface InwardLineDraft {
    id?: number;
    itemId: number;
    itemName: string;
    mainPartName: string;
    quantity: number;
    sourceType: InwardSourceType;
    sourceRefId: number;
    sourceRefDisplay: string;
    remarks: string;
    vendorId?: number;
    vendorName?: string;
}

export function InwardDialog({
    open,
    onOpenChange,
    inwardId
}: InwardDialogProps) {
    const isEditing = !!inwardId;
    const queryClient = useQueryClient();

    const [vendorId, setVendorId] = useState<number>(0);
    const [inwardDate, setInwardDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [remarks, setRemarks] = useState("");
    const [lines, setLines] = useState<InwardLineDraft[]>([]);
    const [nextCode, setNextCode] = useState("");
    const [selectedSourceType, setSelectedSourceType] = useState<InwardSourceType>(InwardSourceType.PO);
    const [sourceSelectionOpen, setSourceSelectionOpen] = useState(false);

    const { data: inward, isLoading: loadingInward } = useQuery<Inward>({
        queryKey: ["inwards", inwardId],
        queryFn: async () => {
            const res = await api.get(`/inwards/${inwardId}`);
            return res.data.data;
        },
        enabled: open && !!inwardId
    });

    const { data: vendors = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data;
        },
        enabled: open
    });

    useEffect(() => {
        if (!open) return;
        if (isEditing && inward) {
            setNextCode(inward.inwardNo);
            setVendorId(inward.vendorId || 0);
            setInwardDate(format(new Date(inward.inwardDate), "yyyy-MM-dd"));
            setRemarks(inward.remarks || "");
            setLines(inward.lines.map(l => ({
                id: l.id,
                itemId: l.itemId,
                itemName: l.itemName || l.mainPartName || "No Name",
                mainPartName: l.mainPartName || "",
                quantity: l.quantity,
                sourceType: l.sourceType,
                sourceRefId: l.sourceRefId || 0,
                sourceRefDisplay: l.sourceRefDisplay || "",
                remarks: l.remarks || ""
            })));
        } else if (!isEditing) {
            setVendorId(0);
            setInwardDate(format(new Date(), "yyyy-MM-dd"));
            setRemarks("");
            setLines([]);
            api.get("/inwards/next-code").then(res => setNextCode(res.data.data));
        }
    }, [open, isEditing, inward]);

    const mutation = useMutation({
        mutationFn: (data: any) => isEditing ? api.put(`/inwards/${inwardId}`, data) : api.post("/inwards", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            toast.success(isEditing ? "Inward updated" : "Inward receipt saved");
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Operation failed")
    });

    const handleAddItems = (newItems: InwardLineDraft[]) => {
        setLines(prev => {
            const next = [...prev];
            newItems.forEach(ni => {
                const exists = next.find(x => x.sourceType === ni.sourceType && x.sourceRefId === ni.sourceRefId && x.itemId === ni.itemId);
                if (!exists) next.push({ ...ni, quantity: 1 }); // Force quantity 1
            });
            return next;
        });

        // Auto-set vendor if not set
        if (!vendorId && newItems.length > 0 && newItems[0].vendorId) {
            setVendorId(newItems[0].vendorId);
        }
    };

    const removeLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const updateLineRemark = (idx: number, val: string) => {
        setLines(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], remarks: val };
            return next;
        });
    };

    const handleSubmit = () => {
        if (!vendorId) return toast.error("Please select Vendor / Party");
        if (lines.length === 0) return toast.error("At least one item line is required");

        const payload = {
            vendorId,
            inwardDate,
            remarks,
            lines: lines.map(l => ({
                itemId: l.itemId,
                quantity: 1, // Always 1 per requirement
                sourceType: l.sourceType,
                sourceRefId: l.sourceRefId,
                remarks: l.remarks
            }))
        };
        mutation.mutate(payload);
    };

    const selectedVendor = vendors.find(v => v.id === vendorId);

    if (!open) return null;

    const sourceOptions = [
        { label: "Purchase Order", value: InwardSourceType.PO },
        { label: "Job Work", value: InwardSourceType.JobWork },
        { label: "Outward Return", value: InwardSourceType.OutwardReturn }
    ];

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? "Edit Inward Receipt" : "Inward Receipt"}
            size="full"
            contentScroll={false}
            className="overflow-hidden border-none shadow-2xl flex flex-col"
        >
            <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                {loadingInward && isEditing ? (
                    <div className="flex flex-1 items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                            {/* Header Fields Block */}
                            <div className="grid grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl border border-secondary-200/60 shadow-sm">
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-secondary-600">Inward No.</Label>
                                    <Input value={nextCode} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm font-semibold" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-secondary-600">Inward Date</Label>
                                    <div className="mt-0.5">
                                        <Input
                                            readOnly
                                            value={format(new Date(inwardDate + "T00:00:00"), "dd-MMM-yyyy")}
                                            className="h-9 w-full text-sm border-secondary-200 bg-secondary-50 font-semibold cursor-default"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs font-semibold text-secondary-600">Vendor / Party *</Label>
                                    <div className="mt-0.5">
                                        <SearchableSelect
                                            options={vendors.map(v => ({ label: v.name, value: v.id }))}
                                            value={vendorId}
                                            onChange={(id) => setVendorId(Number(id))}
                                            placeholder="Search vendors..."
                                        />
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs font-semibold text-secondary-600">Address</Label>
                                    <Input value={selectedVendor?.address || "—"} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm truncate" />
                                </div>
                            </div>

                            {/* Source Selection - Dropdown Replacement */}
                            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-secondary-200/60 shadow-sm">
                                <div className="flex flex-col gap-1 pr-4 border-r border-secondary-100">
                                    <span className="text-[10px] font-black uppercase text-secondary-400 tracking-widest">Select Source Type</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedSourceType}
                                            onChange={(e) => setSelectedSourceType(Number(e.target.value))}
                                            className="h-9 w-48 px-3 rounded-lg border border-secondary-200 bg-secondary-50/50 text-sm font-bold text-secondary-700 focus:border-primary-500 focus:ring-0 transition-all outline-none"
                                        >
                                            {sourceOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <Button
                                            type="button"
                                            onClick={() => setSourceSelectionOpen(true)}
                                            className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest gap-2 rounded-lg shadow-sm shadow-primary-200"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Import Items
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center gap-2 px-4 opacity-50">
                                    <Info className="w-4 h-4 text-secondary-400" />
                                    <p className="text-xs font-medium text-secondary-500">Choose source type and click import to load pending items from your masters.</p>
                                </div>
                            </div>

                            {/* Items table */}
                            <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden shadow-sm">
                                <div className="flex-1 min-h-0 overflow-auto">
                                    <table className="w-full border-collapse text-sm">
                                        <thead className="sticky top-0 bg-[#fcfdfe] border-b border-secondary-200 z-10 font-sans shadow-sm">
                                            <tr>
                                                <th className="text-center py-3 px-4 font-black text-secondary-400 text-[10px] uppercase tracking-widest w-12">Sr</th>
                                                <th className="text-left py-3 px-4 font-black text-secondary-400 text-[10px] uppercase tracking-widest">Item Specification</th>
                                                <th className="text-left py-3 px-4 font-black text-secondary-400 text-[10px] uppercase tracking-widest w-48">
                                                    Reference No.
                                                </th>
                                                <th className="text-left py-3 px-4 font-black text-secondary-400 text-[10px] uppercase tracking-widest">Line Remarks</th>
                                                <th className="text-center py-3 px-4 font-black text-secondary-400 text-[10px] uppercase tracking-widest w-12"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {lines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                                            <Package className="w-16 h-16" />
                                                            <p className="text-sm font-black uppercase tracking-widest">No items added yet</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                lines.map((line, idx) => (
                                                    <tr key={idx} className="hover:bg-primary-50/20 group transition-colors">
                                                        <td className="py-2.5 px-4 text-center text-secondary-300 font-black text-xs">{idx + 1}</td>
                                                        <td className="py-2.5 px-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-secondary-900 leading-tight">{line.itemName}</span>
                                                                <span className="text-[10px] text-secondary-500 font-medium">{line.mainPartName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-4">
                                                            <div className="inline-flex flex-col px-2.5 py-1 rounded bg-secondary-50 border border-secondary-100/50">
                                                                <span className="text-[8px] font-black text-primary-500 uppercase leading-none mb-0.5">
                                                                    {line.sourceType === InwardSourceType.PO ? "PO No" : line.sourceType === InwardSourceType.JobWork ? "JW No" : "Out No"}
                                                                </span>
                                                                <span className="font-bold text-secondary-700 text-xs tracking-tight">{line.sourceRefDisplay}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-4">
                                                            <Input
                                                                placeholder="Line notes..."
                                                                value={line.remarks}
                                                                onChange={(e) => updateLineRemark(idx, e.target.value)}
                                                                className="h-8 border-transparent hover:border-secondary-200 focus:border-primary-400 text-sm italic bg-secondary-50/30 rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-4 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeLine(idx)}
                                                                className="h-8 w-8 p-0 text-secondary-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Overall Remarks Block */}
                            <div className="bg-white p-4 rounded-xl border border-secondary-200/60 shadow-sm flex flex-col gap-2">
                                <Label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest block leading-none">Overall Receipt Remarks</Label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Optional header level remarks..."
                                    className="min-h-[64px] text-sm border-secondary-100 bg-secondary-50/20 rounded-lg resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer: simplified as per request */}
                        <footer className="shrink-0 border-t border-secondary-200 bg-white px-8 py-4 flex items-center justify-end gap-4 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.05)]">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="h-10 px-8 font-black uppercase tracking-widest text-[10px] text-secondary-400 hover:text-secondary-900 transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={mutation.isPending || lines.length === 0}
                                className="h-10 px-10 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[10px] rounded-lg shadow-lg shadow-primary-200 transition-all active:scale-95"
                            >
                                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Entry"}
                            </Button>
                        </footer>
                    </>
                )}
            </div>

            <SourceSelectionDialog
                isOpen={sourceSelectionOpen}
                onClose={() => setSourceSelectionOpen(false)}
                sourceType={selectedSourceType}
                onSelect={handleAddItems}
                alreadySelectedIds={lines.filter(l => l.sourceType === selectedSourceType).map(l => l.sourceRefId)}
            />
        </Dialog>
    );
}
