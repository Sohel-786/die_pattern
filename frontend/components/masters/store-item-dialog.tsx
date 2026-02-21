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
    Save, Camera, Upload, Trash2,
    Package, Hash, MapPin,
    FileText, ShieldCheck, Power, AlertCircle
} from "lucide-react";
import { StoreItem } from "@/types";
import { CameraPhotoInput, CameraPhotoInputRef } from "@/components/ui/camera-photo-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
}

export function StoreItemDialog({
    isOpen,
    onClose,
    onSubmit,
    item,
    isLoading,
    existingItems
}: StoreItemDialogProps) {
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
            setImagePreview(item.image ? (item.image.startsWith("/") ? `${API_BASE}${item.image}` : `${API_BASE}/storage/${item.image}`) : null);
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
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-secondary-900 uppercase tracking-widest pb-2 border-b border-secondary-100">Asset Information</h4>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase">Asset Name *</Label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                        <Autocomplete value={watchedItemName || ""} onChange={val => setValue("itemName", val)} options={filteredItemNames} placeholder="e.g. Micrometer" className="h-11 pl-10 border-secondary-200" />
                                    </div>
                                    {errors.itemName && <p className="text-[10px] text-rose-500">{errors.itemName.message}</p>}
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase">Serial Number *</Label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                        <Input {...register("serialNumber")} className="h-11 pl-10 border-secondary-200" placeholder="SN-XXXXX" />
                                    </div>
                                    {errors.serialNumber && <p className="text-[10px] text-rose-500">{errors.serialNumber.message}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-secondary-900 uppercase tracking-widest pb-2 border-b border-secondary-100">Storage Details</h4>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase">Storage Zone</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                        <Autocomplete value={watchedInHouseLocation || ""} onChange={val => setValue("inHouseLocation", val)} options={filteredInHouseLocations} placeholder="e.g. Shelf A-04" className="h-11 pl-10 border-secondary-200" />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold text-secondary-500 uppercase">Remarks</Label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                                        <Textarea {...register("description")} className="min-h-[100px] pl-10 border-secondary-200 resize-none text-sm pt-2.5" placeholder="Additional details..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-secondary-900 uppercase tracking-widest pb-2 border-b border-secondary-100">Asset Identity Photo</h4>
                            <div className="aspect-square rounded-2xl border-2 border-dashed border-secondary-200 bg-secondary-50/50 flex flex-col items-center justify-center p-4">
                                {imagePreview ? (
                                    <div className="relative w-full h-full group">
                                        <img src={imagePreview} className="w-full h-full object-contain" />
                                        {!isImageLocked && <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleImageCapture(null)}><Trash2 className="w-4 h-4" /></Button>}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <Camera className="w-12 h-12 text-secondary-300" />
                                        <div className="flex flex-col gap-2 w-full">
                                            <Button type="button" variant="outline" className="h-10 rounded-xl font-bold text-xs" onClick={() => cameraInputRef.current?.open()}>Capture Photo</Button>
                                            <Button type="button" variant="secondary" className="h-10 rounded-xl font-bold text-xs" onClick={() => {
                                                const el = document.createElement('input'); el.type = 'file'; el.accept = 'image/*';
                                                el.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleImageCapture(f); }; el.click();
                                            }}>Upload Media</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isImageLocked && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5 text-[10px] text-amber-700 font-bold">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> Photo locked due to transaction history.
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-secondary-900 uppercase tracking-widest pb-2 border-b border-secondary-100">Status</h4>
                            <div className="flex items-center py-2">
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
                </div>
                <div className="hidden"><CameraPhotoInput ref={cameraInputRef} onCapture={handleImageCapture} previewUrl={null} hideDefaultTrigger={true} /></div>
                <div className="flex gap-4 pt-6 border-t">
                    <Button type="submit" disabled={isLoading} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-12">
                        {isLoading ? 'Processing...' : "Save"}
                    </Button>
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl">Cancel</Button>
                </div>
            </form>
        </Dialog>
    );
}
