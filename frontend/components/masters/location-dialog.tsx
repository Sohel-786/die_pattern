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
        <Dialog isOpen={isOpen} onClose={onClose} title={item ? "Update Location" : "Add Location"} hideHeader={true}>
            <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-primary-600 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">
                            {item ? "Update Location" : "Add Location"}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Parent Company</Label>
                            <select
                                {...register("companyId")}
                                className={`w-full h-12 rounded-2xl bg-secondary-50/50 border-gray-200 text-sm font-bold px-4 focus:bg-white transition-all ${errors.companyId ? 'border-rose-500' : ''}`}
                            >
                                <option value="">Select Company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {errors.companyId && <p className="text-xs text-rose-500 ml-1">Required</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Location Name / Code</Label>
                            <Input
                                {...register("name")}
                                className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200 font-bold focus:bg-white transition-all"
                                placeholder="e.g. Warehouse 01 or Shop Floor"
                            />
                            {errors.name && <p className="text-xs text-rose-500 ml-1">{errors.name.message}</p>}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-2xl border border-gray-100">
                            <Label className="text-sm font-bold text-gray-700">Storage Capability</Label>
                            <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => setValue("isActive", checked)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold border-gray-100">Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="flex-1 h-12 rounded-2xl font-black bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
                            {isLoading ? "Saving..." : "Save Location"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
