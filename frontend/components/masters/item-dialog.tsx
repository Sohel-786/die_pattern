"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Item, HolderType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { Save, X, ShieldCheck, Power, Package, FileText, Hash, Layers, Users, Info, MapPin, Truck } from "lucide-react";

const itemSchema = z.object({
    mainPartName: z.string().min(1, "Main Part Name is required"),
    currentName: z.string().min(1, "Current Name is required"),
    itemTypeId: z.coerce.number().min(1, "Item Type is required"),
    drawingNo: z.string().optional().nullable(),
    revisionNo: z.string().optional().nullable(),
    materialId: z.coerce.number().min(1, "Material is required"),
    ownerTypeId: z.coerce.number().min(1, "Owner Type is required"),
    statusId: z.coerce.number().min(1, "Status is required"),
    currentHolderType: z.nativeEnum(HolderType),
    currentLocationId: z.coerce.number().optional().nullable(),
    currentPartyId: z.coerce.number().optional().nullable(),
    isActive: z.boolean().default(true),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ItemFormValues) => void;
    item?: Item | null;
    isLoading?: boolean;
}

export function ItemDialog({ isOpen, onClose, onSubmit, item, isLoading }: ItemDialogProps) {
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

    // Fetch Master Data
    const { data: itemTypes = [] } = useQuery({ queryKey: ["item-types", "active"], queryFn: async () => (await api.get("/masters/item-types/active")).data.data });
    const { data: materials = [] } = useQuery({ queryKey: ["materials", "active"], queryFn: async () => (await api.get("/masters/materials/active")).data.data });
    const { data: statuses = [] } = useQuery({ queryKey: ["item-statuses", "active"], queryFn: async () => (await api.get("/masters/item-statuses/active")).data.data });
    const { data: owners = [] } = useQuery({ queryKey: ["owner-types", "active"], queryFn: async () => (await api.get("/masters/owner-types/active")).data.data });
    const { data: locations = [] } = useQuery({ queryKey: ["locations", "active"], queryFn: async () => (await api.get("/locations/active")).data.data });
    const { data: parties = [] } = useQuery({ queryKey: ["parties", "active"], queryFn: async () => (await api.get("/parties/active")).data.data });

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
                currentLocationId: null,
                currentPartyId: null,
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Die / Pattern Assets" : "Register New Asset"}
            size="2xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Identity Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                        <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200"></div>
                        <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight flex items-center gap-2">
                            Core Identity
                        </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="mainPartName" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Main Part Name / Model <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="mainPartName"
                                    {...register("mainPartName")}
                                    disabled={!!item}
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium disabled:bg-secondary-50"
                                    placeholder="e.g. EBW 200 BODY"
                                />
                            </div>
                            {errors.mainPartName && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.mainPartName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currentName" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Display Name <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="currentName"
                                    {...register("currentName")}
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="e.g. EBW 200 BODY - REV 1"
                                />
                            </div>
                            {errors.currentName && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.currentName.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Specifications Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                        <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200"></div>
                        <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Specifications</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="itemTypeId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Asset Type <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <select
                                    id="itemTypeId"
                                    {...register("itemTypeId")}
                                    className="flex h-11 w-full pl-10 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                >
                                    <option value="">Select Type</option>
                                    {itemTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            {errors.itemTypeId && <p className="text-xs text-rose-500 mt-1 font-medium">Required</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="drawingNo" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Drawing Number</Label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input id="drawingNo" {...register("drawingNo")} className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="DRW-001" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revisionNo" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Revision</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input id="revisionNo" {...register("revisionNo")} className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="materialId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Construction Material <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="materialId"
                                {...register("materialId")}
                                className="flex h-11 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                            >
                                <option value="">Select Material</option>
                                {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ownerTypeId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Asset Ownership <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <select
                                    id="ownerTypeId"
                                    {...register("ownerTypeId")}
                                    className="flex h-11 w-full pl-10 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                >
                                    <option value="">Select Owner</option>
                                    {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="statusId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Functional Status <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Info className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <select
                                    id="statusId"
                                    {...register("statusId")}
                                    className="flex h-11 w-full pl-10 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                >
                                    <option value="">Select Status</option>
                                    {statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Holder / Active Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Initial Stock / Holder Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                            <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200"></div>
                            <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Initial Custodian</h4>
                        </div>
                        <div className="p-5 bg-secondary-50/50 rounded-2xl border border-secondary-200 flex flex-col gap-5">
                            <div className="flex gap-2 p-1 bg-white rounded-xl border border-secondary-200 w-fit shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setValue("currentHolderType", HolderType.Location)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${holderType === HolderType.Location ? 'bg-primary-600 text-white shadow-md' : 'text-secondary-500 hover:text-secondary-700'}`}
                                >
                                    <MapPin className="w-3.5 h-3.5" />
                                    INTERNAL
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setValue("currentHolderType", HolderType.Vendor)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold transition-all ${holderType === HolderType.Vendor ? 'bg-primary-600 text-white shadow-md' : 'text-secondary-500 hover:text-secondary-700'}`}
                                >
                                    <Truck className="w-3.5 h-3.5" />
                                    VENDOR
                                </button>
                            </div>

                            {holderType === HolderType.Location ? (
                                <div className="space-y-2">
                                    <Label htmlFor="currentLocationId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Internal Location</Label>
                                    <select
                                        id="currentLocationId"
                                        {...register("currentLocationId")}
                                        className="flex h-11 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                    >
                                        <option value="">Select Warehouse/Floor</option>
                                        {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="currentPartyId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">External Vendor</Label>
                                    <select
                                        id="currentPartyId"
                                        {...register("currentPartyId")}
                                        className="flex h-11 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                                    >
                                        <option value="">Select Vendor</option>
                                        {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                            <div className="h-5 w-1 bg-primary-500 rounded-full shadow-sm shadow-primary-200"></div>
                            <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Record Visibility</h4>
                        </div>
                        <div className="flex items-center py-2 px-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isActive}
                                        onChange={(e) => setValue("isActive", e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-secondary-200'}`}></div>
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'} shadow-sm`}></div>
                                </div>
                                <span className="text-sm font-bold text-secondary-700 select-none">Mark as Active</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11 shadow-md transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Registering...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Save
                            </div>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300 text-secondary-700 font-bold h-11 hover:bg-secondary-50 transition-all active:scale-95"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

