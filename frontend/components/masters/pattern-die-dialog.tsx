"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PatternDie, HolderType } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";

const patternDieSchema = z.object({
    mainPartName: z.string().min(1, "Main Part Name is required"),
    currentName: z.string().min(1, "Current Name is required"),
    patternTypeId: z.coerce.number().min(1, "Pattern Type is required"),
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

type PatternDieFormValues = z.infer<typeof patternDieSchema>;

interface PatternDieDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PatternDieFormValues) => void;
    item?: PatternDie | null;
    isLoading?: boolean;
}

export function PatternDieDialog({ isOpen, onClose, onSubmit, item, isLoading }: PatternDieDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<PatternDieFormValues>({
        resolver: zodResolver(patternDieSchema),
        defaultValues: {
            currentHolderType: HolderType.Location,
            isActive: true,
        },
    });

    const holderType = watch("currentHolderType");
    const isActive = watch("isActive");

    // Fetch Master Data
    const { data: patternTypes = [] } = useQuery({ queryKey: ["pattern-types"], queryFn: async () => (await api.get("/masters/pattern-types")).data.data });
    const { data: materials = [] } = useQuery({ queryKey: ["materials"], queryFn: async () => (await api.get("/masters/materials")).data.data });
    const { data: statuses = [] } = useQuery({ queryKey: ["pattern-statuses"], queryFn: async () => (await api.get("/masters/pattern-statuses")).data.data });
    const { data: owners = [] } = useQuery({ queryKey: ["owner-types"], queryFn: async () => (await api.get("/masters/owner-types")).data.data });
    const { data: locations = [] } = useQuery({ queryKey: ["locations", "active"], queryFn: async () => (await api.get("/locations")).data.data });
    const { data: parties = [] } = useQuery({ queryKey: ["parties", "active"], queryFn: async () => (await api.get("/parties")).data.data });

    useEffect(() => {
        if (item) {
            reset({
                mainPartName: item.mainPartName,
                currentName: item.currentName,
                patternTypeId: item.patternTypeId,
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
        } else {
            reset({
                mainPartName: "",
                currentName: "",
                patternTypeId: 0,
                drawingNo: "",
                revisionNo: "",
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
            title={item ? "Update Pattern / Die" : "Register New Pattern / Die"}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Identity Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                        <div className="h-5 w-1 bg-primary-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Core Identity</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="mainPartName" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Main Part Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="mainPartName"
                                {...register("mainPartName")}
                                disabled={!!item}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm disabled:bg-secondary-50"
                                placeholder="e.g. EBW 200 BODY"
                            />
                            {errors.mainPartName && <p className="text-xs text-rose-500 mt-1">{errors.mainPartName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currentName" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Current Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="currentName"
                                {...register("currentName")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                                placeholder="e.g. EBW 200 BODY - REV 1"
                            />
                            {errors.currentName && <p className="text-xs text-rose-500 mt-1">{errors.currentName.message}</p>}
                        </div>
                    </div>
                </div>

                {/* Specifications Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                        <div className="h-5 w-1 bg-primary-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Specifications</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="patternTypeId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Pattern Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="patternTypeId"
                                {...register("patternTypeId")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <option value="">Select Type</option>
                                {patternTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {errors.patternTypeId && <p className="text-xs text-rose-500 mt-1">Required</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="drawingNo" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Drawing Number</Label>
                            <Input id="drawingNo" {...register("drawingNo")} className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm" placeholder="DRW-001" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="revisionNo" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Revision</Label>
                            <Input id="revisionNo" {...register("revisionNo")} className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm" placeholder="0" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="materialId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Material <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="materialId"
                                {...register("materialId")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <option value="">Select Material</option>
                                {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ownerTypeId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Owner <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="ownerTypeId"
                                {...register("ownerTypeId")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <option value="">Select Owner</option>
                                {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="statusId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Initial Status <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="statusId"
                                {...register("statusId")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                <option value="">Select Status</option>
                                {statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Initial Stock / Holder Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-secondary-100">
                        <div className="h-5 w-1 bg-primary-500 rounded-full"></div>
                        <h4 className="text-sm font-bold text-secondary-900 uppercase tracking-tight">Current Stock Holder</h4>
                    </div>
                    <div className="p-6 bg-secondary-50/50 rounded-xl border border-secondary-200 flex flex-col gap-6">
                        <div className="flex gap-2 p-1 bg-white rounded-lg border border-secondary-200 w-fit">
                            <button
                                type="button"
                                onClick={() => setValue("currentHolderType", HolderType.Location)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${holderType === HolderType.Location ? 'bg-primary-600 text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                LOCATION
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue("currentHolderType", HolderType.Vendor)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${holderType === HolderType.Vendor ? 'bg-primary-600 text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                VENDOR
                            </button>
                        </div>

                        {holderType === HolderType.Location ? (
                            <div className="space-y-2">
                                <Label htmlFor="currentLocationId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Select Location</Label>
                                <select
                                    id="currentLocationId"
                                    {...register("currentLocationId")}
                                    className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                >
                                    <option value="">Select Location</option>
                                    {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="currentPartyId" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Select Vendor</Label>
                                <select
                                    id="currentPartyId"
                                    {...register("currentPartyId")}
                                    className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                >
                                    <option value="">Select Vendor</option>
                                    {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {isLoading ? "Saving Entry..." : (item ? "Update Information" : "Save Entry")}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300"
                    >
                        Discard
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
