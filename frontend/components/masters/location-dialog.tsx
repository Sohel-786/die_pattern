"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Location, Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { Save, X, ShieldCheck, Power, Building2, MapPin } from "lucide-react";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    companyId: z.coerce.number().min(1, "Company is required"),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface LocationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: Location | null;
    isLoading?: boolean;
}

export function LocationDialog({ isOpen, onClose, onSubmit, item, isLoading }: LocationDialogProps) {
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
            isActive: true,
        },
    });

    const isActive = watch("isActive");

    const { data: companies = [] } = useQuery<Company[]>({
        queryKey: ["companies", "active"],
        queryFn: async () => (await api.get("/companies")).data.data,
    });

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                companyId: item.companyId,
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                companyId: 0,
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Location Details" : "Register New Location"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="parent-company" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Parent Company / Division <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <select
                                id="parent-company"
                                {...register("companyId")}
                                className="flex h-11 w-full pl-10 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm font-medium focus-visible:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
                            >
                                <option value="">Select Parent Unit...</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="h-4 w-4 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                        {errors.companyId && <p className="text-xs text-rose-500 mt-1 font-medium">Please select a company</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Location Name / Code <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="location-name"
                                {...register("name")}
                                className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Warehouse 01 or Shop Floor"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-emerald-500/10 to-emerald-500/5' : 'from-secondary-200/50 to-secondary-200/30'} rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100`} />
                        <div className={`relative flex items-center justify-between p-5 ${isActive ? 'bg-emerald-50/30 border-emerald-100' : 'bg-secondary-50 border-secondary-200'} rounded-2xl border transition-all duration-300 shadow-sm`}>
                            <div className="flex items-center gap-4">
                                <div className={`h-11 w-11 rounded-1.5xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-secondary-200 text-secondary-500'}`}>
                                    {isActive ? <ShieldCheck className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-900' : 'text-secondary-900'} transition-colors`}>Storage Availability</h4>
                                    <p className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-600' : 'text-secondary-500'} transition-colors`}>
                                        Currently {isActive ? 'Active' : 'Disabled'}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="active-status"
                                checked={isActive}
                                onCheckedChange={(checked) => setValue("isActive", checked)}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-100 font-sans">
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
                                {item ? "Update Information" : "Save Location"}
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
                        Discard
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

