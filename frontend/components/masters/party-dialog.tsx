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
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={party ? "Edit Party Master" : "Add New Party"}
            size="lg"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Party Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="name"
                            {...register("name")}
                            className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            placeholder="e.g. Acme Tooling Solutions"
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                {...register("phoneNumber")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                                placeholder="+91 9876543210"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Email Address</Label>
                            <Input
                                id="email"
                                {...register("email")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                                placeholder="contact@acme.com"
                            />
                            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Full Address</Label>
                        <Textarea
                            id="address"
                            {...register("address")}
                            className="border-secondary-300 shadow-sm focus:ring-primary-500 text-sm min-h-[100px]"
                            placeholder="Enter office or workshop address..."
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-xl border border-secondary-200">
                        <div className="space-y-0.5">
                            <Label htmlFor="active-status" className="text-sm font-bold text-secondary-700">Active Status</Label>
                            <p className="text-xs text-secondary-500">Enable or disable this party in the system</p>
                        </div>
                        <Switch
                            id="active-status"
                            checked={isActive}
                            onCheckedChange={(checked) => setValue("isActive", checked)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {isLoading ? "Saving..." : party ? "Update Party" : "Create Party"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
