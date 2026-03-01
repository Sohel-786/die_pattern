"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { Save, X, Building2, MapPin, FileDigit, Phone, Mail, ImagePlus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";

const schema = z.object({
    name: z.string().min(1, "Company name is required"),
    address: z.string().min(1, "Address is required"),
    gstNo: z.string().length(15, "GST number must be exactly 15 characters").regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format"),
    gstDate: z.string().min(1, "GST registration date is required"),
    logoUrl: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface CompanyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: Company | null;
    isLoading?: boolean;
}

export function CompanyDialog({ isOpen, onClose, onSubmit, item, isLoading }: CompanyDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
        control,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            address: "",
            gstNo: "",
            gstDate: "",
            logoUrl: "",
            state: "",
            city: "",
            pincode: "",
            phone: "",
            email: "",
            isActive: true,
        },
    });

    const isActive = watch("isActive");
    const logoUrl = watch("logoUrl");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const apiBase = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") : "";

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                address: item.address ?? "",
                gstNo: item.gstNo ?? "",
                gstDate: item.gstDate ? new Date(item.gstDate).toISOString().split('T')[0] : "",
                logoUrl: item.logoUrl ?? "",
                state: item.state ?? "",
                city: item.city ?? "",
                pincode: item.pincode ?? "",
                phone: item.phone ?? "",
                email: item.email ?? "",
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                address: "",
                gstNo: "",
                gstDate: "",
                logoUrl: "",
                state: "",
                city: "",
                pincode: "",
                phone: "",
                email: "",
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    const uploadLogo = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file (jpg, png, gif, webp).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5 MB.");
            return;
        }
        setLogoUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            // Pass company name so backend stores at company-logos/{companyName}/logo.ext
            const currentName = watch("name")?.trim() || "unknown";
            const res = await api.post(`/companies/upload-logo?companyName=${encodeURIComponent(currentName)}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const data = res.data as Record<string, unknown>;
            const url = (data?.data as Record<string, unknown> | undefined)?.logoUrl as string | undefined;
            if (url) {
                setValue("logoUrl", url);
                toast.success("Logo uploaded.");
            } else toast.error(res.data?.message || "Upload failed.");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Logo upload failed.");
        } finally {
            setLogoUploading(false);
        }
    };

    const handleLogoDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadLogo(file);
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadLogo(file);
        e.target.value = "";
    };

    const dialogTitle = item ? "Update Company Information" : "Register New Company";

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle} size="2xl">
            <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 flex flex-col max-h-[85vh] overflow-hidden space-y-6 px-1">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 min-w-0 flex-shrink-0">
                    <div className="sm:col-span-8 space-y-1.5 min-w-0">
                        <Label htmlFor="company-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">
                            Legal Company Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="company-name"
                                {...register("name")}
                                className="h-10 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Aira Euro Automation Pvt Ltd"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.name.message}</p>}
                    </div>
                    <div className="sm:col-span-4 space-y-1.5 min-w-0">
                        <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Logo</Label>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleLogoSelect} />
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleLogoDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`relative flex items-center justify-center rounded-lg border-2 border-dashed h-16 w-full cursor-pointer transition-colors ${dragActive ? "border-primary-500 bg-primary-50" : "border-secondary-200 bg-secondary-50/50 hover:bg-secondary-100/50"
                                } ${logoUploading ? "pointer-events-none opacity-70" : ""}`}
                        >
                            {logoUrl ? (
                                <>
                                    <img src={`${apiBase}${logoUrl}`} alt="Logo" className="max-h-12 max-w-[90%] w-auto object-contain" />
                                    {!logoUploading && (
                                        <Button type="button" variant="ghost" size="sm" className="absolute top-0.5 right-0.5 h-6 w-6 p-0 rounded-full bg-white/95 shadow border border-secondary-200 text-rose-500 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); setValue("logoUrl", ""); }}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-0.5 text-secondary-500">
                                    {logoUploading ? <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-6 h-6 text-secondary-400" />}
                                    <span className="text-[10px] font-medium leading-tight">{logoUploading ? "Uploading..." : "Click or drop"}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5 min-w-0 flex-shrink-0">
                    <Label htmlFor="company-address" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Address <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                        <Textarea
                            id="company-address"
                            {...register("address")}
                            rows={2}
                            className="pl-10 py-2 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium resize-none min-h-[52px]"
                            placeholder="Plot no., Estate, Road, Area, City, Pincode"
                        />
                    </div>
                    {errors.address && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.address.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 flex-shrink-0 pb-1">
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-gst" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">GST Number <span className="text-red-500">*</span></Label>
                        <div className="relative">
                            <FileDigit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="company-gst"
                                {...register("gstNo")}
                                maxLength={15}
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                                    setValue("gstNo", value);
                                }}
                                className="h-10 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. 24AAFCA0525L1ZY"
                            />
                        </div>
                        {errors.gstNo && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.gstNo.message}</p>}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-gst-date" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">GST Date <span className="text-red-500">*</span></Label>
                        <Controller
                            control={control}
                            name="gstDate"
                            render={({ field }) => (
                                <DatePicker
                                    value={field.value}
                                    onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                                    className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                />
                            )}
                        />
                        {errors.gstDate && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.gstDate.message}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 min-w-0 flex-shrink-0 pt-2">
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-state" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">State</Label>
                        <Input id="company-state" {...register("state")} className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="e.g. Gujarat" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-city" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">City</Label>
                        <Input id="company-city" {...register("city")} className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="e.g. Ahmedabad" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-pincode" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Pincode</Label>
                        <Input id="company-pincode" {...register("pincode")} className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="e.g. 382405" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 flex-shrink-0">
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-phone" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Phone</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input id="company-phone" {...register("phone")} type="tel" className="h-10 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="e.g. +91 98765 43210" />
                        </div>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                        <Label htmlFor="company-email" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input id="company-email" {...register("email")} type="email" className="h-10 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium" placeholder="e.g. info@company.com" />
                        </div>
                        {errors.email && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.email.message}</p>}
                    </div>
                </div>

                {!!item && (
                    <div className="flex items-center flex-shrink-0 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="sr-only" checked={isActive} onChange={(e) => setValue("isActive", e.target.checked)} />
                            <div className="relative">
                                <div className={`w-9 h-4 rounded-full transition-colors ${isActive ? "bg-primary-600" : "bg-secondary-200"}`}></div>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`}></div>
                            </div>
                            <span className="text-xs font-bold text-secondary-700 select-none">Active</span>
                        </label>
                    </div>
                )}

                <div className="flex gap-3 pt-4 mt-2 border-t border-secondary-100 flex-shrink-0">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
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
                        className="flex-1 border-secondary-300 text-secondary-700 font-bold h-11"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
