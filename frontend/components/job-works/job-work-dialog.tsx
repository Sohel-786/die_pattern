"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Trash2, Save, Package, Loader2, Calendar, Plus, Upload, Eye, X, Printer, FileText
} from "lucide-react";
import api from "@/lib/api";
import { JobWorkAttachmentListDialog } from "./job-work-attachment-list-dialog";
import { JobWork, JobWorkStatus, CreateJobWorkDto, Party, Item } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
}

interface JobWorkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    jobWork?: JobWork | null;
}

export function JobWorkDialog({ open, onOpenChange, jobWork }: JobWorkDialogProps) {
    const isEditing = !!jobWork?.id;
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
                remarks: i.remarks
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

    const { data: inStockItems = [] } = useQuery<Item[]>({
        queryKey: ["items", "active", "in-stock"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return (res.data.data ?? []).filter((i: Item) => i.currentProcess === "In Stock");
        },
        enabled: open && !isEditing
    });

    const createMutation = useMutation({
        mutationFn: async (payload: CreateJobWorkDto) => api.post("/job-works", payload),
        onSuccess: () => {
            toast.success("Job Work created successfully");
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
                remarks: ""
            }));
        setItems(prev => [...prev, ...newItems]);
        setItemSelectionOpen(false);
    };

    const removeItem = (id: number) => setItems(prev => prev.filter(i => i.itemId !== id));

    const updateItem = (itemId: number, field: keyof JobWorkGridItem, value: any) => {
        setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, [field]: value } : i));
    };

    const handleSubmit = async () => {
        if (toPartyId === 0) return toast.error("Please select a Party");
        if (!description.trim()) return toast.error("Please enter a purpose/description");
        if (items.length === 0) return toast.error("Please add at least one item");

        setUploading(true);
        try {
            const keptUrls = attachmentUrls.filter(u => !urlsToDelete.includes(u));
            const newUrls: string[] = [];

            // 1. Upload new files
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

            // 2. Delete removed files (best-effort)
            for (const url of urlsToDelete) {
                try {
                    await api.delete(`/job-works/attachment?url=${encodeURIComponent(url)}`);
                } catch (e) { console.error("Failed to delete", url); }
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
                    remarks: i.remarks
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

    const isReadOnly = isEditing && jobWork?.status !== JobWorkStatus.Pending;

    return (
        <>
            <Dialog
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title={isEditing ? `View Job Work: ${jobWork?.jobWorkNo}` : "New Job Work"}
                size="full"
                contentScroll={false}
                className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
            >
                <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                    <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4 overflow-y-auto">
                        {/* Header Fields */}
                        <div className="grid grid-cols-12 gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm items-end">
                            <div className="col-span-12 md:col-span-1">
                                <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1">No</Label>
                                <Input value={nextCode} readOnly className="h-9 bg-secondary-50 border-secondary-200 font-bold text-secondary-700 text-sm" />
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1">Date</Label>
                                <div className="h-9 px-3 flex items-center bg-secondary-50 border border-secondary-200 rounded-lg text-xs font-semibold text-secondary-600">
                                    <Calendar className="w-3.5 h-3.5 mr-2 text-secondary-400" />
                                    {isEditing && jobWork?.createdAt ? format(new Date(jobWork.createdAt), "dd-MMM-yyyy") : format(new Date(), "dd-MMM-yyyy")}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1">Party (Send To) *</Label>
                                <SearchableSelect
                                    options={parties.map(p => ({ value: p.id, label: p.name }))}
                                    value={toPartyId || ""}
                                    onChange={(val) => setToPartyId(Number(val))}
                                    disabled={isReadOnly}
                                    placeholder="Search Party..."
                                    className="h-9"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-2">
                                <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1">Purpose *</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="Purpose..."
                                    className="h-9 text-sm font-medium border-secondary-200 rounded-lg"
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4 flex items-end gap-2">
                                <div className="flex-1 min-w-0">
                                    <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1">Attachment Upload *</Label>
                                    <div className={cn(
                                        "flex items-center gap-2 h-9 min-h-9 px-3 rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50/50 hover:bg-white hover:border-primary-400 transition-all group relative",
                                        (isReadOnly || uploading) && "opacity-50 cursor-not-allowed hover:border-secondary-200"
                                    )}>
                                        <label className={cn("flex items-center gap-1.5 shrink-0 h-full py-1 w-full", (isReadOnly || uploading) ? "cursor-not-allowed" : "cursor-pointer")}>
                                            <Upload className="w-4 h-4 text-secondary-400 shrink-0 group-hover:text-primary-500 transition-colors" />
                                            <span className="text-xs font-medium text-secondary-600 group-hover:text-primary-600 whitespace-nowrap truncate overflow-hidden">
                                                {uploading ? "Saving..." : effectiveAttachmentCount === 0 ? "PDF / Images" : "PDF / Images"}
                                            </span>
                                            <input type="file" multiple className="hidden" onChange={handleFileSelect} disabled={isReadOnly || uploading} accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" />
                                        </label>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 shrink-0 px-3 font-semibold text-xs border-secondary-200 bg-white"
                                    onClick={() => setAttachmentListDialogOpen(true)}
                                    disabled={effectiveAttachmentCount === 0}
                                >
                                    View ({effectiveAttachmentCount})
                                </Button>
                                {!isReadOnly && (
                                    <Button
                                        type="button"
                                        onClick={() => setItemSelectionOpen(true)}
                                        className="h-9 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 rounded-lg shadow-sm transition-all gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Items
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12">
                                <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block mb-1.5">Internal Remarks</Label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="Any internal notes..."
                                    className="min-h-[60px] text-sm font-medium border-secondary-200 rounded-xl focus:ring-primary-500/10 transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="flex flex-col gap-3 min-h-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-primary-600" />
                                </div>
                                <h3 className="font-bold text-secondary-900 tracking-tight uppercase text-xs">Line Items</h3>
                                <span className="bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded text-[10px] font-black">{items.length}</span>
                            </div>

                            <div className="border border-secondary-200 rounded-xl bg-white overflow-hidden shadow-sm flex-1 flex flex-col min-h-[300px]">
                                <div className="flex-1 overflow-auto overflow-x-auto min-h-0">
                                    <table className="w-full border-collapse text-sm min-w-[1200px]">
                                        <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                            <tr>
                                                <th className="py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-12 text-center">#</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-64">Die/Pattern Details</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-40">Type / Material</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-40">Drawing / Rev</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-24 text-center">Rate</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-20 text-center">GST%</th>
                                                <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest">Line Remarks</th>
                                                {!isReadOnly && <th className="text-center py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-16">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={isReadOnly ? 7 : 8} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                                            <Package className="w-12 h-12" />
                                                            <p className="font-bold uppercase tracking-widest text-[10px]">No items selected</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map((item, idx) => (
                                                    <tr key={item.itemId} className="hover:bg-primary-50/20 group transition-colors">
                                                        <td className="py-3 px-3 text-center text-xs font-black text-secondary-400 group-hover:text-primary-500 transition-colors">{idx + 1}</td>
                                                        <td className="py-3 px-3">
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-bold text-secondary-900 truncate leading-tight">{item.itemName}</span>
                                                                <span className="text-[10px] font-bold text-secondary-400 mt-0.5 truncate uppercase tracking-tighter">{item.mainPartName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-xs text-secondary-600 font-bold">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-primary-700">{item.itemTypeName}</span>
                                                                <span className="text-secondary-400">{item.materialName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3 text-xs text-secondary-600 font-bold">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-secondary-700">{item.drawingNo}</span>
                                                                <span className="text-secondary-400">{item.revisionNo}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Input
                                                                type="number"
                                                                value={item.rate || 0}
                                                                onChange={(e) => updateItem(item.itemId, "rate", Number(e.target.value))}
                                                                disabled={isReadOnly}
                                                                className="h-8 text-right font-black text-xs border-secondary-200 bg-secondary-50/50"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Input
                                                                type="number"
                                                                value={item.gstPercent || 0}
                                                                onChange={(e) => updateItem(item.itemId, "gstPercent", Number(e.target.value))}
                                                                disabled={isReadOnly}
                                                                className="h-8 text-center font-black text-xs border-secondary-200 bg-secondary-50/50"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <Input
                                                                value={item.remarks || ""}
                                                                onChange={(e) => updateItem(item.itemId, "remarks", e.target.value)}
                                                                disabled={isReadOnly}
                                                                placeholder="Add line note..."
                                                                className="h-8 text-xs italic border-secondary-200 bg-secondary-50/50"
                                                            />
                                                        </td>
                                                        {!isReadOnly && (
                                                            <td className="py-3 px-3 text-center">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeItem(item.itemId)}
                                                                    className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-lg"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-between shadow-[0_-1px_10px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-4">
                            {isEditing && (
                                <>
                                    <Button variant="outline" className="h-10 px-6 font-black text-xs uppercase tracking-widest gap-2 rounded-xl group" onClick={() => window.print()}>
                                        <Printer className="w-4 h-4 text-secondary-400 group-hover:text-primary-600 transition-colors" />
                                        Print / Download
                                    </Button>
                                    <Button variant="outline" className="h-10 px-6 font-black text-xs uppercase tracking-widest gap-2 rounded-xl group">
                                        <FileText className="w-4 h-4 text-secondary-400 group-hover:text-primary-600 transition-colors" />
                                        Preview
                                    </Button>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-8 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-secondary-50">
                                Close
                            </Button>
                            {!isReadOnly && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={uploading || mutation.isPending || items.length === 0}
                                    className="h-10 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-primary-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                                >
                                    {uploading || mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isEditing ? "Update Job Work" : "Create Job Work"}
                                </Button>
                            )}
                        </div>
                    </footer>
                </div>
            </Dialog>

            {/* Item Selection Dialog */}
            <Dialog
                isOpen={itemSelectionOpen}
                onClose={() => setItemSelectionOpen(false)}
                title="Select Die / Pattern (In Stock only)"
                size="3xl"
                className="max-h-[85vh] flex flex-col"
            >
                <div className="p-6 flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-auto border border-secondary-200 rounded-xl bg-white shadow-sm">
                        <table className="w-full border-collapse text-sm">
                            <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 z-10">
                                <tr>
                                    <th className="py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-12 text-center">#</th>
                                    <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest">Name / Part</th>
                                    <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-32">Type</th>
                                    <th className="text-left py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-32">Material</th>
                                    <th className="text-center py-2.5 px-3 font-black text-secondary-500 text-[10px] uppercase tracking-widest w-20">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {inStockItems
                                    .filter(i => !items.some(si => si.itemId === i.id))
                                    .map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-primary-50/30">
                                            <td className="py-2.5 px-3 text-center text-xs text-secondary-400 font-bold">{idx + 1}</td>
                                            <td className="py-2.5 px-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-secondary-900 truncate">{item.currentName}</span>
                                                    <span className="text-[10px] font-bold text-secondary-400 truncate uppercase tracking-tighter">{item.mainPartName}</span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-xs text-secondary-600 font-bold">{item.itemTypeName}</td>
                                            <td className="py-2.5 px-3 text-xs text-secondary-600 font-bold">{item.materialName}</td>
                                            <td className="py-2.5 px-3 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addItems([item])}
                                                    className="h-8 font-black text-[10px] uppercase tracking-widest border-primary-200 text-primary-600 hover:bg-primary-600 hover:text-white"
                                                >
                                                    Select
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                {inStockItems.filter(i => !items.some(si => si.itemId === i.id)).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-secondary-400 text-xs italic font-medium">No items available in stock.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Dialog>

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


