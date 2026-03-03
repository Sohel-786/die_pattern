"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Location, Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect } from "react";
import { Save, X, MapPin, Building2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

const schema = z.object({
    name: z.string().min(1, "Location name is required"),
    address: z.string().min(1, "Address is required"),
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
        defaultValues: { isActive: true },
    });

    const isActive = watch("isActive");
    const companyId = watch("companyId");

    const { data: companies = [] } = useQuery<Company[]>({
        queryKey: ["companies", "active"],
        queryFn: async () => (await api.get("/companies/active")).data.data,
    });

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                address: item.address ?? "",
                companyId: item.companyId,
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({ name: "", address: "", companyId: 0, isActive: true });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Location Details" : "Register New Location"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Parent Company */}
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-secondary-600">
                        Parent Company <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                        <SearchableSelect
                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                            value={companyId || ""}
                            onChange={(val) => {
                                if (!item) setValue("companyId", Number(val), { shouldValidate: true });
                            }}
                            placeholder="Select Parent Company..."
                            id="parent-company"
                            disabled={!!item}
                        />
                        {!!item && (
                            <p className="text-[11px] text-secondary-400 mt-1 italic flex items-center gap-1">
                                <span>🔒</span> Company cannot be changed after creation.
                            </p>
                        )}
                    </div>
                    {errors.companyId && !item && <p className="text-xs text-rose-500">{errors.companyId.message}</p>}
                </div>

                {/* Location Name */}
                <div className="space-y-1.5">
                    <Label htmlFor="location-name" className="text-xs font-semibold text-secondary-600">
                        Location Name / Code <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            id="location-name"
                            {...register("name")}
                            className="h-9 pl-9 border-secondary-200 text-sm"
                            placeholder="e.g. Warehouse 01 or Shop Floor"
                        />
                    </div>
                    {errors.name && <p className="text-xs text-rose-500">{errors.name.message}</p>}
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                    <Label htmlFor="location-address" className="text-xs font-semibold text-secondary-600">
                        Address <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                        id="location-address"
                        {...register("address")}
                        className="min-h-[80px] text-sm border-secondary-200 rounded-lg resize-none"
                        placeholder="Full address of this location..."
                    />
                    {errors.address && <p className="text-xs text-rose-500">{errors.address.message}</p>}
                </div>

                {/* Active Toggle (edit only) */}
                {!!item && (
                    <div className="flex items-center gap-3 py-1">
                        <button
                            type="button"
                            onClick={() => setValue("isActive", !isActive)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? "bg-primary-600" : "bg-secondary-200"}`}
                        >
                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                        <span className="text-sm font-medium text-secondary-700 select-none">
                            {isActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold h-9"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                {item ? "Update" : "Save"}
                            </span>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-200 text-secondary-700 font-semibold h-9"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
