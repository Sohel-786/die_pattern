"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { Save, X, ShieldCheck, Power, User, Phone, Mail, MapPin } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";

const partySchema = z.object({
    name: z.string().min(1, "Name is required"),
    partyCategory: z.string().min(1, "Party Category is required"),
    customerType: z.string().min(1, "Customer Type is required"),
    contactPerson: z.string().min(1, "Contact Person is required"),
    phoneNumber: z.string().min(1, "Contact No. is required"),
    gstNo: z.string().min(1, "GST No is required"),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
    gstDate: z.string().optional().nullable(),
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
}

export function PartyDialog({ isOpen, onClose, onSubmit, party, isLoading, existingParties = [] }: PartyDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
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
                partyCategory: party.partyCategory || "SUPPLIER / VENDOR",
                customerType: party.customerType || "MANUFACTURER",
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
                partyCategory: "SUPPLIER / VENDOR",
                customerType: "MANUFACTURER",
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-4">
                    {/* Row 1: Party Category + Customer Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="partyCategory" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Party Category <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="partyCategory"
                                {...register("partyCategory")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-medium"
                            >
                                <option value="SUPPLIER / VENDOR">SUPPLIER / VENDOR</option>
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="BOTH">BOTH</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customerType" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Customer Type <span className="text-red-500">*</span>
                            </Label>
                            <select
                                id="customerType"
                                {...register("customerType")}
                                className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-medium"
                            >
                                <option value="MANUFACTURER">MANUFACTURER</option>
                                <option value="DEALER">DEALER</option>
                                <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Party Name - full width */}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Name <span className="text-red-500">*</span>
                        </Label>
                        <Autocomplete
                            id="name"
                            value={watchedName || ""}
                            onChange={(val) => setValue("name", val, { shouldValidate: true })}
                            options={partyNames}
                            placeholder="e.g. J&J STEEL CAST"
                            className="h-10"
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    {/* Row 3: Contact Person, Contact No., Email */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Contact Person <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="contactPerson"
                                {...register("contactPerson")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Rahul Rajput"
                            />
                            {errors.contactPerson && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.contactPerson.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Contact No. <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="phoneNumber"
                                {...register("phoneNumber")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. 9979260161"
                            />
                            {errors.phoneNumber && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phoneNumber.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Email ID</Label>
                            <Input
                                id="email"
                                {...register("email")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="contact@domain.com"
                            />
                            {errors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>}
                        </div>
                    </div>

                    {/* Row 4: GST No + GST Date - full width 2 col split (+ toggle in edit mode) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="gstNo" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                GST No <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="gstNo"
                                {...register("gstNo")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="24AASFJ2163R1Z0"
                            />
                            {errors.gstNo && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.gstNo.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstDate" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">GST Date</Label>
                            <Input
                                id="gstDate"
                                type="date"
                                {...register("gstDate")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Row 5: Address - full width */}
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Address <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="address"
                            {...register("address")}
                            className="border-secondary-300 shadow-sm focus:ring-primary-500 text-sm min-h-[60px] font-medium"
                            placeholder="Address details..."
                        />
                        {errors.address && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.address.message}</p>}
                    </div>

                    {/* Active toggle - edit mode only */}
                    {!!party && (
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

                <div className="flex gap-4 pt-4 border-t border-secondary-100">
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

