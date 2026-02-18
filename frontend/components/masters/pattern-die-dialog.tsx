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
        <Dialog isOpen={isOpen} onClose={onClose} title={item ? "Update Pattern / Die" : "Register New Pattern / Die"} hideHeader={true}>
            <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-hide">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 sticky top-0 z-10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-white">
                            {item ? "Update Pattern / Die" : "Register New Pattern / Die"}
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">
                            Initialize your pattern or die in the registry with full specifications
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
                    {/* Identity Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                            Core Identity
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Main Part Name <span className="text-rose-500">*</span></Label>
                                <Input
                                    {...register("mainPartName")}
                                    disabled={!!item}
                                    className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all disabled:opacity-50"
                                    placeholder="e.g. EBW 200 BODY"
                                />
                                {errors.mainPartName && <p className="text-xs text-rose-500 ml-1">{errors.mainPartName.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Current Name <span className="text-rose-500">*</span></Label>
                                <Input
                                    {...register("currentName")}
                                    className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200"
                                    placeholder="e.g. EBW 200 BODY - REV 1"
                                />
                                {errors.currentName && <p className="text-xs text-rose-500 ml-1">{errors.currentName.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Specifications Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                            Specifications
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Pattern Type <span className="text-rose-500">*</span></Label>
                                <select {...register("patternTypeId")} className="w-full h-12 rounded-2xl bg-secondary-50/50 border-gray-200 text-sm font-medium px-4">
                                    <option value="">Select Type</option>
                                    {patternTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                {errors.patternTypeId && <p className="text-xs text-rose-500 ml-1">Required</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Drawing Number</Label>
                                <Input {...register("drawingNo")} className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200" placeholder="DRW-001" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Revision</Label>
                                <Input {...register("revisionNo")} className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200" placeholder="0" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Material <span className="text-rose-500">*</span></Label>
                                <select {...register("materialId")} className="w-full h-12 rounded-2xl bg-secondary-50/50 border-gray-200 text-sm font-medium px-4">
                                    <option value="">Select Material</option>
                                    {materials.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Owner <span className="text-rose-500">*</span></Label>
                                <select {...register("ownerTypeId")} className="w-full h-12 rounded-2xl bg-secondary-50/50 border-gray-200 text-sm font-medium px-4">
                                    <option value="">Select Owner</option>
                                    {owners.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-gray-700 ml-1">Initial Status <span className="text-rose-500">*</span></Label>
                                <select {...register("statusId")} className="w-full h-12 rounded-2xl bg-secondary-50/50 border-gray-200 text-sm font-medium px-4">
                                    <option value="">Select Status</option>
                                    {statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Initial Stock / Holder Section */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-primary-600 uppercase tracking-widest flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                            Current Stock Holder
                        </h4>
                        <div className="p-6 bg-secondary-50/50 rounded-3xl border border-gray-100 flex flex-col gap-6">
                            <div className="flex gap-4 p-1 bg-white rounded-2xl border border-gray-100 w-fit">
                                <button
                                    type="button"
                                    onClick={() => setValue("currentHolderType", HolderType.Location)}
                                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${holderType === HolderType.Location ? 'bg-primary-600 text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-700'}`}
                                >
                                    LOCATION
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setValue("currentHolderType", HolderType.Vendor)}
                                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${holderType === HolderType.Vendor ? 'bg-primary-600 text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-700'}`}
                                >
                                    VENDOR
                                </button>
                            </div>

                            {holderType === HolderType.Location ? (
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Select Location</Label>
                                    <select {...register("currentLocationId")} className="w-full h-12 rounded-2xl bg-white border-gray-200 text-sm font-medium px-4 shadow-sm">
                                        <option value="">Select Location</option>
                                        {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-gray-700 ml-1">Select Vendor</Label>
                                    <select {...register("currentPartyId")} className="w-full h-12 rounded-2xl bg-white border-gray-200 text-sm font-medium px-4 shadow-sm">
                                        <option value="">Select Vendor</option>
                                        {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                            Discard
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-14 rounded-2xl font-extrabold bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary/25 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Saving Entry..." : item ? "Update Information" : "Save Entry"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
