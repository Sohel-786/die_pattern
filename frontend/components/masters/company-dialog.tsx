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
                        <div key={seg.label} className="flex-1 bg-secondary-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-150 ${seg.color}`}
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
                        className={`flex-1 text-center text-[9px] font-bold uppercase tracking-wider transition-colors ${activeSegment?.label === seg.label
                            ? "text-primary-700"
                            : len >= seg.pos[1]
                                ? "text-secondary-400 line-through"
                                : "text-secondary-300"
                            }`}
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
            contactPerson: "",
            contactNumber: "",
            isActive: true,
            useAsParty: false,
        },
    });

    const isActive = watch("isActive");
    const useAsParty = watch("useAsParty");
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
                contactPerson: item.contactPerson ?? "",
                contactNumber: item.contactNumber ?? "",
                isActive: item.isActive,
                useAsParty: item.useAsParty ?? false,
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
                contactPerson: "",
                contactNumber: "",
                isActive: true,
                useAsParty: false,
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
        <Dialog isOpen={isOpen} onClose={onClose} title={dialogTitle} size="2xl" contentScroll={false}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
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
                                    value={watch("gstNo") || ""}
                                    maxLength={15}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className={`h-10 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-mono font-bold uppercase tracking-widest ${watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "")
                                        ? "border-green-400 focus:ring-green-400 text-green-700"
                                        : errors.gstNo
                                            ? "border-rose-400 focus:ring-rose-400"
                                            : ""
                                        }`}
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
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "") ? (
                                        <ShieldCheck className="w-4 h-4 text-green-500" />
                                    ) : watch("gstNo")?.length === 15 ? (
                                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-secondary-400">{watch("gstNo")?.length ?? 0}/15</span>
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
                        <div className="space-y-1.5 min-w-0">
                            <Label htmlFor="company-gst-date" className="text-xs font-bold text-secondary-500 uppercase tracking-wider block">GST Date <span className="text-red-500">*</span></Label>
                            <Controller
                                control={control}
                                name="gstDate"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                                        className={`h-10 shadow-sm text-sm font-medium ${errors.gstDate ? "border-rose-400 focus:ring-rose-400" : "border-secondary-300 focus:ring-primary-500"}`}
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

                    <div className="grid grid-cols-3 gap-4 min-w-0 flex-shrink-0">
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

                    {/* Conditional Party Info Section */}
                    {useAsParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 flex-shrink-0 bg-primary-50/30 p-4 rounded-xl border border-primary-100/50">
                            <div className="space-y-1.5 min-w-0">
                                <Label htmlFor="contact-person" className="text-xs font-bold text-primary-700 uppercase tracking-wider block">Contact Person <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                    <Input
                                        id="contact-person"
                                        {...register("contactPerson")}
                                        className={`h-10 pl-10 bg-white border-primary-200 shadow-sm focus:ring-primary-500 text-sm font-medium ${errors.contactPerson ? "border-rose-400" : ""}`}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                {errors.contactPerson && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.contactPerson.message}</p>}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <Label htmlFor="contact-number" className="text-xs font-bold text-primary-700 uppercase tracking-wider block">Contact Number <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                    <Input
                                        id="contact-number"
                                        {...register("contactNumber")}
                                        maxLength={10}
                                        autoComplete="off"
                                        className={`h-10 pl-10 bg-white border-primary-200 shadow-sm focus:ring-primary-500 text-sm font-medium ${errors.contactNumber ? "border-rose-400" : ""}`}
                                        placeholder="e.g. 9876543210"
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
                                {errors.contactNumber && <p className="text-xs text-rose-500 mt-0.5 font-medium">{errors.contactNumber.message}</p>}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4 pt-4 border-t border-secondary-100">
                        {/* Feature Flag: Use as Party - Always visible as it's a creation option */}
                        <div className="flex items-center py-1">
                            <label className={`flex items-center gap-3 cursor-pointer group ${item?.useAsParty ? "pointer-events-none opacity-80" : ""}`}>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={useAsParty}
                                        disabled={item?.useAsParty}
                                        onChange={(e) => setValue("useAsParty", e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${useAsParty ? 'bg-primary-600' : 'bg-secondary-200'}`}></div>
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${useAsParty ? 'translate-x-5' : 'translate-x-0'} shadow-sm`}></div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-secondary-700 select-none">Use as Party</span>
                                    <span className="text-[10px] text-secondary-500 font-medium leading-none">Enable company to act as a party in transaction entries</span>
                                </div>
                            </label>
                        </div>

                        {/* Master Status - Edit mode only */}
                        {!!item && (
                            <div className="flex items-center py-1">
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
                        )}
                    </div>
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-secondary-100 flex gap-4 bg-white rounded-b-xl">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11 shadow-md transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
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
