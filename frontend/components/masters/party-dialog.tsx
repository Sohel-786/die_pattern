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

