"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Package, Plus, X, Upload } from "lucide-react";
import api from "@/lib/api";
import { QC, QcStatus, Party, InwardSourceType, PendingQC } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { QCItemSelectionDialog } from "./qc-item-selection-dialog";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { toast } from "react-hot-toast";
import { cn, formatDate } from "@/lib/utils";

export type SelectedQCItem = PendingQC & { included?: boolean };

interface QualityControlDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qc?: QC | null;
    readOnly?: boolean;
}

export function QualityControlDialog({ open, onOpenChange, qc, readOnly }: QualityControlDialogProps) {
    const isEditing = !!qc?.id;
    const isReadOnly = !!readOnly || (isEditing && qc?.status !== QcStatus.Pending);
    const queryClient = useQueryClient();
    const [isDirty, setIsDirty] = useState(false);

    const [partyId, setPartyId] = useState<number>(0);
    const [sourceType, setSourceType] = useState<InwardSourceType | "">("");
    const [remarks, setRemarks] = useState("");
    const [selectedItems, setSelectedItems] = useState<SelectedQCItem[]>([]);
    const [isItemSelectionOpen, setIsItemSelectionOpen] = useState(false);

    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>([]);
    const [attachmentUrlsToDelete, setAttachmentUrlsToDelete] = useState<string[]>([]);
    const [attachmentListDialogOpen, setAttachmentListDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const submitLockRef = useRef(false);

    const uniqueInwards = useMemo(() => {
        const map = new Map<number, { id: number; no: string }>();
        selectedItems.forEach(item => {
            if (item.inwardId && !map.has(item.inwardId)) {
                map.set(item.inwardId, { id: item.inwardId, no: item.inwardNo || "—" });
            }
        });
        return Array.from(map.values());
    }, [selectedItems]);

    const removeInwardSource = (inwardId: number) => {
        setSelectedItems(prev => prev.filter(item => item.inwardId !== inwardId));
        setIsDirty(true);
    };

    const { data: qcDetail } = useQuery<QC>({
        queryKey: ["quality-control", qc?.id],
        queryFn: async () => {
            const res = await api.get(`/quality-control/${qc!.id}`);
            return res.data.data;
        },
        enabled: open && !!qc?.id,
    });

    useEffect(() => {
        if (!open) return;
        if (isEditing && qcDetail) {
            setPartyId(qcDetail.partyId);
            setSourceType(qcDetail.sourceType);
            setRemarks(qcDetail.remarks || "");
            setSelectedItems(
                (qcDetail.items || []).map((it) => ({
                    inwardLineId: it.inwardLineId,
                    inwardId: it.inwardId,
                    itemId: it.itemId,
                    itemName: it.currentName ?? it.mainPartName ?? "—",
                    mainPartName: it.mainPartName ?? "",
                    inwardNo: it.inwardNo ?? "",
                    sourceRefDisplay: it.sourceRefDisplay ?? "—",
                    sourceType: qcDetail.sourceType,
                    itemTypeName: it.itemTypeName,
                    drawingNo: it.drawingNo,
                    revisionNo: it.revisionNo,
                    materialName: it.materialName,
                    isQCPending: true,
                    isQCApproved: false,
                    inwardDate: new Date().toISOString(),
                    included: true,
                    originalDisplayName: it.originalDisplayName,
                    newDisplayNameFromJobWork: it.newDisplayNameFromJobWork,
                }))
            );
            setAttachmentUrls((qcDetail.attachmentUrls as string[]) || []);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        } else if (!isEditing) {
            setPartyId(0);
            setSourceType(InwardSourceType.PO);
            setRemarks("");
            setSelectedItems([]);
            setAttachmentUrls([]);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        }
    }, [open, isEditing, qcDetail]);

    useEffect(() => {
        if (open) setIsDirty(false);
    }, [open, qc?.id]);

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data;
        },
        enabled: open,
    });

    const { data: pendingItems = [] } = useQuery<PendingQC[]>({
        queryKey: ["quality-control", "pending", partyId, sourceType, qc?.id],
        queryFn: async () => {
            const res = await api.get(`/quality-control/pending?partyId=${partyId}&sourceType=${sourceType}${qc?.id ? `&excludeEntryId=${qc.id}` : ""}`);
            return res.data.data;
        },
        enabled: open && !!partyId && !!sourceType,
    });

    const { data: nextCode } = useQuery<string>({
        queryKey: ["quality-control", "next-code"],
        queryFn: async () => {
            const res = await api.get("/quality-control/next-code");
            return res.data.data;
        },
        enabled: open && !isEditing,
        staleTime: 0,
    });

    const mutation = useMutation({
        mutationFn: (data: { partyId: number; sourceType: InwardSourceType; remarks?: string; inwardLineIds: number[]; attachmentUrls?: string[] }) =>
            isEditing ? api.put(`/quality-control/${qc!.id}`, data) : api.post("/quality-control", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            toast.success(isEditing ? "QC entry updated" : "QC entry created");
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Operation failed"),
    });

    const includedItems = useMemo(() => selectedItems.filter((i) => i.included !== false), [selectedItems]);
    const includedIds = useMemo(() => includedItems.map((i) => i.inwardLineId), [includedItems]);

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
        setIsDirty(true);
        toast.success("File(s) added. They will be uploaded when you save.");
        e.target.value = "";
    };

    const removeAttachmentUrl = (url: string) => {
        // Mark for deletion; actual deletion happens on Save/Update.
        setAttachmentUrlsToDelete((prev) => (prev.includes(url) ? prev : [...prev, url]));
        setIsDirty(true);
    };
    const removePendingAttachment = (index: number) => {
        setPendingAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const effectiveAttachmentCount = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u)).length + pendingAttachmentFiles.length;

    const isFormValid = !!partyId && !!sourceType && includedIds.length > 0 && effectiveAttachmentCount > 0;

    const handleSubmit = async () => {
        if (submitLockRef.current) return;
        if (uploading || mutation.isPending) return;
        submitLockRef.current = true;

        if (!partyId) {
            submitLockRef.current = false;
            return toast.error("Please select Party");
        }
        if (sourceType === "") {
            submitLockRef.current = false;
            return toast.error("Please select Source Type");
        }
        if (includedIds.length === 0) {
            submitLockRef.current = false;
            return toast.error("Include at least one item in this QC entry");
        }
        if (effectiveAttachmentCount === 0) {
            submitLockRef.current = false;
            return toast.error("Please attach at least one inspection document before saving.");
        }

        setUploading(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < pendingAttachmentFiles.length; i++) {
                const form = new FormData();
                form.append("file", pendingAttachmentFiles[i], pendingAttachmentFiles[i].name);
                const res = await api.post("/quality-control/upload-attachment", form);
                const url = res.data?.data?.url;
                if (url) newUrls.push(url);
            }
            for (const url of attachmentUrlsToDelete) {
                try { await api.delete("/quality-control/attachment", { params: { url } }); } catch { }
            }
            const keptUrls = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u));
            const finalUrls = [...keptUrls, ...newUrls];

            const payload = {
                partyId,
                sourceType,
                remarks,
                attachmentUrls: finalUrls,
                inwardLineIds: includedIds
            };

            await mutation.mutateAsync(payload);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Upload failed.");
        } finally {
            setUploading(false);
            submitLockRef.current = false;
        }
    };

    const toggleItemIncluded = (inwardLineId: number) => {
        if (isReadOnly) return;
        setSelectedItems((prev) =>
            prev.map((i) => (i.inwardLineId === inwardLineId ? { ...i, included: !i.included } : i))
        );
        setIsDirty(true);
    };

    const handleAddItems = (items: PendingQC[]) => {
        const existingIds = new Set(selectedItems.map((i) => i.inwardLineId));
        const toAdd = items.filter((i) => !existingIds.has(i.inwardLineId)).map((i) => ({ ...i, included: true }));
        setSelectedItems((prev) => [...prev, ...toAdd]);
        setIsDirty(true);
    };

    const sourceOptions = [
        { label: "Purchase Order", value: InwardSourceType.PO },
        { label: "Job Work", value: InwardSourceType.JobWork },
    ];

    const getAddButtonText = () => {
        if (sourceType === InwardSourceType.PO) return "Add Inward Items (from PO)";
        if (sourceType === InwardSourceType.JobWork) return "Add Inward Items (from Job Work)";
        return "Add Inward Items";
    };

    if (!open) return null;

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? "Edit QC Entry" : "New QC Entry"}
            size="full"
            contentScroll={false}
            className="overflow-hidden border border-secondary-300 dark:border-secondary-600 shadow-2xl flex flex-col"
            confirmOnEscWhenDirty={!isReadOnly}
            isDirty={!isReadOnly && isDirty}
        >
            <div className="flex flex-col h-full min-h-0 bg-[#f8fafc] dark:bg-card">
                {isEditing && !qcDetail ? (
                    <div className="flex flex-1 items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                            <div className="grid grid-cols-12 gap-4 items-end bg-white dark:bg-card p-4 rounded-xl border border-secondary-200/60 dark:border-border shadow-sm">
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500 uppercase tracking-tighter">QC No.</Label>
                                    <Input
                                        value={isEditing ? (qcDetail?.qcNo ?? "") : (nextCode ?? "...")}
                                        readOnly
                                        className="h-9 mt-0.5 bg-secondary-50 dark:bg-secondary-200/10 border-secondary-200 dark:border-border text-sm font-bold text-secondary-700 disabled:opacity-100 dark:text-white"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500 uppercase tracking-tighter">QC Date</Label>
                                    <Input
                                        value={formatDate(isEditing && qcDetail?.createdAt ? qcDetail.createdAt : new Date())}
                                        readOnly
                                        className="h-9 mt-0.5 bg-secondary-50 dark:bg-secondary-200/10 border-secondary-200 dark:border-border text-sm font-bold text-secondary-700 dark:text-white disabled:opacity-100"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500 uppercase tracking-tighter">Vendor / Party <span className="text-rose-500">*</span></Label>
                                    <div className="mt-0.5">
                                        <SearchableSelect
                                            options={parties.map((p) => ({ label: p.name, value: p.id }))}
                                            value={partyId}
                                            onChange={(id) => {
                                                setPartyId(Number(id));
                                                if (Number(id)) setSelectedItems([]);
                                                setIsDirty(true);
                                            }}
                                            placeholder="Search party..."
                                            disabled={isReadOnly || selectedItems.length > 0}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500 uppercase tracking-tighter">Source Type <span className="text-rose-500">*</span></Label>
                                    <div className="mt-0.5">
                                        <select
                                            value={sourceType}
                                            onChange={(e) => {
                                                const v = e.target.value === "" ? "" : e.target.value as InwardSourceType;
                                                setSourceType(v);
                                                setSelectedItems([]);
                                                setIsDirty(true);
                                            }}
                                            disabled={isReadOnly || selectedItems.length > 0}
                                            className="h-9 w-full px-3 rounded-lg border border-secondary-200 dark:border-border bg-secondary-50/50 dark:bg-slate-950 text-sm font-semibold text-secondary-700 dark:text-white focus:border-primary-500 focus:ring-0 transition-all outline-none disabled:opacity-50"
                                        >
                                            <option value="" className="dark:bg-slate-950 dark:text-white">Select source type</option>
                                            {sourceOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value} className="dark:bg-slate-950 dark:text-white">
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-12 flex flex-col gap-2 border-t border-secondary-100 dark:border-border pt-4 mt-2">
                                    <div className="flex items-end gap-2 flex-wrap">
                                        <div className="w-48 min-w-0">
                                            <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500">Inspection Documents <span className="text-rose-500">*</span></Label>
                                            <div className={cn(
                                                "mt-0.5 flex items-center gap-2 h-9 min-h-9 px-3 rounded-lg border-2 border-dashed border-secondary-200 dark:border-border bg-secondary-50/50 dark:bg-secondary-200/10 hover:bg-white dark:hover:bg-card hover:border-primary-400 transition-colors",
                                                (isReadOnly || uploading) && "opacity-50 cursor-not-allowed hover:border-secondary-200 dark:hover:border-border"
                                            )}>
                                                <label className={cn("flex items-center gap-1.5 shrink-0 h-full py-1 w-full", isReadOnly || uploading ? "cursor-not-allowed" : "cursor-pointer")}>
                                                    <Upload className="w-4 h-4 text-secondary-400 shrink-0" />
                                                    <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400 whitespace-nowrap truncate">
                                                        {uploading ? "Saving..." : effectiveAttachmentCount === 0 ? "PDF / Images" : "PDF / Images"}
                                                    </span>
                                                    <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileSelect} disabled={uploading || isReadOnly} />
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

                                        {!isReadOnly && (
                                            <div className="ml-auto pl-4 border-l border-secondary-200 dark:border-border flex items-center h-9">
                                                <Button
                                                    type="button"
                                                    onClick={() => setIsItemSelectionOpen(true)}
                                                    disabled={!partyId || sourceType === ""}
                                                    className="h-9 px-5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest gap-2 rounded-lg shadow-sm"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    {getAddButtonText()}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2">
                                        <Label className="text-xs font-semibold text-secondary-600 dark:text-secondary-500">Remarks</Label>
                                        <Input
                                            value={remarks}
                                            onChange={(e) => { setRemarks(e.target.value); setIsDirty(true); }}
                                            placeholder="Optional remarks..."
                                            disabled={isReadOnly}
                                            className="h-9 mt-0.5 border-secondary-200 dark:border-border text-sm dark:bg-card dark:text-foreground dark:placeholder:text-secondary-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Selected Inward Sources Chips */}
                            {uniqueInwards.length > 0 && (
                                <div className="flex flex-col gap-1.5 px-1">
                                    <span className="text-[10px] font-black text-secondary-500 dark:text-secondary-500 uppercase tracking-widest leading-none">Selected Inward Sources</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {uniqueInwards.map((src) => (
                                            <span
                                                key={src.id}
                                                className="inline-flex items-center gap-2 rounded-full border border-primary-100 dark:border-primary-900/30 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 text-xs font-bold text-primary-700 dark:text-primary-300 shadow-sm transition-all hover:bg-white dark:hover:bg-card"
                                            >
                                                <span className="opacity-50 text-[10px]">INWARD</span>
                                                {src.no}
                                                <button
                                                    type="button"
                                                    onClick={() => !isReadOnly && removeInwardSource(src.id)}
                                                    className={cn(
                                                        "p-0.5 rounded-full hover:bg-rose-100 transition-colors",
                                                        isReadOnly ? "cursor-not-allowed text-primary-300" : "text-primary-400 hover:text-rose-600"
                                                    )}
                                                    title={isReadOnly ? "" : "Remove this inward"}
                                                    disabled={isReadOnly}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 dark:border-border rounded-lg bg-white dark:bg-card overflow-hidden shadow-sm mt-4">
                                <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                                    <table className="w-full border-collapse text-sm min-w-[1000px]">
                                        <thead className="sticky top-0 bg-secondary-100 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-border z-10 font-bold uppercase tracking-wider text-[11px] text-secondary-600 dark:text-secondary-300">
                                            <tr>
                                                <th className="text-center py-2.5 px-3 w-16">Include</th>
                                                <th className="text-center py-2.5 px-3 w-12">Sr.No</th>
                                                <th className="text-left py-2.5 px-3 w-32">Inward No.</th>
                                                <th className="text-left py-2.5 px-3 w-32">Source Ref</th>
                                                <th className="text-left py-2.5 px-3 min-w-[200px]">Item Description</th>
                                                <th className="text-left py-2.5 px-3 w-32">Type</th>
                                                <th className="text-left py-2.5 px-3 w-40">Drawing No. / Rev</th>
                                                <th className="text-left py-2.5 px-3 w-32">Material</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100 dark:divide-border bg-white dark:bg-card">
                                            {selectedItems.length === 0 ? (<tr>
                                                    <td colSpan={8} className="py-12 text-center text-secondary-500 dark:text-secondary-500 text-sm">
                                                        No items selected. Click &quot;{getAddButtonText()}&quot; to begin.
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedItems.map((item, idx) => {
                                                    const isIncluded = item.included !== false;
                                                        return (<tr
                                                            key={item.inwardLineId}
                                                            className={cn(
                                                                "transition-all duration-200",
                                                                !isIncluded ? "bg-secondary-50/50 dark:bg-secondary-900/30 opacity-60" : "hover:bg-primary-50/30 dark:hover:bg-primary-900/10"
                                                            )}
                                                        >
                                                            <td className="py-2.5 px-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isIncluded}
                                                                    onChange={() => toggleItemIncluded(item.inwardLineId)}
                                                                    disabled={isReadOnly}
                                                                    className={cn(
                                                                        "h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500",
                                                                        !isReadOnly ? "cursor-pointer" : "cursor-not-allowed"
                                                                    )}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-secondary-500 dark:text-secondary-500 font-medium text-sm text-center">{idx + 1}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded text-[11px] tracking-tight whitespace-nowrap border border-primary-100 italic">
                                                                    {item.inwardNo}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-secondary-800 dark:text-white text-[11px] tracking-tighter uppercase">{item.sourceRefDisplay || "—"}</span>
                                                                    <span className="text-[9px] font-black text-secondary-400 dark:text-white uppercase tracking-widest leading-none">
                                                                        {item.sourceType === InwardSourceType.PO ? "Purchase Order" : "Job Work"}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="flex flex-col min-w-0 gap-0.5">
                                                                    <span className="font-bold text-secondary-900 dark:text-foreground text-sm truncate uppercase italic tracking-tight">{item.itemName}</span>
                                                                    {item.newDisplayNameFromJobWork ? (
                                                                        <span className="text-[11px] text-primary-600 font-medium">
                                                                            Old: {item.originalDisplayName ?? item.itemName} → New: {item.newDisplayNameFromJobWork} <span className="text-primary-500/90">(applied on approve)</span>
                                                                        </span>
                                                                    ) : null}
                                                                    <span className="text-[10px] font-bold text-secondary-500 dark:text-secondary-500 truncate uppercase">{item.mainPartName || ""}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-secondary-700 dark:text-white font-medium text-xs uppercase tracking-tight">
                                                                {item.itemTypeName || "—"}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-bold text-secondary-800 dark:text-white text-xs truncate">{item.drawingNo ?? "N/A"}</span>
                                                                    <span className="text-[10px] font-black text-secondary-400 dark:text-white uppercase tracking-widest leading-none">R{item.revisionNo ?? "0"}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-secondary-700 dark:text-white font-medium text-xs uppercase tracking-tight">
                                                                {item.materialName || "—"}
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

                        <footer className="shrink-0 border-t border-secondary-200 dark:border-border bg-white dark:bg-card px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.05)]">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                                Cancel
                            </Button>
                            {!isReadOnly && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={mutation.isPending || uploading || !isFormValid}
                                    className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2 disabled:opacity-50"
                                >
                                    {mutation.isPending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {isEditing ? "Update" : "Save"}
                                </Button>
                            )}
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
                title="QC Attachments"
            />

            <QCItemSelectionDialog
                isOpen={isItemSelectionOpen}
                onClose={() => setIsItemSelectionOpen(false)}
                pendingItems={pendingItems}
                selectedInwardLineIds={selectedItems.map((i) => i.inwardLineId)}
                onSelectItems={handleAddItems}
            />
        </Dialog>
    );
}
