"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Party } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

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
        if (party) {
            reset({
                name: party.name,
                phoneNumber: party.phoneNumber,
                email: party.email,
                address: party.address,
                isActive: party.isActive,
            });
        } else {
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
        <Dialog isOpen={isOpen} onClose={onClose} title={party ? "Edit Party Master" : "Add New Party"} hideHeader={true}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-white">
                            {party ? "Edit Party Master" : "Add New Party"}
                        </DialogTitle>
                        <p className="text-white/80 text-sm mt-1">
                            Enter the vendor or customer details below
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-sm font-bold text-gray-700 ml-1">Party Name <span className="text-rose-500">*</span></Label>
                            <Input
                                id="name"
                                {...register("name")}
                                className={`rounded-2xl h-12 border-gray-200 focus:ring-primary-500 focus:border-primary-500 transition-all ${errors.name ? 'border-rose-500 bg-rose-50/50' : 'bg-secondary-50/50'}`}
                                placeholder="e.g. Acme Tooling Solutions"
                            />
                            {errors.name && <p className="text-xs font-medium text-rose-500 ml-1">{errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phoneNumber" className="text-sm font-bold text-gray-700 ml-1">Phone Number</Label>
                                <Input
                                    id="phoneNumber"
                                    {...register("phoneNumber")}
                                    className="rounded-2xl h-12 border-gray-200 bg-secondary-50/50"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-bold text-gray-700 ml-1">Email Address</Label>
                                <Input
                                    id="email"
                                    {...register("email")}
                                    className={`rounded-2xl h-12 border-gray-200 bg-secondary-50/50 ${errors.email ? 'border-rose-500' : ''}`}
                                    placeholder="contact@acme.com"
                                />
                                {errors.email && <p className="text-xs font-medium text-rose-500 ml-1">{errors.email.message}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-sm font-bold text-gray-700 ml-1">Full Address</Label>
                            <Textarea
                                id="address"
                                {...register("address")}
                                className="rounded-2xl min-h-[100px] border-gray-200 bg-secondary-50/50 focus:ring-primary-500"
                                placeholder="Enter office or workshop address..."
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-2xl border border-gray-100">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold text-gray-700">Active Status</Label>
                                <p className="text-xs text-gray-500">Enable or disable this party in the system</p>
                            </div>
                            <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => setValue("isActive", checked)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-2xl font-bold border-gray-200 hover:bg-gray-50 text-gray-600 transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-12 rounded-2xl font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Saving..." : party ? "Update Party" : "Create Party"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
