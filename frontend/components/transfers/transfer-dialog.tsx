"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Loader2, Plus, Upload, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { Transfer, CreateTransfer, Party, Item, Location as MasterLocation } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn, formatDateOnly } from "@/lib/utils";
import { TransferItemSelectionDialog } from "./transfer-item-selection-dialog";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { useLocationContext } from "@/contexts/location-context";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

interface TransferGridItem {
    itemId: number;
    itemName?: string;
    mainPartName?: string;
    itemTypeName?: string;
    materialName?: string;
    drawingNo?: string;
    revisionNo?: string;
    remarks?: string;
}

interface TransferDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transfer?: Transfer | null;
}

export function TransferDialog({ open, onOpenChange, transfer }: TransferDialogProps) {
    const isEditing = !!transfer?.id;
    const { data: permissions } = useCurrentUserPermissions(open);
    const canEdit = !!permissions?.editTransfer;
    const lockStructure = isEditing && !!transfer?.isActive; // active transfer: don't allow changing parties/items
    const isReadOnly = isEditing ? !canEdit : false;
    const queryClient = useQueryClient();
    const { selected, getAllPairs } = useLocationContext();

    const [fromPartyId, setFromPartyId] = useState<number | null>(0); // 0 = Current Location
    const [toPartyId, setToPartyId] = useState<number | null>(null);
    const [transferDate, setTransferDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [remarks, setRemarks] = useState("");
    const [outFor, setOutFor] = useState("Casting");
    const [reasonDetails, setReasonDetails] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");
    const [personName, setPersonName] = useState("");
    const [items, setItems] = useState<TransferGridItem[]>([]);
    const [itemSelectionOpen, setItemSelectionOpen] = useState(false);
    const [nextCode, setNextCode] = useState("");

    const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
    const [pendingAttachmentFiles, setPendingAttachmentFiles] = useState<File[]>([]);
    const [attachmentUrlsToDelete, setAttachmentUrlsToDelete] = useState<string[]>([]);
    const [attachmentListDialogOpen, setAttachmentListDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const submitLockRef = useRef(false);

    const { data: autoNextCode } = useQuery<string>({
        queryKey: ["transfers", "next-code"],
        queryFn: async () => {
            const res = await api.get("/transfers/next-code");
            return res.data.data;
        },
        enabled: open && !isEditing
    });

    useEffect(() => {
        if (!open) return;
        if (isEditing && transfer) {
            setFromPartyId(transfer.fromPartyId ?? 0);
            setToPartyId(transfer.toPartyId ?? 0);
            setTransferDate(format(new Date(transfer.transferDate), "yyyy-MM-dd"));
            setRemarks(transfer.remarks || "");
            setOutFor(transfer.outFor || "Casting");
            setReasonDetails(transfer.reasonDetails || "");
            setVehicleNo(transfer.vehicleNo || "");
            setPersonName(transfer.personName || "");
            setItems(transfer.items.map(i => ({
                itemId: i.itemId,
                itemName: i.currentName,
                mainPartName: i.mainPartName,
                itemTypeName: i.itemTypeName,
                materialName: i.materialName,
                drawingNo: i.drawingNo,
                revisionNo: i.revisionNo,
                remarks: i.remarks
            })));
            setAttachmentUrls(transfer.attachmentUrls || []);
            setNextCode(transfer.transferNo);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
        } else {
            setFromPartyId(0);
            setToPartyId(null);
            setTransferDate(format(new Date(), "yyyy-MM-dd"));
            setRemarks("");
            setOutFor("Casting");
            setReasonDetails("");
            setVehicleNo("");
            setPersonName("");
            setItems([]);
            setAttachmentUrls([]);
            setPendingAttachmentFiles([]);
            setAttachmentUrlsToDelete([]);
            if (autoNextCode) setNextCode(autoNextCode);
        }
    }, [open, isEditing, transfer, autoNextCode]);

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    const { data: locations = [] } = useQuery<MasterLocation[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    const currentLocation = useMemo(() => {
        if (!selected?.locationId) return null;
        return locations.find(l => l.id === selected.locationId);
    }, [locations, selected?.locationId]);

    const currentLocationName = useMemo(() => {
        if (!selected) return currentLocation?.name ?? null;
        const name = getAllPairs().find(p => p.companyId === selected.companyId && p.locationId === selected.locationId)?.locationName;
        return name ?? currentLocation?.name ?? null;
    }, [selected, getAllPairs, currentLocation?.name]);

    const partyOptions = useMemo(() => [
        { value: 0, label: currentLocationName ?? "Our Location" },
        ...parties.map(p => ({ value: p.id, label: p.name }))
    ], [parties, currentLocationName]);

    const fromOptions = useMemo(() => {
        return partyOptions.filter(o => o.value !== toPartyId);
    }, [partyOptions, toPartyId]);

    const destinationOptions = useMemo(() => {
        return partyOptions.filter(o => o.value !== fromPartyId);
    }, [partyOptions, fromPartyId]);

    // No auto-switching logic - USER request: allow any selection for both fields.

    const createMutation = useMutation({
        mutationFn: async (payload: CreateTransfer) => api.post("/transfers", payload),
        onSuccess: () => {
            toast.success("Transfer created successfully");
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to create Transfer")
    });

    const updateMutation = useMutation({
        mutationFn: async (payload: CreateTransfer) => {
            if (!transfer?.id) throw new Error("Missing transfer id");
            return api.put(`/transfers/${transfer.id}`, payload);
        },
        onSuccess: () => {
            toast.success("Transfer updated successfully");
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to update Transfer")
    });

    const addItems = (selectedItems: Item[]) => {
        const newItems: TransferGridItem[] = selectedItems
            .filter(si => !items.some(existing => existing.itemId === si.id))
            .map(si => ({
                itemId: si.id,
                itemName: si.currentName,
                mainPartName: si.mainPartName,
                itemTypeName: si.itemTypeName,
                materialName: si.materialName,
                drawingNo: si.drawingNo,
                revisionNo: si.revisionNo,
                remarks: ""
            }));
        setItems(prev => [...prev, ...newItems]);
    };

    const removeItem = (id: number) => setItems(prev => prev.filter(i => i.itemId !== id));

    const updateItem = (itemId: number, field: keyof TransferGridItem, value: any) => {
        setItems(prev => prev.map(i => i.itemId === itemId ? { ...i, [field]: value } : i));
    };

    const ALLOWED_ATTACHMENT_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files?.length) return;
        const valid: File[] = [];
        for (let i = 0; i < files.length; i++) {
            const ext = "." + (files[i].name.split(".").pop() || "").toLowerCase();
            if (ALLOWED_ATTACHMENT_EXT.includes(ext) || files[i].type.startsWith('image/')) {
                valid.push(files[i]);
            }
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
        // Mark for deletion; actual deletion happens on Save/Update.
        setAttachmentUrlsToDelete((prev) => (prev.includes(url) ? prev : [...prev, url]));
    };
    const removePendingAttachment = (index: number) => {
        setPendingAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const effectiveAttachmentCount = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u)).length + pendingAttachmentFiles.length;

    const handleSubmit = async () => {
        if (submitLockRef.current) return;
        if (uploading || createMutation.isPending || updateMutation.isPending) return;
        submitLockRef.current = true;

        if (toPartyId === null) {
            submitLockRef.current = false;
            return toast.error("Please select a Destination");
        }
        if (fromPartyId === toPartyId) {
            submitLockRef.current = false;
            return toast.error("Source and destination cannot be the same");
        }
        if (items.length === 0) {
            submitLockRef.current = false;
            return toast.error("Please add at least one item");
        }
        if (!vehicleNo.trim()) {
            submitLockRef.current = false;
            return toast.error("Vehicle No. is required");
        }
        if (!personName.trim()) {
            submitLockRef.current = false;
            return toast.error("Person Name is required");
        }
        if (!reasonDetails.trim()) {
            submitLockRef.current = false;
            return toast.error("Reason Details is required");
        }

        setUploading(true);
        try {
            const newUrls: string[] = [];
            for (let i = 0; i < pendingAttachmentFiles.length; i++) {
                const form = new FormData();
                form.append("file", pendingAttachmentFiles[i], pendingAttachmentFiles[i].name);
                const res = await api.post("/transfers/upload-attachment", form);
                const url = res.data?.data?.url;
                if (url) newUrls.push(url);
            }
            for (const url of attachmentUrlsToDelete) {
                try { await api.delete("/transfers/attachment", { params: { url } }); } catch { }
            }
            const keptUrls = attachmentUrls.filter((u) => !attachmentUrlsToDelete.includes(u));
            const finalUrls = [...keptUrls, ...newUrls];

            const payload: CreateTransfer = {
                fromPartyId: (fromPartyId === 0 || fromPartyId === null) ? undefined : fromPartyId,
                toPartyId: (toPartyId === 0 || toPartyId === null) ? undefined : toPartyId,
                transferDate: transferDate || undefined,
                remarks: remarks || undefined,
                outFor: outFor.trim() || undefined,
                reasonDetails: reasonDetails.trim() || undefined,
                vehicleNo: vehicleNo.trim(),
                personName: personName.trim(),
                attachmentUrls: finalUrls,
                items: items.map((i: TransferGridItem) => ({
                    itemId: i.itemId,
                    remarks: i.remarks
                }))
            };

            if (isEditing) {
                await updateMutation.mutateAsync(payload);
            } else {
                await createMutation.mutateAsync(payload);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Upload failed.");
        } finally {
            setUploading(false);
            submitLockRef.current = false;
        }
    };

    const isValid = toPartyId !== null &&
        fromPartyId !== toPartyId &&
        items.length > 0 &&
        vehicleNo.trim() !== "" &&
        personName.trim() !== "" &&
        outFor !== "" &&
        reasonDetails.trim() !== "";

    const fromAddress = useMemo(() => {
        if (fromPartyId === 0) return currentLocation?.address;
        if (fromPartyId === null) return null;
        return parties.find(p => p.id === fromPartyId)?.address;
    }, [fromPartyId, currentLocation, parties]);

    const toAddress = useMemo(() => {
        if (toPartyId === 0) return currentLocation?.address;
        if (toPartyId === null) return null;
        return parties.find(p => p.id === toPartyId)?.address;
    }, [toPartyId, currentLocation, parties]);

    return (
        <>
            <Dialog
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title={isEditing ? `Transfer: ${transfer?.transferNo}` : "New Transfer Entry"}
                size="full"
                contentScroll={false}
                className="overflow-hidden border border-secondary-300 dark:border-secondary-600 shadow-2xl flex flex-col h-[94vh] max-h-[94vh]"
            >
                <div className="flex flex-col h-full min-h-0 bg-[#f8fafc] dark:bg-card">
                    <div className="flex-1 flex flex-col min-h-0 px-5 py-3 gap-3 overflow-y-auto">
                        {/* Top row: Core Info & Actions */}
                        <div className="grid grid-cols-12 gap-3 items-end bg-white dark:bg-card p-3 rounded-lg border border-secondary-200/60 dark:border-border shadow-sm shrink-0">
                            <div className="col-span-2">
                                <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Transfer No.</Label>
                                <Input value={nextCode} readOnly className="h-8 mt-0.5 bg-secondary-50 dark:bg-secondary-200/10 border-secondary-200 dark:border-border text-xs font-semibold dark:text-foreground" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Transfer Date</Label>
                                <Input readOnly value={formatDateOnly(transferDate)} className="h-8 mt-0.5 text-xs border-secondary-200 dark:border-border bg-secondary-50 dark:bg-secondary-200/10 font-semibold cursor-default dark:text-foreground" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Out For <span className="text-rose-500">*</span></Label>
                                <select value={outFor} onChange={(e) => setOutFor(e.target.value)} disabled={isReadOnly} className={cn("mt-0.5 w-full h-8 px-2 rounded border border-secondary-200 dark:border-border bg-white dark:bg-card text-xs font-medium dark:text-foreground", isReadOnly && "bg-secondary-50 dark:bg-secondary-200/10 cursor-not-allowed")}>
                                    <option value="">Select...</option>
                                    <option value="Casting">Casting</option>
                                    <option value="Job Work">Job Work</option>
                                    <option value="Repair">Repair</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="col-span-6 flex items-center justify-end gap-3">
                                <div className="flex flex-col gap-1 items-end">
                                    <span className="text-[10px] font-black uppercase text-secondary-400 dark:text-secondary-500 tracking-widest">Item Configuration</span>
                                    <div className="flex items-center gap-2">
                                        {!isReadOnly && !lockStructure && (
                                            <Button type="button" onClick={() => setItemSelectionOpen(true)} disabled={fromPartyId === null} className="h-8 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-widest gap-1.5 rounded-lg shadow-sm">
                                                <Plus className="w-3.5 h-3.5" />
                                                Add Items
                                            </Button>
                                        )}
                                        <div className={cn("flex items-center gap-1.5 h-8 px-3 rounded border-2 border-dashed border-secondary-200 dark:border-border bg-secondary-50/50 dark:bg-secondary-200/10 hover:bg-white dark:hover:bg-card hover:border-primary-400 transition-colors", (uploading || isReadOnly) && "opacity-50 cursor-not-allowed")}>
                                            <label className={cn("flex items-center gap-1.5 h-full text-[10px] cursor-pointer", (uploading || isReadOnly) && "cursor-not-allowed")}>
                                                <Upload className="w-3.5 h-3.5 text-secondary-400 dark:text-secondary-500" />
                                                {uploading ? "Uploading..." : "Technical Docs / Images"}
                                                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileSelect} disabled={uploading || isReadOnly} />
                                            </label>
                                        </div>
                                        <Button type="button" variant="outline" size="sm" className="h-8 px-3 text-[10px] border-secondary-200" onClick={() => setAttachmentListDialogOpen(true)} disabled={effectiveAttachmentCount === 0}>
                                            View ({effectiveAttachmentCount})
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Party Selection & Logistics Block */}
                        <div className="grid grid-cols-12 gap-3 bg-white dark:bg-card p-3 rounded-lg border border-secondary-200/60 dark:border-border shadow-sm shrink-0">
                            <div className="col-span-4 flex flex-col gap-1.5">
                                <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">From <span className="text-rose-500">*</span></Label>
                                <SearchableSelect
                                    options={fromOptions}
                                    value={fromPartyId ?? ""}
                                    onChange={(val) => { setFromPartyId(val === "" ? null : Number(val)); setItems([]); }}
                                    disabled={isReadOnly || lockStructure || items.length > 0}
                                    placeholder="Choose source..."
                                />
                                <Label className="text-[11px] font-semibold text-secondary-500 dark:text-secondary-500 mt-0.5">Address</Label>
                                <div className="min-h-[64px] px-2.5 py-1.5 rounded border border-secondary-100 dark:border-border bg-secondary-50/50 dark:bg-secondary-200/10 text-xs text-secondary-700 dark:text-secondary-300 leading-snug overflow-y-auto font-medium">
                                    {fromAddress ?? "—"}
                                </div>
                            </div>
                            <div className="col-span-4 flex flex-col gap-1.5">
                                <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">To <span className="text-rose-500">*</span></Label>
                                <SearchableSelect
                                    options={destinationOptions}
                                    value={toPartyId ?? ""}
                                    onChange={(val) => setToPartyId(val === "" ? null : Number(val))}
                                    disabled={isReadOnly || lockStructure}
                                    placeholder="Choose destination..."
                                />
                                <Label className="text-[11px] font-semibold text-secondary-500 dark:text-secondary-500 mt-0.5">Address</Label>
                                <div className="min-h-[64px] px-2.5 py-1.5 rounded border border-secondary-100 dark:border-border bg-secondary-50/50 dark:bg-secondary-200/10 text-xs text-secondary-700 dark:text-secondary-300 leading-snug overflow-y-auto font-medium">
                                    {toAddress ?? "—"}
                                </div>
                            </div>
                            <div className="col-span-4 flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase text-secondary-400 dark:text-secondary-500 tracking-widest">Logistics & Dispatch Details</span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Vehicle No. <span className="text-rose-500">*</span></Label>
                                        <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="e.g. GJ01..." readOnly={isReadOnly} className="h-8 border-secondary-200 dark:border-border text-xs dark:bg-card dark:text-foreground dark:placeholder:text-secondary-600" />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Person Name <span className="text-rose-500">*</span></Label>
                                        <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Name..." readOnly={isReadOnly} className="h-8 border-secondary-200 dark:border-border text-xs dark:bg-card dark:text-foreground dark:placeholder:text-secondary-600" />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 mt-0.5">
                                    <Label className="text-[11px] font-semibold text-secondary-600 dark:text-secondary-500">Reason Details <span className="text-rose-500">*</span></Label>
                                    <Input value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} placeholder="e.g. FOR CASTING REPAIR" readOnly={isReadOnly} className="h-8 border-secondary-200 dark:border-border text-xs dark:bg-card dark:text-foreground dark:placeholder:text-secondary-600" />
                                </div>
                            </div>
                        </div>

                        {/* Items table: min-height for 4–5 visible rows; scroll only inside table after that */}
                        <div className="flex-1 min-h-[280px] flex flex-col border border-secondary-200 dark:border-border rounded-lg bg-white dark:bg-card overflow-hidden shadow-sm">
                            <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                                <table className="w-full border-collapse text-sm min-w-[900px]">
                                    <thead className="sticky top-0 bg-secondary-100 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-border z-10">
                                        <tr>
                                            <th className="text-center py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider whitespace-nowrap w-14">Sr.No</th>
                                            <th className="text-left py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider whitespace-nowrap">Item Specification</th>
                                            <th className="text-left py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider whitespace-nowrap w-40">Material / Type</th>
                                            <th className="text-left py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider whitespace-nowrap w-48">Technical Docs</th>
                                            <th className="text-left py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider whitespace-nowrap min-w-[180px]">Item Remarks</th>
                                            {!isReadOnly && !lockStructure && <th className="text-center py-2 px-2 font-semibold text-secondary-700 dark:text-secondary-200 text-[11px] uppercase tracking-wider w-16">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100 dark:divide-border bg-white dark:bg-card">
                                        {items.length === 0 ? (<tr>
                                                <td colSpan={6} className="py-8 text-center text-secondary-500 dark:text-secondary-500 text-xs">
                                                    No items. Select source/destination and click &quot;Add Items for Transfer&quot; to begin.
                                                </td>
                                            </tr>
                                        ) : (
                                            items.map((item, idx) => (<tr key={item.itemId} className="hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors">
                                                    <td className="py-2 px-2 text-center text-secondary-500 dark:text-secondary-500 font-medium text-xs">{idx + 1}</td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-secondary-900 dark:text-foreground truncate text-xs">{item.itemName}</span>
                                                            <span className="text-[11px] text-secondary-500 dark:text-secondary-500 truncate">{item.mainPartName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-secondary-700 dark:text-secondary-300 font-medium text-[11px]">{item.itemTypeName ?? "—"}</span>
                                                            <span className="text-[10px] text-secondary-400 dark:text-secondary-500">{item.materialName ?? "—"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-medium text-secondary-800 dark:text-secondary-200 text-[11px] truncate">{item.drawingNo ?? "NO DRAWING"}</span>
                                                            <span className="text-[10px] text-secondary-400 dark:text-secondary-500">Rev: {item.revisionNo ?? "00"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2 min-w-[160px]">
                                                        <Input value={item.remarks || ""} onChange={(e) => updateItem(item.itemId, "remarks", e.target.value)} disabled={isReadOnly} placeholder="Line notes..." className={cn("h-7 text-[11px] border-secondary-200 dark:border-border focus:border-primary-400 bg-secondary-50/30 dark:bg-secondary-200/10 rounded dark:text-foreground dark:placeholder:text-secondary-600", isReadOnly && "opacity-50 cursor-not-allowed")} />
                                                    </td>
                                                    {!isReadOnly && !lockStructure && (
                                                        <td className="py-2 px-2 text-center">
                                                            <Button variant="ghost" size="sm" onClick={() => removeItem(item.itemId)} className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 rounded-full">
                                                                <Trash2 className="w-3.5 h-3.5" />
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

                        {/* Overall remarks: small */}
                        <div className="bg-white dark:bg-card p-3 rounded-lg border border-secondary-200/60 dark:border-border shadow-sm shrink-0 flex flex-col gap-1">
                            <Label className="text-[10px] font-black text-secondary-500 uppercase tracking-widest block leading-none">Overall Transfer Remarks</Label>
                            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks..." readOnly={isReadOnly} rows={2} className={cn("min-h-0 text-xs border-secondary-100 dark:border-border bg-secondary-50/20 dark:bg-secondary-200/10 rounded resize-none py-2 dark:text-foreground dark:placeholder:text-secondary-600", isReadOnly && "bg-secondary-50 dark:bg-secondary-200/10 cursor-default")} />
                        </div>
                    </div>

                    {/* Footer: Cancel & Save or Cancel & Update */}
                    <footer className="shrink-0 border-t border-secondary-200 dark:border-border bg-white dark:bg-card px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-8px_20px_-12px_rgba(0,0,0,0.05)]">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-9 px-5 font-semibold dark:border-border"
                        >
                            Cancel
                        </Button>
                        {!isReadOnly && (
                            <Button
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || updateMutation.isPending || uploading || items.length === 0 || !isValid || (isEditing && !canEdit)}
                                className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2 disabled:opacity-50"
                            >
                                {createMutation.isPending || updateMutation.isPending || uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                {isEditing ? "Update" : "Save"}
                            </Button>
                        )}
                    </footer>
                </div>
            </Dialog>


            <TransferItemSelectionDialog
                open={itemSelectionOpen}
                onClose={() => setItemSelectionOpen(false)}
                fromPartyId={fromPartyId}
                selectedItemIds={items.map((i: TransferGridItem) => i.itemId)}
                onAddItems={addItems}
            />

            <AttachmentListDialog
                open={attachmentListDialogOpen}
                onClose={() => setAttachmentListDialogOpen(false)}
                urls={attachmentUrls}
                urlsToDelete={attachmentUrlsToDelete}
                pendingFiles={pendingAttachmentFiles}
                onRemoveUrl={removeAttachmentUrl}
                onRemovePending={removePendingAttachment}
                isEditing={isEditing}
                title="Transfer Attachments"
            />
        </>
    );
}
