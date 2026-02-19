"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Contractor } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import { Save, X, ShieldCheck, Power, User, Phone } from "lucide-react";

const contractorSchema = z.object({
    name: z.string().min(1, "Contractor name is required"),
    phoneNumber: z.string()
        .min(1, "Phone number is required")
        .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number (10 digits starting with 6-9)"),
    isActive: z.boolean().default(true),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

interface ContractorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ContractorFormValues) => void;
    item?: Contractor | null;
    isLoading?: boolean;
}

export function ContractorDialog({ isOpen, onClose, onSubmit, item, isLoading }: ContractorDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<ContractorFormValues>({
        resolver: zodResolver(contractorSchema),
        defaultValues: {
            isActive: true,
        },
    });

    const isActive = watch("isActive");

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                phoneNumber: item.phoneNumber,
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                phoneNumber: "",
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Contractor Details" : "Register New Contractor"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="contractor-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Full Name / Enterprise Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="contractor-name"
                                {...register("name")}
                                className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Acme Constructions"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contractor-phone" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Primary Mobile Number <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="contractor-phone"
                                {...register("phoneNumber")}
                                className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="10-digit mobile number"
                                maxLength={10}
                            />
                        </div>
                        {errors.phoneNumber && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.phoneNumber.message}</p>}
                    </div>

                    <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-emerald-500/10 to-emerald-500/5' : 'from-secondary-200/50 to-secondary-200/30'} rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100`} />
                        <div className={`relative flex items-center justify-between p-5 ${isActive ? 'bg-emerald-50/30 border-emerald-100' : 'bg-secondary-50 border-secondary-200'} rounded-2xl border transition-all duration-300 shadow-sm`}>
                            <div className="flex items-center gap-4">
                                <div className={`h-11 w-11 rounded-1.5xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-secondary-200 text-secondary-500'}`}>
                                    {isActive ? <ShieldCheck className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-900' : 'text-secondary-900'} transition-colors`}>Engagement Status</h4>
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

                <div className="flex gap-3 pt-4 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-11"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                {item ? "Update Contractor" : "Save Contractor"}
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
