"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Location, Company } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";

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
        } else {
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
            title={item ? "Update Location" : "Add Location"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="parent-company" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Parent Company <span className="text-red-500">*</span>
                        </Label>
                        <select
                            id="parent-company"
                            {...register("companyId")}
                            className="flex h-10 w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <option value="">Select Company</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.companyId && <p className="text-xs text-rose-500 mt-1">Required</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="location-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Location Name / Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="location-name"
                            {...register("name")}
                            className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            placeholder="e.g. Warehouse 01 or Shop Floor"
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-xl border border-secondary-200">
                        <Label htmlFor="active-status" className="text-sm font-bold text-secondary-700">Storage Capability</Label>
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
                        {isLoading ? "Saving..." : (item ? "Update Location" : "Create Location")}
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
