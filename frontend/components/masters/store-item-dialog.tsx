"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Save, Camera, Upload, Trash2, X,
    Package, Hash, MapPin,
    FileText, ShieldCheck, Power, AlertCircle
} from "lucide-react";
import { StoreItem } from "@/types";
import { CameraPhotoInput, CameraPhotoInputRef } from "@/components/ui/camera-photo-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";


const itemSchema = z.object({
    itemName: z.string().min(1, "Item name is required"),
    serialNumber: z.string().min(1, "Serial number is required"),
    inHouseLocation: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface StoreItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (fd: FormData) => void;
    item?: StoreItem | null;
    isLoading?: boolean;
    existingItems: StoreItem[];
    readOnly?: boolean;
}

export function StoreItemDialog({
    isOpen,
    onClose,
    onSubmit,
    item,
    isLoading,
    existingItems,
    readOnly
}: StoreItemDialogProps) {
    const isReadOnly = !!readOnly;
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageRemovedByUser, setImageRemovedByUser] = useState(false);
    const cameraInputRef = useRef<CameraPhotoInputRef>(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            isActive: true,
        },
    });

    const watchedItemName = watch("itemName");
    const watchedInHouseLocation = watch("inHouseLocation");
    const isActive = watch("isActive");

    useEffect(() => {
        if (item && isOpen) {
            reset({
                itemName: item.itemName,
                serialNumber: item.serialNumber ?? "",
                inHouseLocation: item.inHouseLocation ?? "",
                description: item.description ?? "",
                isActive: item.isActive,
            });
            setImagePreview(item.image ? (item.image.startsWith("/") ? item.image : `/storage/${item.image}`) : null);
            setImageRemovedByUser(false);
        } else if (isOpen) {
            reset({
                itemName: "",
                serialNumber: "",
                inHouseLocation: "",
                description: "",
                isActive: true,
            });
            setImagePreview(null);
            setImageRemovedByUser(false);
        }
        setImageFile(null);
    }, [item, reset, isOpen]);

    const handleImageCapture = useCallback((file: File | null) => {
        if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(file ? URL.createObjectURL(file) : null);
        if (!file) setImageRemovedByUser(true);
    }, [imagePreview]);

    const handleFormSubmit = (data: ItemFormValues) => {
        if (isReadOnly) return;
        const hasImage = !!imageFile || (!!item?.image && !imageRemovedByUser);
        if (!hasImage) {
            toast.error("Item image is required.");
            return;
        }

        const serialNumber = (data.serialNumber ?? "").trim();
        const dupSerial = existingItems.find(i => i.serialNumber?.toLowerCase() === serialNumber.toLowerCase() && i.id !== item?.id);
        if (dupSerial) {
            toast.error("Serial number already exists");
            return;
        }

        const fd = new FormData();
        fd.append("itemName", data.itemName.trim());
        fd.append("serialNumber", serialNumber);
        if (data.inHouseLocation) fd.append("inHouseLocation", data.inHouseLocation.trim());
        if (data.description) fd.append("description", data.description.trim());
        fd.append("isActive", String(data.isActive));
        if (imageFile) fd.append("image", imageFile);

        onSubmit(fd);
    };

    const filteredItemNames = Array.from(new Set(existingItems.map(i => i.itemName))).sort();
    const filteredInHouseLocations = Array.from(new Set(existingItems.map(i => i.inHouseLocation).filter(Boolean) as string[])).sort();
    const isImageLocked = item && (item._count?.issues ?? 0) > 0;

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={item ? "Update Ledger Record" : "Register Store Asset"} size="2xl">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
                <fieldset disabled={isReadOnly} className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-secondary-900 dark:text-secondary-400 uppercase tracking-[0.2em] pb-3 border-b border-secondary-100 dark:border-border/50">Asset Information</h4>
                            <div className="space-y-5">
                                <div>
                                    <Label className="text-[10px] font-black text-secondary-500 dark:text-secondary-500 uppercase tracking-widest ml-1 mb-2 block">Asset Classification *</Label>
                                    <div className="relative group">
                                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                        <Autocomplete value={watchedItemName || ""} onChange={val => setValue("itemName", val)} options={filteredItemNames} placeholder="e.g. Micrometer" className="h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card font-bold tracking-tight shadow-sm" />
                                    </div>
                                    {errors.itemName && <p className="text-[10px] text-rose-500 mt-1.5 font-bold uppercase tracking-tight ml-1">{errors.itemName.message}</p>}
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black text-secondary-500 dark:text-secondary-500 uppercase tracking-widest ml-1 mb-2 block">Identifier Segment *</Label>
                                    <div className="relative group">
                                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                        <Input {...register("serialNumber")} className="h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card font-mono font-black tracking-[0.1em] shadow-sm" placeholder="SN-XXXXX" />
                                    </div>
                                    {errors.serialNumber && <p className="text-[10px] text-rose-500 mt-1.5 font-bold uppercase tracking-tight ml-1">{errors.serialNumber.message}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black text-secondary-900 dark:text-secondary-400 uppercase tracking-[0.2em] pb-3 border-b border-secondary-100 dark:border-border/50">Storage Control</h4>
                            <div className="space-y-5">
                                <div>
                                    <Label className="text-[10px] font-black text-secondary-500 dark:text-secondary-500 uppercase tracking-widest ml-1 mb-2 block">Warehouse Zone</Label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                        <Autocomplete value={watchedInHouseLocation || ""} onChange={val => setValue("inHouseLocation", val)} options={filteredInHouseLocations} placeholder="e.g. Shelf A-04" className="h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card font-bold tracking-tight shadow-sm" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-black text-secondary-500 dark:text-secondary-500 uppercase tracking-widest ml-1 mb-2 block">Operational Remarks</Label>
                                    <div className="relative group">
                                        <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                        <Textarea {...register("description")} className="min-h-[120px] pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card resize-none text-sm font-bold tracking-tight pt-3.5 shadow-sm transition-all" placeholder="Enter any specific storage or condition notes..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-secondary-900 dark:text-secondary-400 uppercase tracking-[0.2em] pb-3 border-b border-secondary-100 dark:border-border/50">Asset Geometry</h4>
                            <div className="aspect-square rounded-3xl border-2 border-dashed border-secondary-200 dark:border-border bg-secondary-50/30 dark:bg-card/30 flex flex-col items-center justify-center p-6 shadow-inner group/upload transition-all duration-300 hover:border-primary-400/50">
                                {imagePreview ? (
                                    <div className="relative w-full h-full group/preview rounded-2xl overflow-hidden bg-white dark:bg-secondary-950">
                                        <img src={imagePreview} className="w-full h-full object-contain transition-transform duration-500 group-hover/preview:scale-110" />
                                        {!isImageLocked && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                                                <Button type="button" variant="destructive" size="icon" className="h-10 w-10 rounded-xl shadow-xl transform scale-75 group-hover/preview:scale-100 transition-all duration-300" onClick={() => handleImageCapture(null)}><Trash2 className="w-5 h-5" /></Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-secondary-100 dark:bg-secondary-900/50 flex items-center justify-center text-secondary-400 dark:text-secondary-700 group-hover/upload:text-primary-500 group-hover/upload:scale-110 transition-all duration-300">
                                            <Camera className="w-8 h-8" />
                                        </div>
                                        <div className="flex flex-col gap-3 w-full min-w-[200px]">
                                            <Button type="button" variant="outline" className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border-secondary-200 dark:border-border hover:bg-primary-50 dark:hover:bg-primary-950/20" onClick={() => cameraInputRef.current?.open()}>
                                                <Camera className="w-3.5 h-3.5 mr-2" /> Live Capture
                                            </Button>
                                            <Button type="button" variant="secondary" className="h-11 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all" onClick={() => {
                                                const el = document.createElement('input'); el.type = 'file'; el.accept = 'image/*';
                                                el.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleImageCapture(f); }; el.click();
                                            }}>
                                                <Upload className="w-3.5 h-3.5 mr-2" /> Upload Media
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isImageLocked && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3 text-[10px] text-amber-700 dark:text-amber-400 font-black uppercase tracking-tight leading-relaxed">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> 
                                    <div>Identity locked due to existing audit trail or transaction history.</div>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-secondary-900 dark:text-secondary-400 uppercase tracking-[0.2em] pb-3 border-b border-secondary-100 dark:border-border/50">Status</h4>
                            <div className="flex items-center py-2 px-1">
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
                                        Enable Asset Record
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                </fieldset>
                <div className="hidden"><CameraPhotoInput ref={cameraInputRef} onCapture={handleImageCapture} previewUrl={null} hideDefaultTrigger={true} /></div>
                <div className="flex gap-4 pt-6 border-t border-secondary-100 dark:border-secondary-800 bg-white dark:bg-card/50 rounded-b-xl backdrop-blur-sm">
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
                            disabled={isLoading}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 disabled:scale-100"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Asset Entry
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
