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
import { cn } from "@/lib/utils";

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
    readOnly?: boolean;
}

export function LocationDialog({ isOpen, onClose, onSubmit, item, isLoading, readOnly }: LocationDialogProps) {
    const isReadOnly = !!readOnly;
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
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
            confirmOnEscWhenDirty={!isReadOnly}
            isDirty={!isReadOnly && isDirty}
        >
            <form
                onSubmit={handleSubmit((data) => {
                    if (isReadOnly) return;
                    onSubmit(data);
                })}
                className="space-y-5"
            >
                {/* Parent Company */}
                <div className="space-y-2">
                    <Label className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                        Company <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative group">
                        <SearchableSelect
                            options={companies.map(c => ({ value: c.id, label: c.name }))}
                            value={companyId || ""}
                            onChange={(val) => {
                                if (isReadOnly) return;
                                if (!item) setValue("companyId", Number(val), { shouldValidate: true });
                            }}
                            placeholder="Select Parent Company..."
                            id="parent-company"
                            disabled={isReadOnly || !!item}
                            className="h-11 border-secondary-200 dark:border-border font-bold tracking-tight transition-all"
                        />
                        {!!item && (
                            <p className="text-[10px] text-secondary-400 dark:text-secondary-500 mt-2 font-bold uppercase tracking-tight flex items-center gap-1.5 ml-1">
                                <span className="text-amber-500">🔒</span> Company identity is locked after registration.
                            </p>
                        )}
                    </div>
                    {errors.companyId && !item && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight ml-1">{errors.companyId.message}</p>}
                </div>

                {/* Location Name */}
                <div className="space-y-2">
                    <Label htmlFor="location-name" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                        Location Name <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative group">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 dark:text-secondary-500 group-focus-within:text-primary-500 transition-colors" />
                        <Input
                            id="location-name"
                            {...register("name")}
                            className="h-11 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight transition-all"
                            placeholder="e.g. Warehouse 01 or Shop Floor"
                            disabled={isReadOnly}
                        />
                    </div>
                    {errors.name && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight ml-1">{errors.name.message}</p>}
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <Label htmlFor="location-address" className="text-[11px] font-black text-secondary-500 dark:text-white uppercase tracking-widest leading-none block ml-1 mb-1">
                        Address <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                        id="location-address"
                        {...register("address")}
                        className="min-h-[100px] border-secondary-200 dark:border-border bg-white dark:bg-card shadow-sm focus:ring-primary-500/10 text-sm font-bold tracking-tight resize-none transition-all py-3 px-4"
                        placeholder="Full physical address or plot details of this location..."
                        disabled={isReadOnly}
                    />
                    {errors.address && <p className="text-xs text-rose-500 mt-1.5 font-bold uppercase text-[10px] tracking-tight ml-1">{errors.address.message}</p>}
                </div>

                {/* Active Toggle (edit only) */}
                {!!item && (
                    <div className="flex items-center gap-4 py-2 px-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (isReadOnly) return;
                                setValue("isActive", !isActive);
                            }}
                            disabled={isReadOnly}
                            className={cn(
                                "relative w-11 h-6 rounded-full transition-all duration-300 shadow-inner",
                                isActive ? "bg-primary-600 shadow-primary-900/20" : "bg-secondary-200 dark:bg-secondary-800"
                            )}
                        >
                            <span className={cn(
                                "absolute top-1 left-1 bg-white dark:bg-secondary-100 w-4 h-4 rounded-full transition-all duration-300 shadow-sm transform",
                                isActive ? "translate-x-5 scale-105" : "translate-x-0"
                            )} />
                        </button>
                        <span className="text-xs font-black text-secondary-700 dark:text-white uppercase tracking-widest select-none">
                            Active
                        </span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-6 border-t border-secondary-100 dark:border-secondary-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300 dark:border-secondary-800 text-secondary-700 dark:text-secondary-400 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl transition-all hover:bg-secondary-50 dark:hover:bg-secondary-900 active:scale-95"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    {!isReadOnly && (
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[10px] h-12 rounded-xl shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 disabled:scale-100"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {item ? "Update" : "Save"}
                                </span>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
