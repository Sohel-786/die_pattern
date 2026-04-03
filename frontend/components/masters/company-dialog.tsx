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
import { Save, X, Building2, MapPin, FileDigit, UserCircle, Phone, ImagePlus, Trash2, ShieldAlert, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

// Indian GSTIN: 2-digit state code + 10-char PAN + entity no. + Z + check digit
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

const GST_SEGMENTS = [
    { label: "State", pos: [0, 2], color: "bg-blue-500" },
    { label: "PAN", pos: [2, 12], color: "bg-violet-500" },
    { label: "Entity", pos: [12, 13], color: "bg-amber-500" },
    { label: "Blank", pos: [13, 14], color: "bg-secondary-400" },
    { label: "Check", pos: [14, 15], color: "bg-green-500" },
];

function GstSegmentGuide({ value }: { value: string }) {
    const len = value.length;
    const activeSegment = GST_SEGMENTS.find(s => len >= s.pos[0] && len < s.pos[1]);

    return (
        <div className="mt-1.5 space-y-1.5">
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                {GST_SEGMENTS.map((seg) => {
                    const filled = Math.min(len, seg.pos[1]) - seg.pos[0];
                    const total = seg.pos[1] - seg.pos[0];
                    const pct = Math.max(0, Math.min(1, filled / total));
                    return (
                        <div key={seg.label} className="flex-1 bg-secondary-100 dark:bg-card/50 rounded-full overflow-hidden shadow-inner h-1.5">
                            <div
                                className={cn("h-full transition-all duration-300", seg.color)}
                                style={{ width: `${pct * 100}%` }}
                            />
                        </div>
                    );
                })}
            </div>
            <div className="flex gap-0.5">
                {GST_SEGMENTS.map((seg) => (
                    <div
                        key={seg.label}
                        className={cn(
                            "flex-1 text-center text-[8px] font-black uppercase tracking-widest transition-colors",
                            activeSegment?.label === seg.label
                                ? "text-primary-700 dark:text-primary-400"
                                : len >= seg.pos[1]
                                    ? "text-secondary-400 dark:text-secondary-600 line-through"
                                    : "text-secondary-300 dark:text-secondary-700"
                        )}
                    >
                        {seg.label}
                    </div>
                ))}
            </div>
        </div>
    );
}

const schema = z.object({
    name: z.string().min(1, "Company name is required"),
    address: z.string().min(1, "Address is required"),
    gstNo: z.string().length(15, "GST number must be exactly 15 characters").regex(GST_REGEX, "Invalid GST format — e.g. 24AABCU9603R1ZA"),
    gstDate: z.string().min(1, "GST registration date is required"),
    logoUrl: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    contactPerson: z.string().optional(),
    contactNumber: z.string().optional(),
    isActive: z.boolean().default(true),
    useAsParty: z.boolean().default(false),
    themeColor: z.string().default("#0d6efd"),
}).superRefine((data, ctx) => {
    if (data.useAsParty) {
        if (!data.contactPerson || data.contactPerson.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Contact Person is mandatory when 'Use as Party' is enabled.",
                path: ["contactPerson"],
            });
        }
        if (!data.contactNumber || data.contactNumber.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Contact Number is mandatory when 'Use as Party' is enabled.",
                path: ["contactNumber"],
            });
        } else if (!PHONE_REGEX.test(data.contactNumber)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid phone number. Must be a 10-digit Indian number starting with 6-9.",
                path: ["contactNumber"],
            });
        }
    }
});

type FormValues = z.infer<typeof schema>;

interface CompanyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: Company | null;
    isLoading?: boolean;
    readOnly?: boolean;
}

export function CompanyDialog({ isOpen, onClose, onSubmit, item, isLoading, readOnly }: CompanyDialogProps) {
    const isReadOnly = !!readOnly;
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
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
            contactPerson: "",
            contactNumber: "",
            isActive: true,
            useAsParty: false,
            themeColor: "#0d6efd",
        },
    });

    const isActive = watch("isActive");
    const useAsParty = watch("useAsParty");
    const logoUrl = watch("logoUrl");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [pendingLogoRemoval, setPendingLogoRemoval] = useState(false);
    const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
    const [localLogoPreviewUrl, setLocalLogoPreviewUrl] = useState<string | null>(null);


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
                contactPerson: item.contactPerson ?? "",
                contactNumber: item.contactNumber ?? "",
                isActive: item.isActive,
                useAsParty: item.useAsParty ?? false,
                themeColor: item.themeColor || "#0d6efd",
            });
            setPendingLogoRemoval(false);
            setPendingLogoFile(null);
            setLocalLogoPreviewUrl(null);
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
                contactPerson: "",
                contactNumber: "",
                isActive: true,
                useAsParty: false,
                themeColor: "#0d6efd",
            });
            setPendingLogoRemoval(false);
            setPendingLogoFile(null);
            setLocalLogoPreviewUrl(null);
        }
    }, [item, reset, isOpen]);

    useEffect(() => {
        return () => {
            if (localLogoPreviewUrl?.startsWith("blob:")) {
                try { URL.revokeObjectURL(localLogoPreviewUrl); } catch { /* noop */ }
            }
        };
    }, [localLogoPreviewUrl]);

    const uploadLogo = async (file: File): Promise<string | null> => {
        if (isReadOnly) return null;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file (jpg, png, gif, webp).");
            return null;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5 MB.");
            return null;
        }
        setLogoUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const currentName = watch("name")?.trim() || "unknown";
            const res = await api.post(`/companies/upload-logo?companyName=${encodeURIComponent(currentName)}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const data = res.data as Record<string, unknown>;
            const url = (data?.data as Record<string, unknown> | undefined)?.logoUrl as string | undefined;
            if (url) {
                return url;
            } else {
                toast.error(res.data?.message || "Upload failed.");
                return null;
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Logo upload failed.");
            return null;
        } finally {
            setLogoUploading(false);
        }
    };

    const stageLogo = (file: File) => {
        if (isReadOnly) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file (jpg, png, gif, webp).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5 MB.");
            return;
        }
        // If user selects a new logo, cancel pending removal.
        if (pendingLogoRemoval) setPendingLogoRemoval(false);

        setPendingLogoFile(file);
        const preview = URL.createObjectURL(file);
        if (localLogoPreviewUrl?.startsWith("blob:")) {
            try { URL.revokeObjectURL(localLogoPreviewUrl); } catch { /* noop */ }
        }
        setLocalLogoPreviewUrl(preview);
        setValue("logoUrl", preview, { shouldValidate: false });
    };

    const handleLogoDrop = (e: React.DragEvent) => {
        if (isReadOnly) return;
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) stageLogo(file);
    };

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isReadOnly) return;
        const file = e.target.files?.[0];
        if (file) stageLogo(file);
        e.target.value = "";
    };

    const dialogTitle = item ? "Update Company Information" : "Register New Company";

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={dialogTitle}
            size="2xl"
            contentScroll={false}
            confirmOnEscWhenDirty={!isReadOnly}
            isDirty={!isReadOnly && isDirty}
        >
            <form
                onSubmit={handleSubmit(async (data) => {
                    if (isReadOnly) return;
                    // If user chose to remove the logo, do not upload anything.
                    if (pendingLogoRemoval) {
                        setPendingLogoFile(null);
                        if (localLogoPreviewUrl?.startsWith("blob:")) {
                            try { URL.revokeObjectURL(localLogoPreviewUrl); } catch { /* noop */ }
                        }
                        setLocalLogoPreviewUrl(null);
                        onSubmit({ ...data, logoUrl: "" });
                        return;
                    }

                    // Upload staged logo only when saving/updating.
                    if (pendingLogoFile) {
                        const uploadedUrl = await uploadLogo(pendingLogoFile);
                        if (!uploadedUrl) return; // toast already shown
                        setPendingLogoFile(null);
                        if (localLogoPreviewUrl?.startsWith("blob:")) {
                            try { URL.revokeObjectURL(localLogoPreviewUrl); } catch { /* noop */ }
                        }
                        setLocalLogoPreviewUrl(null);
                        setValue("logoUrl", uploadedUrl, { shouldValidate: false });
                        toast.success("Logo uploaded.");
                        onSubmit({ ...data, logoUrl: uploadedUrl });
                        return;
                    }

                    onSubmit(data);
                })}
                className="flex flex-col h-full min-h-0"
            >
                <fieldset disabled={isReadOnly} className="flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 min-w-0 flex-shrink-0">
                        <div className="sm:col-span-8 space-y-2 min-w-0">
                            <Label htmlFor="company-name" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">
                                Name <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative group">
                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                <Input
                                    id="company-name"
                                    {...register("name")}
                                    className="h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight transition-all"
                                    placeholder="e.g. Aira Euro Automation Pvt Ltd"
                                />
                            </div>
                            {errors.name && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.name.message}</p>}
                        </div>
                        <div className="sm:col-span-4 space-y-2 min-w-0">
                            <Label className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">Logo</Label>
                            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleLogoSelect} />
                            <div
                                onDragOver={(e) => {
                                    if (isReadOnly) return;
                                    e.preventDefault();
                                    setDragActive(true);
                                }}
                                onDragLeave={() => {
                                    if (isReadOnly) return;
                                    setDragActive(false);
                                }}
                                onDrop={handleLogoDrop}
                                onClick={() => {
                                    if (isReadOnly) return;
                                    fileInputRef.current?.click();
                                }}
                                className={cn(
                                    "relative flex items-center justify-center rounded-xl border-2 border-dashed h-16 w-full cursor-pointer transition-all duration-300",
                                    dragActive 
                                        ? "border-primary-500 bg-primary-50/50 dark:bg-primary-900/20" 
                                        : "border-secondary-200 dark:border-border bg-secondary-50/30 dark:bg-secondary-900/20 hover:bg-secondary-100/50 dark:hover:bg-secondary-800/50",
                                    (logoUploading || isReadOnly) && "pointer-events-none opacity-60"
                                )}
                            >
                                {logoUrl && !pendingLogoRemoval ? (
                                    <>
                                        <img 
                                            src={logoUrl.startsWith("http") || logoUrl.startsWith("blob:") ? logoUrl : (logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`)} 
                                            alt="Logo" 
                                            className="max-h-12 max-w-[90%] w-auto object-contain" 
                                        />
                                        {!logoUploading && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute -top-2 -right-2 h-7 w-7 p-0 rounded-full bg-white dark:bg-secondary-800 shadow-md border border-secondary-200 dark:border-border text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all hover:scale-110 active:scale-95"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPendingLogoFile(null);
                                                    if (localLogoPreviewUrl?.startsWith("blob:")) {
                                                        try { URL.revokeObjectURL(localLogoPreviewUrl); } catch { /* noop */ }
                                                    }
                                                    setLocalLogoPreviewUrl(null);
                                                    setPendingLogoRemoval(true);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-secondary-400 dark:text-secondary-600 group-hover:text-primary-500 transition-colors">
                                        {logoUploading ? <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                                        <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{logoUploading ? "Uploading..." : "Staging Area"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 min-w-0 flex-shrink-0">
                        <Label htmlFor="company-address" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">Address <span className="text-rose-500">*</span></Label>
                        <div className="relative group">
                            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                            <Textarea
                                id="company-address"
                                {...register("address")}
                                rows={2}
                                className="pl-11 py-3 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight resize-none min-h-[70px] transition-all"
                                placeholder="Plot no., Estate, Road, Area, City, Pincode"
                            />
                        </div>
                        {errors.address && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.address.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 flex-shrink-0 pb-1">
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-gst" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">GST Number <span className="text-rose-500">*</span></Label>
                            <div className="relative group">
                                <FileDigit className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                                <Input
                                    id="company-gst"
                                    value={watch("gstNo") || ""}
                                    maxLength={15}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className={cn(
                                        "h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-mono font-black uppercase tracking-[0.2em] transition-all",
                                        watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "")
                                            ? "border-green-400/50 dark:border-green-500/30 text-green-700 dark:text-green-500 bg-green-50/30 dark:bg-green-500/5"
                                            : errors.gstNo
                                                ? "border-rose-400/50 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/5"
                                                : ""
                                    )}
                                    placeholder="e.g. 24AAFCA0525L1ZY"
                                    onKeyDown={(e) => {
                                        const allow = ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];
                                        if (allow.includes(e.key)) return;
                                        if (!/^[a-zA-Z0-9]$/.test(e.key)) { e.preventDefault(); return; }
                                        const current = watch("gstNo") || "";
                                        if (current.length >= 15) { e.preventDefault(); }
                                    }}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
                                        setValue("gstNo", raw, { shouldValidate: true });
                                    }}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "") ? (
                                        <ShieldCheck className="w-4 h-4 text-green-500 transition-all scale-110" />
                                    ) : watch("gstNo")?.length === 15 ? (
                                        <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                                    ) : (
                                        <span className="text-[10px] font-black text-secondary-400 tabular-nums">{watch("gstNo")?.length ?? 0}/15</span>
                                    )}
                                </div>
                            </div>
                            <GstSegmentGuide value={watch("gstNo") || ""} />
                            {errors.gstNo && (
                                <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 shrink-0" />
                                    {errors.gstNo.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-gst-date" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">GST Date <span className="text-rose-500">*</span></Label>
                            <Controller
                                control={control}
                                name="gstDate"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                                        className={cn(
                                            "h-11 shadow-sm text-sm font-bold tracking-tight transition-all",
                                            errors.gstDate 
                                                ? "border-rose-400 focus:ring-rose-400 dark:border-rose-500/30" 
                                                : "border-secondary-200 dark:border-border dark:bg-card focus:ring-primary-500/10"
                                        )}
                                    />
                                )}
                            />
                            {errors.gstDate && (
                                <p className="text-xs text-rose-500 mt-1 font-medium flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 shrink-0" />
                                    {errors.gstDate.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 min-w-0 flex-shrink-0">
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-state" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">State</Label>
                            <Input id="company-state" {...register("state")} className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight" placeholder="e.g. Gujarat" />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-city" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">City</Label>
                            <Input id="company-city" {...register("city")} className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight" placeholder="e.g. Ahmedabad" />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-pincode" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">Pincode</Label>
                            <Input id="company-pincode" {...register("pincode")} className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight" placeholder="e.g. 382405" />
                        </div>
                    </div>

                    <div className="space-y-2 min-w-0 flex-shrink-0">
                        <Label htmlFor="theme-color" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1">Company Branding Palette</Label>
                        <div className="flex gap-4">
                            <input
                                type="color"
                                id="theme-color-picker"
                                value={watch("themeColor") || "#0d6efd"}
                                onChange={(e) => setValue("themeColor", e.target.value)}
                                className="w-11 h-11 rounded-xl border border-secondary-200 dark:border-border cursor-pointer p-1.5 bg-white dark:bg-card shadow-sm shrink-0 transition-transform active:scale-90"
                            />
                            <Input
                                id="theme-color"
                                {...register("themeColor")}
                                className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-mono font-black uppercase tracking-widest"
                                placeholder="#0D6EFD"
                            />
                        </div>
                    </div>

                    {/* Conditional Party Info Section */}
                    {useAsParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 flex-shrink-0 bg-primary-50/30 dark:bg-primary-950/20 p-5 rounded-2xl border border-primary-100/30 dark:border-primary-800/30 shadow-inner group/party animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2 min-w-0">
                                <Label htmlFor="contact-person" className="text-[11px] font-black text-primary-700 dark:text-white uppercase tracking-widest leading-none block ml-1">Contact Person <span className="text-rose-500">*</span></Label>
                                <div className="relative group/input">
                                    <UserCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500 group-focus-within/input:text-primary-600 transition-colors" />
                                    <Input
                                        id="contact-person"
                                        {...register("contactPerson")}
                                        className={cn(
                                            "h-11 pl-11 bg-white dark:bg-card border-primary-200 dark:border-primary-800/50 shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight transition-all",
                                            errors.contactPerson && "border-rose-400 dark:border-rose-500/30"
                                        )}
                                        placeholder="Full Name"
                                    />
                                </div>
                                {errors.contactPerson && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.contactPerson.message}</p>}
                            </div>
                            <div className="space-y-2 min-w-0">
                                <Label htmlFor="contact-number" className="text-[11px] font-black text-primary-700 dark:text-white uppercase tracking-widest leading-none block ml-1">Contact Number <span className="text-rose-500">*</span></Label>
                                <div className="relative group/input">
                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500 group-focus-within/input:text-primary-600 transition-colors" />
                                    <Input
                                        id="contact-number"
                                        {...register("contactNumber")}
                                        maxLength={10}
                                        autoComplete="off"
                                        className={cn(
                                            "h-11 pl-11 bg-white dark:bg-card border-primary-200 dark:border-primary-800/50 shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight transition-all",
                                            errors.contactNumber && "border-rose-400 dark:border-rose-500/30"
                                        )}
                                        placeholder="10-digit Mobile"
                                        onKeyDown={(e) => {
                                            const allow = ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];
                                            if (allow.includes(e.key)) return;
                                            if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
                                            const current = watch("contactNumber") || "";
                                            if (current.length >= 10) { e.preventDefault(); }
                                        }}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                                            setValue("contactNumber", raw, { shouldValidate: true });
                                        }}
                                    />
                                </div>
                                {errors.contactNumber && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.contactNumber.message}</p>}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 pt-4 border-t border-secondary-100 dark:border-border">
                        {/* Feature Flag: Use as Party */}
                        <div className="flex items-center py-2 px-1">
                            <label className={cn(
                                "flex items-center gap-4 cursor-pointer group",
                                item?.useAsParty && "pointer-events-none opacity-60"
                            )}>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={useAsParty}
                                        disabled={item?.useAsParty}
                                        onChange={(e) => setValue("useAsParty", e.target.checked)}
                                    />
                                    <div className={cn(
                                        "w-11 h-6 rounded-full transition-all duration-300 shadow-inner",
                                        useAsParty ? "bg-primary-600 shadow-primary-900/20" : "bg-secondary-200 dark:bg-secondary-800"
                                    )}></div>
                                    <div className={cn(
                                        "absolute top-1 left-1 bg-white dark:bg-secondary-100 w-4 h-4 rounded-full transition-all duration-300 shadow-sm transform",
                                        useAsParty ? "translate-x-5 scale-105" : "translate-x-0"
                                    )}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-secondary-700 dark:text-white uppercase tracking-widest leading-none mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        Use As Party
                                    </span>
                                    <span className="text-[10px] text-secondary-400 dark:text-secondary-500 font-bold uppercase tracking-tight leading-none italic">Allows company to be referenced in job-work or purchase modules</span>
                                </div>
                            </label>
                        </div>

                        {/* Master Status - Edit mode only */}
                        {!!item && (
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
                                    <span className="text-xs font-black text-secondary-700 dark:text-white uppercase tracking-widest select-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                        Mark as Active Master Record
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                </fieldset>

                <div className="shrink-0 px-6 py-5 border-t border-secondary-100 dark:border-secondary-800 flex gap-4 bg-white dark:bg-card/50 rounded-b-xl backdrop-blur-sm">
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
                                    {item ? "Update" : "Save"}
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
