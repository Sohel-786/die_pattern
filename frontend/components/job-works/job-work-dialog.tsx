"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Trash2, Save, Package, Loader2, Plus, Upload, Eye, X, Printer, FileText, ShieldCheck
} from "lucide-react";
import api from "@/lib/api";
import { JobWorkAttachmentListDialog } from "./job-work-attachment-list-dialog";
import { JwItemSelectionDialog } from "./jw-item-selection-dialog";
import { JobWork, JobWorkStatus, CreateJobWorkDto, Party, Item } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

interface JobWorkGridItem {
    itemId: number;
    itemName?: string;
    mainPartName?: string;
    itemTypeName?: string;
    materialName?: string;
    drawingNo?: string;
    revisionNo?: string;
    rate?: number;
    gstPercent?: number;
    remarks?: string;
    willChangeName?: boolean;
    proposedNewName?: string;
    isInwarded?: boolean;
}

interface JobWorkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobWork?: JobWork | null;
    readOnly?: boolean;
}

export function JobWorkDialog({ open, onOpenChange, jobWork, readOnly }: JobWorkDialogProps) {
    const isEditing = !!jobWork?.id;
    const isReadOnly = !!readOnly || (isEditing && jobWork?.isActive === false);
    const queryClient = useQueryClient();

    const [nextCode, setNextCode] = useState("");
    const [toPartyId, setToPartyId] = useState<number>(0);
    const [description, setDescription] = useState("");
    const [remarks, setRemarks] = useState("");
    const [items, setItems] = useState<JobWorkGridItem[]>([]);
    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [urlsToDelete, setUrlsToDelete] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [itemSelectionOpen, setItemSelectionOpen] = useState(false);
    const [attachmentListDialogOpen, setAttachmentListDialogOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setToPartyId(0);
            setDescription("");
            setRemarks("");
            setItems([]);
            setAttachmentUrls([]);
            setPendingFiles([]);
            setUrlsToDelete([]);
            return;
        }

        if (isEditing && jobWork) {
            setNextCode(jobWork.jobWorkNo);
            setToPartyId(jobWork.toPartyId);
            setDescription(jobWork.description || "");
            setRemarks(jobWork.remarks || "");
            setAttachmentUrls(jobWork.attachmentUrls || []);
            setPendingFiles([]);
            setUrlsToDelete([]);
            setItems(jobWork.items.map(i => ({
                itemId: i.itemId,
                itemName: i.itemName,
                mainPartName: i.mainPartName,
                itemTypeName: i.itemTypeName,
                materialName: i.materialName,
                drawingNo: i.drawingNo,
                revisionNo: i.revisionNo,
                rate: i.rate ?? undefined,
                gstPercent: i.gstPercent ?? undefined,
                remarks: i.remarks,
                willChangeName: i.willChangeName ?? false,
                proposedNewName: i.proposedNewName ?? "",
                isInwarded: i.isInwarded
            })));
        } else {
            api.get("/job-works/next-code")
                .then((res) => setNextCode(res.data?.data ?? "JW-000"))
                .catch(() => setNextCode("JW-ERROR"));
        }
    }, [open, isEditing, jobWork]);

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    const createMutation = useMutation({
        mutationFn: async (payload: CreateJobWorkDto) => api.post("/job-works", payload),
        onSuccess: () => {
            toast.success("Job Work saved successfully");
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to create Job Work")
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: CreateJobWorkDto) => api.put(`/job-works/${jobWork!.id}`, payload),
        onSuccess: () => {
            toast.success("Job Work updated successfully");
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to update Job Work")
    });

    const mutation = isEditing ? updateMutation : createMutation;

    const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const valid: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const ext = "." + (files[i].name.split(".").pop() || "").toLowerCase();
            if (ALLOWED_EXT.includes(ext) || files[i].type.startsWith('image/')) {
                valid.push(files[i]);
            }
        }
        if (valid.length === 0) {
            toast.error("Only PDF and images are allowed.");
            e.target.value = "";
            return;
        }
        setPendingFiles((prev) => [...prev, ...valid]);
        toast.success("Files added. They will be uploaded when you Save/Update.");
        e.target.value = "";
    };

    const removeUrl = (url: string) => {
        setUrlsToDelete(prev => prev.includes(url) ? prev : [...prev, url]);
    };

    const removePending = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const effectiveAttachmentCount = attachmentUrls.filter(u => !urlsToDelete.includes(u)).length + pendingFiles.length;

    const addItems = (selectedItems: Item[]) => {
        const newItems: JobWorkGridItem[] = selectedItems
            .filter(si => !items.some(existing => existing.itemId === si.id))
            .map(si => ({
                itemId: si.id,
                itemName: si.currentName,
                mainPartName: si.mainPartName,
                itemTypeName: si.itemTypeName,
                materialName: si.materialName,
                drawingNo: si.drawingNo,
                revisionNo: si.revisionNo,
                rate: 0,
                gstPercent: 18,
                remarks: "",
                willChangeName: false,
                proposedNewName: ""
            }));
        setItems(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: number) => setItems(prev => prev.filter(i => i.itemId !== id));

    const updateItem = (itemId: number, field: keyof JobWorkGridItem, value: any) => {
        setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, [field]: value } : i));
    };

    const handleSubmit = async () => {
        if (toPartyId === 0) return toast.error("Please select a Party");
        if (!description.trim()) return toast.error("Please enter a purpose/description");
        if (items.length === 0) return toast.error("Please add at least one item");
        const invalidNameChange = items.find(i => i.willChangeName && !(i.proposedNewName ?? "").trim());
        if (invalidNameChange) return toast.error("When 'Will change display name' is selected, New Display Name is required.");

        setUploading(true);
        try {
            const keptUrls = attachmentUrls.filter(u => !urlsToDelete.includes(u));
            const newUrls: string[] = [];

            for (const file of pendingFiles) {
                const formData = new FormData();
                formData.append("file", file);
                const res = await api.post("/job-works/upload-attachment", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                if (res.data?.data?.url) {
                    newUrls.push(res.data.data.url);
                }
            }

            for (const url of urlsToDelete) {
                try {
                    await api.delete(`/job-works/attachment?url=${encodeURIComponent(url)}`);
                } catch (e) { /* best effort */ }
            }

            const finalUrls = [...keptUrls, ...newUrls];

            const payload: CreateJobWorkDto = {
                toPartyId,
                description,
                remarks,
                attachmentUrls: finalUrls,
                items: items.map(i => ({
                    itemId: i.itemId,
                    rate: i.rate,
                    gstPercent: i.gstPercent,
                    remarks: i.remarks,
                    willChangeName: !!i.willChangeName,
                    proposedNewName: i.willChangeName && i.proposedNewName?.trim() ? i.proposedNewName.trim() : undefined
                }))
            };

            await mutation.mutateAsync(payload);
            setAttachmentUrls(finalUrls);
            setPendingFiles([]);
            setUrlsToDelete([]);
        } catch (err: any) {
            toast.error(err.response?.data?.message ?? "Failed to save Job Work");
        } finally {
            setUploading(false);
        }
    };

    const hasAnyInward = useMemo(() => items.some(i => i.isInwarded), [items]);

    const totalTaxable = items.reduce((sum, i) => sum + (i.rate ?? 0), 0);
    const totalGst = items.reduce((sum, i) => sum + ((i.rate ?? 0) * (i.gstPercent ?? 0)) / 100, 0);
    const finalAmount = totalTaxable + totalGst;

    const isValid = toPartyId !== 0 && description.trim() !== "" && items.length > 0;

    return (
        <>
            <Dialog
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title={isEditing ? "Edit Job Work Entry" : "New Job Work Entry"}
                size="full"
                contentScroll={false}
                className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col font-sans"
            >
                <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                    <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4 overflow-y-auto">
                        {/* Header Content */}
                        <div className="grid grid-cols-12 gap-4 items-end bg-white p-5 rounded-xl border border-secondary-200 shadow-sm">
                            <div className="col-span-12 md:col-span-2">
                                <Label className="text-xs font-semibold text-secondary-600">JW No.</Label>
                                <Input value={nextCode} readOnly className="h-9 mt-1 bg-secondary-50 border-secondary-200 text-sm font-bold text-secondary-700" />
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <Label className="text-xs font-semibold text-secondary-600">JW Date</Label>
                                <div className="h-9 mt-1 px-3 flex items-center bg-secondary-50 border border-secondary-200 rounded-lg text-sm font-medium text-secondary-700">
                                    {formatDate(isEditing && jobWork?.createdAt ? jobWork.createdAt : new Date())}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Label className="text-xs font-semibold text-secondary-600 uppercase tracking-tighter">Party (Send To) <span className="text-rose-500">*</span></Label>
                                <div className="mt-1">
                                    <SearchableSelect
                                        options={parties.map(p => ({ value: p.id, label: p.name }))}
                                        value={toPartyId || ""}
                                        onChange={(val) => setToPartyId(Number(val))}
                                        disabled={isReadOnly || hasAnyInward}
                                        placeholder={hasAnyInward ? "Locked - Active Inward Exists" : "Search Party..."}
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Label className="text-xs font-semibold text-secondary-600 uppercase tracking-tighter">Purpose / Description <span className="text-rose-500">*</span></Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isReadOnly || hasAnyInward}
                                    placeholder={hasAnyInward ? "Locked - Active Inward Exists" : "e.g. For Repairing, New Job..."}
                                    className={cn("h-9 mt-1 text-sm font-medium border-secondary-200 focus:border-primary-400", hasAnyInward && "opacity-60 cursor-not-allowed")}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-8">
                                <Label className="text-xs font-semibold text-secondary-600">Internal Remarks</Label>
                                <Input
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="Add internal notes..."
                                    className="h-9 mt-1 text-sm border-secondary-200 focus:border-primary-400"
                                />
                            </div>

                            <div className="col-span-12 md:col-span-4 flex items-end gap-2">
                                <div className="flex-1 min-w-0">
                                    <Label className="text-xs font-semibold text-secondary-600">Doc Attachments</Label>
                                    <div className={cn(
                                        "mt-1 flex items-center gap-2 h-9 min-h-9 px-3 rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50/50 hover:bg-white hover:border-primary-400 transition-all",
                                        (isReadOnly || uploading) && "opacity-50 cursor-not-allowed hover:border-secondary-200"
                                    )}>
                                        <label className={cn("flex items-center gap-1.5 shrink-0 h-full py-1 w-full", (isReadOnly || uploading) ? "cursor-not-allowed" : "cursor-pointer")}>
                                            <Upload className="w-4 h-4 text-secondary-400 shrink-0" />
                                            <span className="text-xs font-medium text-secondary-600 truncate">
                                                {uploading ? "Uploading..." : effectiveAttachmentCount === 0 ? "Upload PDF/Images" : `${effectiveAttachmentCount} file(s)`}
                                            </span>
                                            <input type="file" multiple className="hidden" onChange={handleFileSelect} disabled={isReadOnly || uploading} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" />
                                        </label>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 shrink-0 flex gap-2 font-semibold"
                                    onClick={() => setAttachmentListDialogOpen(true)}
                                    disabled={effectiveAttachmentCount === 0}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    View
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setItemSelectionOpen(true)}
                                    disabled={isReadOnly || hasAnyInward}
                                    className="h-9 shrink-0 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 rounded-lg shadow-sm gap-2 disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Items
                                </Button>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="flex-1 min-h-0 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-primary-600" />
                                </div>
                                <h3 className="font-bold text-secondary-900 tracking-tight uppercase text-xs">Line Items</h3>
                                <span className="bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded text-[10px] font-black">{items.length}</span>
                            </div>

                            <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                <div className="flex-1 overflow-auto overflow-x-auto min-h-0">
                                    <table className="w-full border-collapse text-sm min-w-[1000px]">
                                        <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 z-10">
                                            <tr>
                                                <th className="py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-12 text-center">#</th>
                                                <th className="text-left py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-64">Item Description</th>
                                                <th className="text-left py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-40">Type / Material</th>
                                                <th className="text-left py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-40">Drawing / Rev</th>
                                                <th className="text-center py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-28">Change display name?</th>
                                                <th className="text-left py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-44">New display name</th>
                                                <th className="text-right py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-32">Unit Rate (₹)</th>
                                                <th className="text-center py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-32">GST %</th>
                                                <th className="text-right py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-32">Total (₹)</th>
                                                <th className="text-left py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider">Remarks</th>
                                                {!isReadOnly && <th className="text-center py-2.5 px-4 font-semibold text-secondary-600 text-[11px] uppercase tracking-wider w-16">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={11} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                                            <Package className="w-12 h-12" />
                                                            <p className="font-bold uppercase tracking-widest text-[10px]">No items added yet</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map((item, idx) => {
                                                    const rate = item.rate ?? 0;
                                                    const gst = item.gstPercent ?? 0;
                                                    const total = rate + (rate * gst / 100);
                                                    const isLocked = item.isInwarded;

                                                    return (
                                                        <tr key={item.itemId} className={cn("hover:bg-primary-50/20 group transition-colors", isLocked && "bg-secondary-50/50")}>
                                                            <td className="py-2.5 px-4 text-center text-xs font-bold text-secondary-400">
                                                                {isLocked ? <ShieldCheck className="w-3.5 h-3.5 text-primary-500 mx-auto" /> : idx + 1}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-bold text-secondary-900 leading-tight">{item.itemName}</span>
                                                                    <span className="text-[11px] text-secondary-500 mt-0.5 truncate">{item.mainPartName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-primary-700">{item.itemTypeName}</span>
                                                                    <span className="text-[11px] text-secondary-500">{item.materialName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-secondary-800">{item.drawingNo || "N/A"}</span>
                                                                    <span className="text-[11px] text-secondary-500 font-medium">Rev: {item.revisionNo || "0"}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center">
                                                                <label className={cn("inline-flex items-center gap-1.5 text-xs font-medium", (isReadOnly || isLocked) && "opacity-60 cursor-not-allowed")}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!item.willChangeName}
                                                                        onChange={(e) => updateItem(item.itemId, "willChangeName", e.target.checked)}
                                                                        disabled={isReadOnly || isLocked}
                                                                        className="rounded border-secondary-300"
                                                                    />
                                                                    Yes
                                                                </label>
                                                                {isLocked && <p className="text-[10px] text-secondary-400 mt-0.5">Locked</p>}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <Input
                                                                    value={item.willChangeName ? (item.proposedNewName ?? "") : ""}
                                                                    onChange={(e) => updateItem(item.itemId, "proposedNewName", e.target.value)}
                                                                    disabled={isReadOnly || isLocked || !item.willChangeName}
                                                                    placeholder={item.willChangeName ? "Enter new display name" : "—"}
                                                                    className={cn("h-8 text-xs border-secondary-200 bg-secondary-50/30 w-full", (!item.willChangeName || isReadOnly || isLocked) && "opacity-60")}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <Input
                                                                    type="number"
                                                                    value={item.rate || ""}
                                                                    onChange={(e) => updateItem(item.itemId, "rate", Number(e.target.value))}
                                                                    disabled={isReadOnly || isLocked}
                                                                    className={cn("h-8 text-right font-bold text-xs border-secondary-200 bg-secondary-50/30 w-full", (isReadOnly || isLocked) && "opacity-60 cursor-not-allowed")}
                                                                    placeholder="0.00"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <Input
                                                                    type="number"
                                                                    value={item.gstPercent ?? 18}
                                                                    onChange={(e) => updateItem(item.itemId, "gstPercent", Number(e.target.value))}
                                                                    disabled={isReadOnly || isLocked}
                                                                    className={cn("h-8 text-center font-bold text-xs border-secondary-200 bg-secondary-50/30 w-full", (isReadOnly || isLocked) && "opacity-60 cursor-not-allowed")}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right font-bold text-secondary-900 tabular-nums">
                                                                {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="py-2.5 px-4">
                                                                <Input
                                                                    value={item.remarks || ""}
                                                                    onChange={(e) => updateItem(item.itemId, "remarks", e.target.value)}
                                                                    disabled={isReadOnly || isLocked}
                                                                    placeholder={isLocked ? "Locked - Inwarded" : (isReadOnly ? "Locked - Inactive" : "Line note...")}
                                                                    className={cn("h-8 text-xs italic border-secondary-200 bg-secondary-50/30 w-full", (isReadOnly || isLocked) && "opacity-60 cursor-not-allowed")}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center">
                                                                {!isReadOnly && !isLocked && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => removeItem(item.itemId)}
                                                                        className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-between gap-6 shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-8 flex-wrap">
                            <div>
                                <span className="text-xs font-semibold text-secondary-500 block">Subtotal</span>
                                <span className="text-base font-bold text-secondary-900">₹ {totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-secondary-500 block">GST Total</span>
                                <span className="text-base font-bold text-secondary-600">₹ {totalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-secondary-500 block">Grand Total</span>
                                <span className="text-lg font-bold text-primary-700">₹ {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                                Cancel
                            </Button>
                            {!isReadOnly && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={uploading || mutation.isPending || items.length === 0 || !isValid || isReadOnly}
                                    className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2 disabled:opacity-50"
                                    title={isReadOnly ? "Inactive Job Works cannot be updated" : ""}
                                >
                                    {uploading || mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    {isEditing ? "Update" : "Save"}
                                </Button>
                            )}
                        </div>
                    </footer>
                </div>
            </Dialog>

            <JwItemSelectionDialog
                open={itemSelectionOpen}
                onClose={() => setItemSelectionOpen(false)}
                selectedItemIds={items.map(i => i.itemId)}
                onAddItems={addItems}
            />

            <JobWorkAttachmentListDialog
                open={attachmentListDialogOpen}
                onClose={() => setAttachmentListDialogOpen(false)}
                urls={attachmentUrls}
                urlsToDelete={urlsToDelete}
                pendingFiles={pendingFiles}
                onRemoveUrl={removeUrl}
                onRemovePending={removePending}
                isReadOnly={isReadOnly}
            />
        </>
    );
}
