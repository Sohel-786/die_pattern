"use client";

import { useState, useEffect, useMemo } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type SelectedQCItem = PendingQC & { included?: boolean };

interface QualityControlDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qc?: QC | null;
}

export function QualityControlDialog({ open, onOpenChange, qc }: QualityControlDialogProps) {
    const isEditing = !!qc?.id;
    const isReadOnly = isEditing && qc?.status !== QcStatus.Pending;
    const queryClient = useQueryClient();

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
                    itemId: it.itemId,
                    itemName: it.currentName ?? it.mainPartName ?? "—",
                    mainPartName: it.mainPartName ?? "",
                    inwardNo: it.inwardNo ?? "",
                    sourceRefDisplay: it.sourceRefDisplay ?? "—",
                    sourceType: qcDetail.sourceType,
                    isQCPending: true,
                    isQCApproved: false,
                    inwardDate: new Date().toISOString(),
                    included: true,
                }))
            );
            setAttachmentUrls((qcDetail.attachmentUrls as string[]) || []);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        } else if (!isEditing) {
            setPartyId(0);
            setSourceType("");
            setRemarks("");
            setSelectedItems([]);
            setAttachmentUrls([]);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        }
    }, [open, isEditing, qcDetail]);

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data;
        },
        enabled: open,
    });

    const { data: pendingItems = [] } = useQuery<PendingQC[]>({
        queryKey: ["quality-control", "pending", partyId, sourceType],
        queryFn: async () => {
            const res = await api.get(`/quality-control/pending?partyId=${partyId}&sourceType=${sourceType}`);
            return res.data.data;
        },
        enabled: open && partyId > 0 && sourceType !== "",
    });

    const mutation = useMutation({
        mutationFn: (data: { partyId?: number; sourceType?: InwardSourceType; remarks?: string; inwardLineIds: number[] }) =>
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
        if (!partyId) return toast.error("Please select Party");
        if (sourceType === "") return toast.error("Please select Source Type");
        if (includedIds.length === 0) return toast.error("Include at least one item in this QC entry");

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

            const payload: any = { remarks, attachmentUrls: finalUrls, inwardLineIds: includedIds };
            if (!isEditing) {
                payload.partyId = partyId;
                payload.sourceType = sourceType;
            }

            await mutation.mutateAsync(payload);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const toggleIncluded = (inwardLineId: number) => {
        setSelectedItems((prev) =>
            prev.map((i) => (i.inwardLineId === inwardLineId ? { ...i, included: !(i.included !== false) } : i))
        );
    };

    const removeItem = (inwardLineId: number) => {
        setSelectedItems((prev) => prev.filter((i) => i.inwardLineId !== inwardLineId));
    };

    const handleAddItems = (items: PendingQC[]) => {
        const existingIds = new Set(selectedItems.map((i) => i.inwardLineId));
        const toAdd = items.filter((i) => !existingIds.has(i.inwardLineId)).map((i) => ({ ...i, included: true }));
        setSelectedItems((prev) => [...prev, ...toAdd]);
    };

    const sourceOptions = [
        { label: "Purchase Order", value: InwardSourceType.PO },
        { label: "Job Work", value: InwardSourceType.JobWork },
        { label: "Outward Return", value: InwardSourceType.OutwardReturn },
    ];

    const getAddButtonText = () => {
        if (sourceType === InwardSourceType.PO) return "Add Inward Items (from PO)";
        if (sourceType === InwardSourceType.JobWork) return "Add Inward Items (from Job Work)";
        if (sourceType === InwardSourceType.OutwardReturn) return "Add Inward Items (from Outward)";
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
            className="overflow-hidden border-none shadow-2xl flex flex-col"
        >
            <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                {isEditing && !qcDetail ? (
                    <div className="flex flex-1 items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
                    </div>
                ) : (
                    <>
                        <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                            <div className="grid grid-cols-12 gap-4 items-end bg-white p-4 rounded-xl border border-secondary-200/60 shadow-sm">
                                {isEditing && (
                                    <div className="col-span-2">
                                        <Label className="text-xs font-semibold text-secondary-600">QC No.</Label>
                                        <Input
                                            value={qcDetail?.qcNo ?? ""}
                                            readOnly
                                            className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm font-semibold"
                                        />
                                    </div>
                                )}
                                <div className={isEditing ? "col-span-3" : "col-span-4"}>
                                    <Label className="text-xs font-semibold text-secondary-600">Party *</Label>
                                    <div className="mt-0.5">
                                        <SearchableSelect
                                            options={parties.map((p) => ({ label: p.name, value: p.id }))}
                                            value={partyId}
                                            onChange={(id) => {
                                                setPartyId(Number(id));
                                                if (Number(id)) setSelectedItems([]);
                                            }}
                                            placeholder="Search party..."
                                            disabled={isReadOnly || isEditing}
                                        />
                                    </div>
                                </div>
                                <div className={isEditing ? "col-span-3" : "col-span-4"}>
                                    <Label className="text-xs font-semibold text-secondary-600">Source Type *</Label>
                                    <div className="mt-0.5">
                                        <select
                                            value={sourceType}
                                            onChange={(e) => {
                                                const v = e.target.value === "" ? "" : Number(e.target.value) as InwardSourceType;
                                                setSourceType(v);
                                                setSelectedItems([]);
                                            }}
                                            disabled={isReadOnly || isEditing}
                                            className="h-9 w-full px-3 rounded-lg border border-secondary-200 bg-secondary-50/50 text-sm font-semibold text-secondary-700 focus:border-primary-500 focus:ring-0 transition-all outline-none disabled:opacity-50"
                                        >
                                            <option value="">Select source type</option>
                                            {sourceOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-span-12 flex flex-col gap-2 border-t border-secondary-100 pt-4 mt-2">
                                    <div className="flex items-end gap-2 flex-wrap">
                                        <div className="w-48 min-w-0">
                                            <Label className="text-xs font-semibold text-secondary-600">Inspection Documents</Label>
                                            <div className={cn(
                                                "mt-0.5 flex items-center gap-2 h-9 min-h-9 px-3 rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50/50 hover:bg-white hover:border-primary-400 transition-colors",
                                                (isReadOnly || uploading) && "opacity-50 cursor-not-allowed hover:border-secondary-200"
                                            )}>
                                                <label className={cn("flex items-center gap-1.5 shrink-0 h-full py-1 w-full", isReadOnly || uploading ? "cursor-not-allowed" : "cursor-pointer")}>
                                                    <Upload className="w-4 h-4 text-secondary-400 shrink-0" />
                                                    <span className="text-xs font-medium text-secondary-600 whitespace-nowrap truncate">
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
                                            <div className="ml-auto pl-4 border-l border-secondary-200 flex items-center h-9">
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
                                        <Label className="text-xs font-semibold text-secondary-600">Remarks</Label>
                                        <Input
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            placeholder="Optional remarks..."
                                            disabled={isReadOnly}
                                            className="h-9 mt-0.5 border-secondary-200 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden shadow-sm mt-4">
                                <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                                    <table className="w-full border-collapse text-sm min-w-[800px]">
                                        <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                            <tr>
                                                <th className="text-center py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-16">Include</th>
                                                <th className="text-center py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-12">Sr.No</th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-28">Inward No.</th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-32">Source Ref</th>
                                                <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Item Description</th>
                                                {!isReadOnly && (
                                                    <th className="text-right py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-16">Remove</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100 bg-white">
                                            {selectedItems.length === 0 ? (
                                                <tr>
                                                    <td colSpan={isReadOnly ? 5 : 6} className="py-12 text-center text-secondary-500 text-sm">
                                                        No items. Select Party and Source Type, then click &quot;{getAddButtonText()}&quot; to add inward items.
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedItems.map((item, idx) => {
                                                    const included = item.included !== false;
                                                    return (
                                                        <tr
                                                            key={item.inwardLineId}
                                                            className={cn("hover:bg-primary-50/30 transition-colors", !included && "opacity-60 bg-secondary-50/50")}
                                                        >
                                                            <td className="py-2.5 px-3 text-center align-middle">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={included}
                                                                    onChange={() => toggleIncluded(item.inwardLineId)}
                                                                    disabled={isReadOnly}
                                                                    className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer mx-auto block disabled:opacity-50"
                                                                    title={included ? "Include in QC" : "Exclude from QC (available for future QC)"}
                                                                />
                                                            </td>
                                                            <td className="py-2.5 px-3 text-secondary-500 font-medium text-sm text-center">{idx + 1}</td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="font-semibold text-primary-700 text-xs tracking-tight whitespace-nowrap">{item.inwardNo}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="font-semibold text-secondary-800 text-xs tracking-tight whitespace-nowrap">{item.sourceRefDisplay || "—"}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="font-semibold text-secondary-900 truncate">{item.itemName}</span>
                                                                    <span className="text-xs text-secondary-500 truncate">{item.mainPartName || ""}</span>
                                                                </div>
                                                            </td>
                                                            {!isReadOnly && (
                                                                <td className="py-2.5 px-3 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItem(item.inwardLineId)}
                                                                        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                                        title="Remove from list"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.05)]">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                                Cancel
                            </Button>
                            {!isReadOnly && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={mutation.isPending || uploading || includedIds.length === 0}
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
