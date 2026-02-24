"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";
import { Save, X, Building2, MapPin, FileDigit, Phone, Mail } from "lucide-react";

const schema = z.object({
    name: z.string().min(1, "Company name is required"),
    address: z.string().min(1, "Address is required"),
    gstNo: z.string().min(1, "GST number is required"),
    pan: z.string().optional(),
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
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: "",
            address: "",
            gstNo: "",
            pan: "",
            state: "",
            city: "",
            pincode: "",
            phone: "",
            email: "",
            isActive: true,
        },
    });

    const isActive = watch("isActive");

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                address: item.address ?? "",
                gstNo: item.gstNo ?? "",
                pan: item.pan ?? "",
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
                pan: "",
                state: "",
                city: "",
                pincode: "",
                phone: "",
                email: "",
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Company Information" : "Register New Company"}
            size="2xl"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-w-0 flex flex-col">
                <div className="space-y-5 min-w-0 pb-2">
                        <div className="space-y-2 min-w-0">
                        <Label htmlFor="company-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Legal Company Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="company-name"
                                {...register("name")}
                                className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Aira Euro Automation Pvt Ltd"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2 min-w-0 pb-1">
                        <Label htmlFor="company-address" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Address <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                            <Textarea
                                id="company-address"
                                {...register("address")}
                                rows={3}
                                className="pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium resize-none min-h-[80px]"
                                placeholder="Plot no., Estate, Road, Area, City, Pincode"
                            />
                        </div>
                        {errors.address && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.address.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 pt-1">
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-gst" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                GST Number <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <FileDigit className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="company-gst"
                                    {...register("gstNo")}
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="e.g. 24AAFCA0525L1ZY"
                                />
                            </div>
                            {errors.gstNo && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.gstNo.message}</p>}
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-pan" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                PAN (optional)
                            </Label>
                            <Input
                                id="company-pan"
                                {...register("pan")}
                                className="h-11 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. AAFCA1234A"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-state" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                State
                            </Label>
                            <Input
                                id="company-state"
                                {...register("state")}
                                className="h-11 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Gujarat"
                            />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-city" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                City
                            </Label>
                            <Input
                                id="company-city"
                                {...register("city")}
                                className="h-11 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Ahmedabad"
                            />
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-pincode" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Pincode
                            </Label>
                            <Input
                                id="company-pincode"
                                {...register("pincode")}
                                className="h-11 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. 382405"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-phone" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Phone
                            </Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="company-phone"
                                    {...register("phone")}
                                    type="tel"
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="e.g. +91 98765 43210"
                                />
                            </div>
                        </div>
                        <div className="space-y-2 min-w-0">
                            <Label htmlFor="company-email" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="company-email"
                                    {...register("email")}
                                    type="email"
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="e.g. info@company.com"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>}
                        </div>
                    </div>

                    {!!item && (
                        <div className="flex items-center py-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isActive}
                                        onChange={(e) => setValue("isActive", e.target.checked)}
                                    />
                                    <div className={`w-10 h-5 rounded-full transition-colors ${isActive ? "bg-primary-600" : "bg-secondary-200"}`}></div>
                                    <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${isActive ? "translate-x-5" : "translate-x-0"} shadow-sm`}></div>
                                </div>
                                <span className="text-sm font-bold text-secondary-700 select-none">Mark as Active</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-100">
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
