"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Party } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import { Save, X, ShieldCheck, Power, User, Phone, Mail, MapPin, ShieldAlert } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
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
            {/* Visual blocks */}
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
            {/* Labels */}
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
            {/* Segment format hint */}
            <p className="text-[10px] text-secondary-400 font-mono tracking-widest">
                <span className="text-blue-500 font-bold">XX</span>
                <span className="text-violet-500 font-bold">AAAAA0000A</span>
                <span className="text-amber-500 font-bold">1</span>
                <span className="text-secondary-400 font-bold">Z</span>
                <span className="text-green-500 font-bold">5</span>
                <span className="text-secondary-400 ml-2 not-italic text-[9px]">← GSTIN format (15 chars)</span>
            </p>
        </div>
    );
}

const partySchema = z.object({
    name: z.string().min(1, "Name is required"),
    contactPerson: z.string().min(1, "Contact Person is required"),
    phoneNumber: z.string()
        .min(1, "Contact No. is required")
        .length(10, "Phone number must be exactly 10 digits")
        .regex(PHONE_REGEX, "Invalid phone number. Must be a 10-digit Indian number starting with 6-9."),
    gstNo: z.string()
        .min(1, "GST No. is required")
        .length(15, "GST No. must be exactly 15 characters")
        .regex(GST_REGEX, "Invalid GST format — e.g. 24AABCU9603R1ZA"),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
    gstDate: z.string({ required_error: "GST Date is required" }).min(1, "GST Date is required"),
    isActive: z.boolean().default(true),
});

type PartyFormValues = z.infer<typeof partySchema>;

interface PartyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PartyFormValues) => void;
    party?: Party | null;
    isLoading?: boolean;
    existingParties?: Party[];
    readOnly?: boolean;
}

export function PartyDialog({ isOpen, onClose, onSubmit, party, isLoading, existingParties = [], readOnly }: PartyDialogProps) {
    const isReadOnly = !!readOnly;
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
        control,
    } = useForm<PartyFormValues>({
        resolver: zodResolver(partySchema),
        defaultValues: {
            isActive: true,
        },
    });

    const isActive = watch("isActive");
    const watchedName = watch("name");

    const partyNames = React.useMemo(() => {
        return Array.from(new Set(existingParties.map(p => p.name))).sort();
    }, [existingParties]);

    useEffect(() => {
        if (party && isOpen) {
            reset({
                name: party.name,
                phoneNumber: party.phoneNumber || "",
                contactPerson: party.contactPerson || "",
                email: party.email || "",
                gstNo: party.gstNo || "",
                gstDate: party.gstDate ? party.gstDate.split('T')[0] : "",
                address: party.address || "",
                isActive: party.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                phoneNumber: "",
                contactPerson: "",
                email: "",
                gstNo: "",
                gstDate: "",
                address: "",
                isActive: true,
            });
        }
    }, [party, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={party ? "Update Party Information" : "Register New Party"}
            size="xl"
        >
            <form
                onSubmit={handleSubmit((data) => {
                    if (isReadOnly) return;
                    onSubmit(data);
                })}
                className="space-y-5"
            >
                <div className="space-y-4">
                    {/* Party Name - full width */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                            Name <span className="text-rose-500">*</span>
                        </Label>
                        <Autocomplete
                            id="name"
                            value={watchedName || ""}
                            onChange={(val) => {
                                if (isReadOnly) return;
                                setValue("name", val, { shouldValidate: true });
                            }}
                            options={partyNames}
                            placeholder="e.g. J&J STEEL CAST"
                            className="h-11 border-secondary-200 dark:border-border font-bold tracking-tight"
                            disabled={isReadOnly}
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.name.message}</p>}
                    </div>

                    {/* Contact Person, Contact No., Email */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                                Contact Person <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="contactPerson"
                                {...register("contactPerson")}
                                className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight"
                                placeholder="e.g. Rahul Rajput"
                                disabled={isReadOnly}
                            />
                            {errors.contactPerson && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.contactPerson.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                                Contact Number <span className="text-rose-500">*</span>
                            </Label>
                            <Input
                                id="phoneNumber"
                                {...register("phoneNumber")}
                                maxLength={10}
                                autoComplete="off"
                                disabled={isReadOnly}
                                className={cn(
                                    "h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight",
                                    errors.phoneNumber && "border-rose-400 dark:border-rose-500/30"
                                )}
                                placeholder="e.g. 9979260161"
                                onKeyDown={(e) => {
                                    if (isReadOnly) {
                                        e.preventDefault();
                                        return;
                                    }
                                    const allow = ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];
                                    if (allow.includes(e.key)) return;
                                    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
                                    const current = watch("phoneNumber") || "";
                                    if (current.length >= 10) { e.preventDefault(); }
                                }}
                                onChange={(e) => {
                                    if (isReadOnly) return;
                                    const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                                    setValue("phoneNumber", raw, { shouldValidate: true });
                                }}
                            />
                            {errors.phoneNumber && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.phoneNumber.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">Email</Label>
                            <Input
                                id="email"
                                {...register("email")}
                                className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight"
                                placeholder="contact@domain.com"
                                disabled={isReadOnly}
                            />
                            {errors.email && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="gstNo" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                                GST Number <span className="text-rose-500">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="gstNo"
                                    value={watch("gstNo") || ""}
                                    maxLength={15}
                                    autoComplete="off"
                                    spellCheck={false}
                                    disabled={isReadOnly}
                                    className={cn(
                                        "h-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-mono font-black uppercase tracking-[0.2em] pr-10 transition-all",
                                        watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "")
                                            ? "border-green-400/50 dark:border-green-500/30 text-green-700 dark:text-green-500 bg-green-50/30 dark:bg-green-500/5"
                                            : errors.gstNo
                                                ? "border-rose-400/50 dark:border-rose-500/30 bg-rose-50/30 dark:bg-rose-500/5"
                                                : ""
                                    )}
                                    placeholder="24AABCU9603R1ZA"
                                    onKeyDown={(e) => {
                                        if (isReadOnly) {
                                            e.preventDefault();
                                            return;
                                        }
                                        // Allow: backspace, delete, tab, escape, arrows, home, end
                                        const allow = ["Backspace", "Delete", "Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"];
                                        if (allow.includes(e.key)) return;
                                        // Block non-alphanumeric
                                        if (!/^[a-zA-Z0-9]$/.test(e.key)) {
                                            e.preventDefault();
                                            return;
                                        }
                                        // Block if at max length
                                        const current = watch("gstNo") || "";
                                        if (current.length >= 15) {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(e) => {
                                        if (isReadOnly) return;
                                        // Auto-uppercase and strip non-alphanumeric, enforce max 15
                                        const raw = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15);
                                        setValue("gstNo", raw, { shouldValidate: true });
                                    }}
                                />
                                {/* Live validity icon */}
                                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {watch("gstNo")?.length === 15 && GST_REGEX.test(watch("gstNo") || "") ? (
                                        <span className="text-green-500 text-xs font-black transition-all scale-110">✓</span>
                                    ) : watch("gstNo")?.length === 15 ? (
                                        <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                                    ) : (
                                        <span className="text-[10px] font-black text-secondary-400 tabular-nums">{watch("gstNo")?.length ?? 0}/15</span>
                                    )}
                                </div>
                            </div>
                            <GstSegmentGuide value={watch("gstNo") || ""} />
                            {errors.gstNo && (
                                <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                    {errors.gstNo.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstDate" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                                GST Date <span className="text-rose-500">*</span>
                            </Label>
                            <Controller
                                control={control}
                                name="gstDate"
                                render={({ field }) => (
                                    <>
                                        <DatePicker
                                            value={field.value || ""}
                                            onChange={(date) => {
                                                if (isReadOnly) return;
                                                field.onChange(date ? date.toISOString().split('T')[0] : "");
                                            }}
                                            className={cn(
                                                "h-11 shadow-sm text-sm font-bold tracking-tight transition-all",
                                                errors.gstDate 
                                                    ? "border-rose-400 focus:ring-rose-400 dark:border-rose-500/30 font-bold" 
                                                    : "border-secondary-200 dark:border-border dark:bg-card focus:ring-primary-500/10"
                                            )}
                                            disabled={isReadOnly}
                                        />
                                        {errors.gstDate && (
                                            <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight flex items-center gap-1.5">
                                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                                {errors.gstDate.message}
                                            </p>
                                        )}
                                    </>
                                )}
                            />
                        </div>
                    </div>

                    {/* Row 5: Address - full width */}
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                            Address <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            id="address"
                            {...register("address")}
                            className="border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm min-h-[70px] font-bold tracking-tight resize-none transition-all py-3 px-4"
                            placeholder="Detailed office or warehouse address..."
                            disabled={isReadOnly}
                        />
                        {errors.address && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight">{errors.address.message}</p>}
                    </div>

                    {/* Active toggle - edit mode only */}
                    {!!party && (
                        <div className="flex items-center py-2 px-1">
                            <label className={cn(
                                "flex items-center gap-4 cursor-pointer group",
                                isReadOnly && "pointer-events-none opacity-60"
                            )}>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isActive}
                                        onChange={(e) => {
                                            if (isReadOnly) return;
                                            setValue("isActive", e.target.checked);
                                        }}
                                        disabled={isReadOnly}
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
                                    Active
                                </span>
                            </label>
                        </div>
                    )}
                </div>

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
                                    {party ? "Update" : "Save"}
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}

