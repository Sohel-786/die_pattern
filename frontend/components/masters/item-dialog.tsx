"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Item, HolderType, ItemNameHistoryEntry } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { Save, X, ShieldCheck, Power, Package, FileText, Hash, Layers, Users, Info, MapPin, Truck, PackageX, History, RotateCcw } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "react-hot-toast";
import { formatDateTime } from "@/lib/utils";

const itemSchema = z.object({
    mainPartName: z.string().min(1, "Main Part Name is required"),
    currentName: z.string().min(1, "Current Name is required"),
    itemTypeId: z.coerce.number().min(1, "Asset Type is required"),
    drawingNo: z.string().optional().nullable(),
    revisionNo: z.string().optional().nullable(),
    materialId: z.coerce.number().min(1, "Construction Material is required"),
    ownerTypeId: z.coerce.number().min(1, "Asset Ownership is required"),
    statusId: z.coerce.number().min(1, "Functional Status is required"),
    currentHolderType: z.nativeEnum(HolderType),
    currentLocationId: z.coerce.number().optional().nullable(),
    currentPartyId: z.coerce.number().optional().nullable(),
    isActive: z.boolean().default(true),
}).refine((data) => data.currentHolderType !== HolderType.Vendor || (data.currentPartyId != null && data.currentPartyId > 0), {
    message: "Please select a vendor when custodian is Vendor",
    path: ["currentPartyId"],
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ItemFormValues) => void;
    item?: Item | null;
    isLoading?: boolean;
    existingItems?: Item[];
    readOnly?: boolean;
    /** When true, shows the Display Name History Action column (Revert) for the latest change. Admin only. */
    isAdmin?: boolean;
}

export function ItemDialog({ isOpen, onClose, onSubmit, item, isLoading, existingItems = [], readOnly, isAdmin = false }: ItemDialogProps) {
    const isReadOnly = !!readOnly;
    const [submitting, setSubmitting] = useState(false);
    const observedInFlightRef = React.useRef(false);
    const submitLockRef = React.useRef(false);
    const showRevertAction = !isReadOnly && isAdmin;
    const queryClient = useQueryClient();

    useEffect(() => {
        // Only release the local lock after the parent actually enters "loading"
        // (prevents double-submit before react-query flips `isLoading` to true).
        if (isLoading) observedInFlightRef.current = true;
        if (!isLoading && observedInFlightRef.current && submitting) {
            setSubmitting(false);
            observedInFlightRef.current = false;
            submitLockRef.current = false;
        }
    }, [isLoading, submitting]);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            currentHolderType: HolderType.Location,
            isActive: true,
        },
    });

    const holderType = watch("currentHolderType");
    const isActive = watch("isActive");
    const watchedMainPartName = watch("mainPartName");
    const watchedCurrentName = watch("currentName");
    const watchedDrawingNo = watch("drawingNo");

    const mainPartNames = React.useMemo(() => {
        return Array.from(new Set(existingItems.map(i => i.mainPartName))).sort();
    }, [existingItems]);

    const displayNames = React.useMemo(() => {
        return Array.from(new Set(existingItems.map(i => i.currentName))).sort();
    }, [existingItems]);

    const drawingNumbers = React.useMemo(() => {
        return Array.from(new Set(existingItems.map(i => i.drawingNo).filter(Boolean) as string[])).sort();
    }, [existingItems]);

    const itemTypeId = watch("itemTypeId");
    const materialId = watch("materialId");
    const ownerTypeId = watch("ownerTypeId");
    const statusId = watch("statusId");
    const currentLocationId = watch("currentLocationId");
    const currentPartyId = watch("currentPartyId");

    // Fetch Master Data
    const { data: itemTypes = [] } = useQuery({ queryKey: ["item-types", "active"], queryFn: async () => (await api.get("/masters/item-types/active")).data.data });
    const { data: materials = [] } = useQuery({ queryKey: ["materials", "active"], queryFn: async () => (await api.get("/masters/materials/active")).data.data });
    const { data: statuses = [] } = useQuery({ queryKey: ["item-statuses", "active"], queryFn: async () => (await api.get("/masters/item-statuses/active")).data.data });
    const { data: owners = [] } = useQuery({ queryKey: ["owner-types", "active"], queryFn: async () => (await api.get("/masters/owner-types/active")).data.data });
    const { data: locations = [] } = useQuery({ queryKey: ["locations", "active"], queryFn: async () => (await api.get("/locations/active")).data.data });
    const { data: parties = [] } = useQuery({ queryKey: ["parties", "active"], queryFn: async () => (await api.get("/parties/active")).data.data });

    const { data: nameHistory = [], refetch: refetchNameHistory } = useQuery<ItemNameHistoryEntry[]>({
        queryKey: ["items", item?.id, "name-history"],
        queryFn: async () => (await api.get(`/items/${item!.id}/name-history`)).data?.data ?? [],
        enabled: !!(item?.id && isOpen),
    });

    const revertMutation = useMutation({
        mutationFn: async (changeLogId: number) => api.post(`/items/${item!.id}/revert-name`, { changeLogId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            refetchNameHistory();
            toast.success("Display name reverted.");
            onClose();
        },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Revert failed."),
    });

    useEffect(() => {
        if (item && isOpen) {
            reset({
                mainPartName: item.mainPartName,
                currentName: item.currentName,
                itemTypeId: item.itemTypeId,
                drawingNo: item.drawingNo,
                revisionNo: item.revisionNo,
                materialId: item.materialId,
                ownerTypeId: item.ownerTypeId,
                statusId: item.statusId,
                currentHolderType: item.currentHolderType,
                currentLocationId: item.currentLocationId,
                currentPartyId: item.currentPartyId,
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({
                mainPartName: "",
                currentName: "",
                itemTypeId: 0,
                drawingNo: "",
                revisionNo: "0",
                materialId: 0,
                ownerTypeId: 0,
                statusId: 0,
                currentHolderType: HolderType.Location,
                currentLocationId: undefined,
                currentPartyId: undefined,
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Die / Pattern Master" : "Add New Die / Pattern Master"}
            size="2xl"
        >
            <form
                onSubmit={handleSubmit((data) => {
                    if (isReadOnly) return;
                    // Prevent double-click before react-query state updates.
                    if (submitLockRef.current || submitting || isLoading) return;
                    submitLockRef.current = true;
                    setSubmitting(true);
                    onSubmit(data);
                })}
                className="space-y-8"
            >
                <fieldset disabled={isReadOnly} className="space-y-8">
                {/* Identity Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100 dark:border-secondary-800">
                        <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200 dark:shadow-none"></div>
                        <h4 className="text-sm font-bold text-secondary-900 dark:text-foreground uppercase tracking-tight flex items-center gap-2">
                            Core Identity
                        </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="mainPartName" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Main Die/Part Name <span className="text-rose-500">*</span>
                            </Label>
                            <Autocomplete
                                id="mainPartName"
                                value={watchedMainPartName || ""}
                                onChange={(val) => setValue("mainPartName", val, { shouldValidate: true })}
                                options={mainPartNames}
                                placeholder="e.g. EBW 200 BODY"
                                className="h-11 shadow-sm disabled:opacity-50 dark:bg-card dark:border-border font-bold text-sm tracking-tight"
                                onBlur={() => { }} // No-op
                                disabled={!!item}
                            />
                            {errors.mainPartName && <p className="text-sm text-red-600 mt-1 uppercase text-[10px] font-bold">{errors.mainPartName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currentName" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Display Name <span className="text-rose-500">*</span>
                            </Label>
                            <Autocomplete
                                id="currentName"
                                value={watchedCurrentName || ""}
                                onChange={(val) => setValue("currentName", val, { shouldValidate: true })}
                                options={displayNames}
                                placeholder="e.g. EBW 200 BODY - REV 1"
                                className="h-11 shadow-sm dark:bg-card dark:border-border font-bold text-sm tracking-tight"
                            />
                            {errors.currentName && <p className="text-sm text-red-600 mt-1 uppercase text-[10px] font-bold">{errors.currentName.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Specifications Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100 dark:border-secondary-800">
                        <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200 dark:shadow-none"></div>
                        <h4 className="text-sm font-bold text-secondary-900 dark:text-foreground uppercase tracking-tight">Specifications</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="itemTypeId" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Asset Type <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <SearchableSelect
                                    options={itemTypes.map((t: any) => ({ value: t.id, label: t.name }))}
                                    value={itemTypeId || ""}
                                    onChange={(val) => setValue("itemTypeId", Number(val), { shouldValidate: true })}
                                    placeholder="Select Type"
                                    id="itemTypeId"
                                />
                            </div>
                            {errors.itemTypeId && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.itemTypeId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="drawingNo" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">Drawing Number</Label>
                            <Autocomplete
                                id="drawingNo"
                                value={watchedDrawingNo || ""}
                                onChange={(val) => setValue("drawingNo", val, { shouldValidate: true })}
                                options={drawingNumbers}
                                placeholder="DRW-001"
                                className="h-11 shadow-sm dark:bg-card dark:border-border font-bold text-sm tracking-tight"
                            />
                            {!watchedDrawingNo && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-500 font-black uppercase mt-2 flex items-center gap-1.5 leading-tight italic">
                                    <Info className="w-3.5 h-3.5" />
                                    Notice: Asset will remain inactive for transactions without Drawing No.
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revisionNo" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">Revision</Label>
                            <div className="relative group">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                <Input id="revisionNo" {...register("revisionNo")} className="h-11 pl-10 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight" placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="materialId" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Construction Material <span className="text-rose-500">*</span>
                            </Label>
                            <SearchableSelect
                                options={materials.map((m: any) => ({ value: m.id, label: m.name }))}
                                value={materialId || ""}
                                onChange={(val) => setValue("materialId", Number(val), { shouldValidate: true })}
                                placeholder="Select Material"
                                id="materialId"
                            />
                            {errors.materialId && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.materialId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ownerTypeId" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Asset Ownership <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <SearchableSelect
                                    options={owners.map((o: any) => ({ value: o.id, label: o.name }))}
                                    value={ownerTypeId || ""}
                                    onChange={(val) => setValue("ownerTypeId", Number(val), { shouldValidate: true })}
                                    placeholder="Select Owner"
                                    id="ownerTypeId"
                                />
                            </div>
                            {errors.ownerTypeId && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.ownerTypeId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="statusId" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                                Functional Status <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <SearchableSelect
                                    options={statuses.map((s: any) => ({ value: s.id, label: s.name }))}
                                    value={statusId || ""}
                                    onChange={(val) => setValue("statusId", Number(val), { shouldValidate: true })}
                                    placeholder="Select Status"
                                    id="statusId"
                                />
                            </div>
                            {errors.statusId && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.statusId.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Initial Custodian: At Location (in-stock), Vendor, or Not in stock */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100 dark:border-secondary-800">
                        <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200 dark:shadow-none"></div>
                        <h4 className="text-sm font-bold text-secondary-900 dark:text-foreground uppercase tracking-tight">Initial Custodian</h4>
                    </div>
                    <div className="p-5 bg-secondary-50/50 dark:bg-secondary-950/20 rounded-2xl border border-secondary-200 dark:border-border flex flex-col gap-6 shadow-inner">
                        <div className="flex flex-wrap gap-2 p-1 bg-white dark:bg-secondary-900/50 rounded-xl border border-secondary-200 dark:border-border w-fit shadow-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("currentHolderType", HolderType.Location);
                                    setValue("currentLocationId", null);
                                    setValue("currentPartyId", null);
                                }}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all duration-300",
                                    holderType === HolderType.Location 
                                        ? "bg-primary-600 text-white shadow-md shadow-primary-900/20" 
                                        : "text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400"
                                )}
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                At Location
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("currentHolderType", HolderType.Vendor);
                                    setValue("currentLocationId", null);
                                    setValue("currentPartyId", null);
                                }}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all duration-300",
                                    holderType === HolderType.Vendor 
                                        ? "bg-primary-600 text-white shadow-md shadow-primary-900/20" 
                                        : "text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400"
                                )}
                            >
                                <Truck className="w-3.5 h-3.5" />
                                Vendor
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setValue("currentHolderType", HolderType.NotInStock);
                                    setValue("currentLocationId", null);
                                    setValue("currentPartyId", null);
                                }}
                                className={cn(
                                    "flex items-center gap-2.5 px-5 py-2 rounded-lg text-[11px] font-black tracking-widest uppercase transition-all duration-300",
                                    holderType === HolderType.NotInStock 
                                        ? "bg-primary-600 text-white shadow-md shadow-primary-900/20" 
                                        : "text-secondary-500 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400"
                                )}
                            >
                                <PackageX className="w-3.5 h-3.5" />
                                Not in stock
                            </button>
                        </div>

                        {holderType === HolderType.Location && (
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                                Item will be counted as <strong>in-stock at your current location</strong>. No location selection needed.
                            </p>
                        )}
                        {holderType === HolderType.Vendor && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                <Label htmlFor="currentPartyId" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">External Vendor</Label>
                                <SearchableSelect
                                    options={parties.map((p: any) => ({ value: p.id, label: p.name }))}
                                    value={currentPartyId || ""}
                                    onChange={(val) => setValue("currentPartyId", Number(val), { shouldValidate: true })}
                                    placeholder="Select Vendor"
                                    id="currentPartyId"
                                />
                            </div>
                        )}
                        {holderType === HolderType.NotInStock && (
                            <p className="text-xs text-secondary-600 dark:text-secondary-400 font-medium">
                                Item is not in stock. It can be added to a Purchase Indent when needed.
                            </p>
                        )}
                    </div>
                </div>

                {/* Active toggle - edit mode only */}
                {!!item && (
                    <div className="flex items-center py-1 px-1">
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isActive}
                                    onChange={(e) => setValue("isActive", e.target.checked)}
                                />
                                <div className={cn(
                                    "w-11 h-6 rounded-full transition-all duration-300 shadow-inner",
                                    isActive ? "bg-primary-600 shadow-primary-900/20" : "bg-secondary-200 dark:bg-secondary-800"
                                )}></div>
                                <div className={cn(
                                    "absolute top-1 left-1 bg-white dark:bg-secondary-100 w-4 h-4 rounded-full transition-all duration-300 shadow-sm transform",
                                    isActive ? "translate-x-5 scale-105" : "translate-x-0"
                                )}></div>
                            </div>
                            <span className="text-xs font-black text-secondary-700 dark:text-secondary-300 uppercase tracking-widest select-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                Active Production Status
                            </span>
                        </label>
                    </div>
                )}

                {/* Display name history - edit/view mode only */}
                {!!item && nameHistory.length >= 0 && (
                    <div className="space-y-4 pt-6 border-t border-secondary-100 dark:border-secondary-800">
                        <div className="flex items-center gap-2.5 px-1">
                            <History className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                            <h4 className="text-[11px] font-black text-secondary-900 dark:text-secondary-100 uppercase tracking-widest leading-none">Display Name History</h4>
                        </div>
                        {nameHistory.length === 0 ? (
                            <p className="text-xs text-secondary-500 italic">No display name changes recorded.</p>
                        ) : (
                            <div className="rounded-xl border border-secondary-200 dark:border-border overflow-hidden bg-white dark:bg-card shadow-sm">
                                <table className="w-full text-[11px]">
                                    <thead className="bg-secondary-50 dark:bg-secondary-900/50 border-b border-secondary-200 dark:border-border">
                                        <tr>
                                            <th className="text-left py-2.5 px-4 font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                            <th className="text-left py-2.5 px-4 font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest whitespace-nowrap">From → To</th>
                                            <th className="text-left py-2.5 px-4 font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest whitespace-nowrap">Source</th>
                                            <th className="text-left py-2.5 px-4 font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest whitespace-nowrap">Reference</th>
                                            {showRevertAction && <th className="text-right py-2.5 px-4 font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest whitespace-nowrap w-24">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                                        {nameHistory.map((h) => (
                                            <tr key={h.id} className="hover:bg-secondary-50/50 dark:hover:bg-secondary-900/40 transition-colors">
                                                <td className="py-2.5 px-4 text-secondary-500 dark:text-secondary-400 font-bold tabular-nums italic">{formatDateTime(h.createdAt)}</td>
                                                <td className="py-2.5 px-4 font-black text-secondary-900 dark:text-secondary-100 uppercase tracking-tight">{h.oldName} → {h.newName}</td>
                                                <td className="py-2.5 px-4 text-secondary-600 dark:text-secondary-400 font-bold italic">{h.source ?? h.changeType ?? "—"}</td>
                                                <td className="py-2.5 px-4 text-secondary-500 dark:text-secondary-500 font-bold tabular-nums">{[h.jobWorkNo, h.inwardNo, h.qcNo].filter(Boolean).join(" / ") || "—"}</td>
                                                {showRevertAction && (
                                                    <td className="py-2 px-3 text-right">
                                                        {h.canRevert ? (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest text-[9px] hover:bg-primary-50 dark:hover:bg-primary-900/30"
                                                                onClick={() => revertMutation.mutate(h.id)}
                                                                disabled={revertMutation.isPending}
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                                                Revert
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[10px] text-secondary-400">—</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                </fieldset>

                <div className="flex gap-4 pt-6 border-t border-secondary-100 dark:border-secondary-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className={cn(
                            "border-secondary-300 dark:border-secondary-800 text-secondary-700 dark:text-secondary-400 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl transition-all hover:bg-secondary-50 dark:hover:bg-secondary-900 active:scale-95",
                            isReadOnly ? "w-full" : "flex-1"
                        )}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    {!isReadOnly && (
                        <Button
                            type="submit"
                            disabled={isLoading || submitting}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 disabled:scale-100"
                        >
                            {isLoading || submitting ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Registering...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Master
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}

