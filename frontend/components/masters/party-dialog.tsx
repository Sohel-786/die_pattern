"use client";

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

const partySchema = z.object({
    name: z.string().min(1, "Name is required"),
    phoneNumber: z.string().optional().nullable(),
    email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
    address: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
});

type PartyFormValues = z.infer<typeof partySchema>;

interface PartyDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PartyFormValues) => void;
    party?: Party | null;
    isLoading?: boolean;
}

export function PartyDialog({ isOpen, onClose, onSubmit, party, isLoading }: PartyDialogProps) {
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

    useEffect(() => {
        if (party && isOpen) {
            reset({
                name: party.name,
                phoneNumber: party.phoneNumber,
                email: party.email,
                address: party.address,
                isActive: party.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                phoneNumber: "",
                email: "",
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
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Party / Business Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="name"
                                {...register("name")}
                                className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                placeholder="e.g. Acme Tooling Solutions"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Primary Contact Number</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="phoneNumber"
                                    {...register("phoneNumber")}
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Business Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                                <Input
                                    id="email"
                                    {...register("email")}
                                    className="h-11 pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm font-medium"
                                    placeholder="contact@acme.com"
                                />
                            </div>
                            {errors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Physical Address</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                            <Textarea
                                id="address"
                                {...register("address")}
                                className="pl-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm min-h-[100px] font-medium"
                                placeholder="Enter office or workshop address..."
                            />
                        </div>
                    </div>

                    <div className="relative group">
                        <div className={`absolute inset-0 bg-gradient-to-r ${isActive ? 'from-emerald-500/10 to-emerald-500/5' : 'from-secondary-200/50 to-secondary-200/30'} rounded-2xl blur-xl transition-all duration-500 opacity-0 group-hover:opacity-100`} />
                        <div className={`relative flex items-center justify-between p-5 ${isActive ? 'bg-emerald-50/30 border-emerald-100' : 'bg-secondary-50 border-secondary-200'} rounded-2xl border transition-all duration-300 shadow-sm`}>
                            <div className="flex items-center gap-4">
                                <div className={`h-11 w-11 rounded-1.5xl flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-secondary-200 text-secondary-500'}`}>
                                    {isActive ? <ShieldCheck className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-900' : 'text-secondary-900'} transition-colors`}>Operational Engagement</h4>
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
                                {party ? "Update Party Information" : "Save Party Entry"}
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
                        Discard Changes
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

