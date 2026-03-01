"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Loader2, Calendar, Package, Info, Plus, X, Upload
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
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
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
    included?: boolean;
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

    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>([]);
    const [attachmentUrlsToDelete, setAttachmentUrlsToDelete] = useState<string[]>([]);
    const [attachmentListDialogOpen, setAttachmentListDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);

    const uniqueSources = useMemo(() => {
        const map = new Map<string, { type: InwardSourceType; id: number; display: string }>();
        lines.forEach(l => {
            const key = `${l.sourceType}-${l.sourceRefId}`;
            if (!map.has(key)) {
                map.set(key, { type: l.sourceType, id: l.sourceRefId, display: l.sourceRefDisplay });
            }
        });
        return Array.from(map.values());
    }, [lines]);

    const displayHeader = useMemo(() => {
        const typesInLines = new Set(lines.map(l => l.sourceType));
        if (typesInLines.size === 1) {
            const first = typesInLines.values().next().value;
            if (first === InwardSourceType.PO) return "PO No.";
            if (first === InwardSourceType.JobWork) return "Jobwork No.";
        }
        return "Source No.";
    }, [lines]);

    const removeSourceGroup = (type: InwardSourceType, id: number) => {
        setLines(prev => prev.filter(l => !(l.sourceType === type && l.sourceRefId === id)));
    };

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

    const { data: autoNextCode } = useQuery<string>({
        queryKey: ["inwards", "next-code"],
        queryFn: async () => {
            const res = await api.get("/inwards/next-code");
            return res.data.data;
        },
        enabled: open && !isEditing,
        staleTime: 0 // Always get fresh code for new entry
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
                sourceRefId: l.sourceRefId,
                sourceRefDisplay: l.sourceRefDisplay || "",
                remarks: l.remarks || "",
                included: true
            })));
            setAttachmentUrls((inward.attachmentUrls as string[]) || []);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        } else if (!isEditing) {
            setVendorId(0);
            setInwardDate(format(new Date(), "yyyy-MM-dd"));
            setRemarks("");
            setLines([]);
            setAttachmentUrls([]);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
            if (autoNextCode) setNextCode(autoNextCode);
        }
    }, [open, isEditing, inward, autoNextCode]);

    const mutation = useMutation({
        mutationFn: (data: any) => isEditing ? api.put(`/inwards/${inwardId}`, data) : api.post("/inwards", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["inward-sources"] });
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
                if (!exists) next.push({ ...ni, quantity: 1, included: true }); // Force quantity 1
            });
            return next;
        });

        // Auto-set vendor if not set
        if (!vendorId && newItems.length > 0 && newItems[0].vendorId) {
            setVendorId(newItems[0].vendorId);
        }
    };

    const toggleLineIncluded = (idx: number) => {
        setLines(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], included: !(next[idx].included !== false) };
            return next;
        });
    };

    const updateLineRemark = (idx: number, val: string) => {
        setLines(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], remarks: val };
            return next;
        });
    };

    const getImportButtonText = () => {
        switch (selectedSourceType) {
            case InwardSourceType.PO: return "Add Purchase Orders";
            case InwardSourceType.JobWork: return "Add Job Works";
            default: return "Import Items";
        }
    };

    const ALLOWED_ATTACHMENT_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const valid: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const ext = "." + (files[i].name.split(".").pop() || "").toLowerCase();
            if (ALLOWED_ATTACHMENT_EXT.includes(ext)) valid.push(files[i]);
        }
        if (valid.length === 0) {
            toast.error("Only PDF and images (PNG, JPG, JPEG, GIF, WEBP) are allowed.");
            e.target.value = "";
            return;
        }
        setPendingAttachmentFiles((prev) => [...prev, ...valid]);
        toast.success("File(s) added. They will be uploaded when you save.");
        e.target.value = "";
    };

    const removeAttachmentUrl = (url: string) => {
        setAttachmentUrlsToDelete((prev) => (prev.includes(url) ? prev : [...prev, url]));
    };
    const removePendingAttachment = (index: number) => {
        setPendingAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const effectiveAttachmentCount = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u)).length + pendingAttachmentFiles.length;

    const handleSubmit = async () => {
        if (!vendorId) return toast.error("Please select Vendor / Party");
        if (lines.length === 0) return toast.error("At least one item line is required");

        const includedLines = lines.filter(l => l.included !== false);
        if (includedLines.length === 0) return toast.error("Please include at least one item");

        setUploading(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < pendingAttachmentFiles.length; i++) {
                const form = new FormData();
                form.append("file", pendingAttachmentFiles[i], pendingAttachmentFiles[i].name);
                const res = await api.post("/inwards/upload-attachment", form);
                const url = res.data?.data?.url;
                if (url) newUrls.push(url);
            }
            for (const url of attachmentUrlsToDelete) {
                try { await api.delete("/inwards/attachment", { params: { url } }); } catch { }
            }
            const keptUrls = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u));
            const finalUrls = [...keptUrls, ...newUrls];

            const payload = {
                vendorId,
                inwardDate,
                remarks,
                attachmentUrls: finalUrls,
                lines: includedLines.map(l => ({
                    itemId: l.itemId,
                    quantity: 1, // Always 1 per requirement
                    sourceType: l.sourceType,
                    sourceRefId: l.sourceRefId,
                    remarks: l.remarks
                }))
            };
            await mutation.mutateAsync(payload);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const selectedVendor = vendors.find(v => v.id === vendorId);

    if (!open) return null;

    const sourceOptions = [
        { label: "Purchase Order", value: InwardSourceType.PO },
        { label: "Job Work", value: InwardSourceType.JobWork }
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
                                            onChange={(id) => {
                                                setVendorId(Number(id));
                                                if (Number(id)) {
                                                    setSelectedSourceType(InwardSourceType.PO);
                                                }
                                            }}
                                            placeholder="Search vendors..."
                                        />
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs font-semibold text-secondary-600">Address</Label>
                                    <Input value={selectedVendor?.address || "—"} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm truncate" />
                                </div>
                            </div>

                            {/* Source Selection & Attachment */}
                            <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-secondary-200/60 shadow-sm flex-wrap">
                                <div className="flex flex-col gap-1 pr-4">
                                    <span className="text-[10px] font-black uppercase text-secondary-400 tracking-widest">Select Source Type</span>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedSourceType}
                                            onChange={(e) => setSelectedSourceType(Number(e.target.value))}
                                            disabled={!vendorId}
                                            className="h-9 w-48 px-3 rounded-lg border border-secondary-200 bg-secondary-50/50 text-sm font-bold text-secondary-700 focus:border-primary-500 focus:ring-0 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {sourceOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                        <Button
                                            type="button"
                                            onClick={() => setSourceSelectionOpen(true)}
                                            disabled={!vendorId}
                                            className="h-9 px-5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest gap-2 rounded-lg shadow-sm shadow-primary-200"
                                        >
                                            <Plus className="w-4 h-4" />
                                            {getImportButtonText()}
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-end gap-2 pr-4 border-l border-secondary-100 pl-4">
                                    <div className="w-48 min-w-0">
                                        <Label className="text-[10px] font-black uppercase text-secondary-400 tracking-widest block leading-none mb-1">Attachment Upload</Label>
                                        <div className={cn(
                                            "flex items-center gap-2 h-9 min-h-9 px-3 rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50/50 hover:bg-white hover:border-primary-400 transition-colors",
                                            uploading && "opacity-50 cursor-not-allowed"
                                        )}>
                                            <label className={cn("flex items-center gap-1.5 shrink-0 h-full py-1 w-full", uploading ? "cursor-not-allowed" : "cursor-pointer")}>
                                                <Upload className="w-4 h-4 text-secondary-400 shrink-0" />
                                                <span className="text-xs font-medium text-secondary-600 whitespace-nowrap truncate">
                                                    {uploading ? "Saving..." : effectiveAttachmentCount === 0 ? "PDF / Images" : "PDF / Images"}
                                                </span>
                                                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                                            </label>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9 shrink-0"
                                        onClick={() => setAttachmentListDialogOpen(true)}
                                        disabled={effectiveAttachmentCount === 0}
                                    >
                                        View ({effectiveAttachmentCount})
                                    </Button>
                                </div>
                            </div>

                            {/* Selected Sources Chips */}
                            {uniqueSources.length > 0 && (
                                <div className="flex flex-col gap-1.5 px-1">
                                    <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest leading-none">Selected Sources</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {uniqueSources.map((src: { type: InwardSourceType; id: number; display: string }) => (
                                            <span
                                                key={`${src.type}-${src.id}`}
                                                className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700 shadow-sm transition-all hover:bg-white"
                                            >
                                                <span className="opacity-50 text-[10px]">
                                                    {src.type === InwardSourceType.PO ? "PO" : "JW"}
                                                </span>
                                                {src.display}
                                                <button
                                                    type="button"
                                                    onClick={() => removeSourceGroup(src.type, src.id)}
                                                    className="p-0.5 rounded-full hover:bg-rose-100 text-primary-400 hover:text-rose-600 transition-colors"
                                                    title="Remove entire source"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items table */}
                            <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden shadow-sm mt-4">
                                <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                                    <table className="w-full border-collapse text-sm min-w-[900px]">
                                        <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                            <tr>
                                                <th className="text-center py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-16">Include</th>
                                                <th className="text-center py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-12">Sr.No</th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-40">
                                                    {displayHeader}
                                                </th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap">Item Description</th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap">Line Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100 bg-white">
                                            {lines.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-12 text-center text-secondary-500 text-sm">
                                                        No items. Select a vendor and click "{getImportButtonText()}" to begin.
                                                    </td>
                                                </tr>
                                            ) : (
                                                lines.map((line, idx) => {
                                                    const included = line.included !== false;
                                                    return (
                                                        <tr key={idx} className={cn("hover:bg-primary-50/30 transition-colors", !included && "opacity-60 bg-secondary-50/50")}>
                                                            <td className="py-2.5 px-3 text-center align-middle">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={included}
                                                                    onChange={() => toggleLineIncluded(idx)}
                                                                    className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer mx-auto block"
                                                                    title={included ? "Include in Inward" : "Exclude from Inward"}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-secondary-500 font-medium text-sm text-center">{idx + 1}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="font-semibold text-secondary-800 text-xs tracking-tight whitespace-nowrap">{line.sourceRefDisplay}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-semibold text-secondary-900 truncate">{line.itemName}</span>
                                                                    <span className="text-xs text-secondary-500 truncate">{line.mainPartName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 min-w-[200px]">
                                                                <Input
                                                                    placeholder="Line notes..."
                                                                    value={line.remarks}
                                                                    onChange={(e) => updateLineRemark(idx, e.target.value)}
                                                                    disabled={!included}
                                                                    className="h-8 border-secondary-200 focus:border-primary-400 text-sm bg-secondary-50/30 rounded-lg disabled:opacity-50"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })
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
                        <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.05)]">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="h-9 px-5 font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={mutation.isPending || uploading || lines.length === 0}
                                className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2 disabled:opacity-50"
                            >
                                {mutation.isPending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? "Update" : "Save")}
                            </Button>
                        </footer>
                    </>
                )}
            </div>

            <AttachmentListDialog
                open={attachmentListDialogOpen}
                onClose={() => setAttachmentListDialogOpen(false)}
                urls={attachmentUrls}
                urlsToDelete={attachmentUrlsToDelete}
                pendingFiles={pendingAttachmentFiles}
                onRemoveUrl={removeAttachmentUrl}
                onRemovePending={removePendingAttachment}
                isEditing={isEditing}
                title="Inward Attachments"
            />

            <SourceSelectionDialog
                isOpen={sourceSelectionOpen}
                onClose={() => setSourceSelectionOpen(false)}
                sourceType={selectedSourceType}
                onSelect={handleAddItems}
                alreadySelectedIds={lines.filter(l => l.sourceType === selectedSourceType).map(l => l.sourceRefId)}
                vendorId={vendorId}
            />
        </Dialog>
    );
}
