"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import { Save, X, ShieldCheck, Power, Layers } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "Category name must be at least 2 characters").max(100),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface ItemCategoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: any | null;
    isLoading?: boolean;
}

export function ItemCategoryDialog({ isOpen, onClose, onSubmit, item, isLoading }: ItemCategoryDialogProps) {
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

    useEffect(() => {
        if (item && isOpen) {
            reset({
                name: item.name,
                isActive: item.isActive,
            });
        } else if (isOpen) {
            reset({
                name: "",
                isActive: true,
            });
        }
    }, [item, reset, isOpen]);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={item ? "Update Classification" : "Register New Classification"}
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="category-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Category Label Master <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="category-name"
                                {...register("name")}
                                className="h-12 pl-11 border-secondary-200 focus:ring-primary-500/20 rounded-xl font-medium shadow-none"
                                placeholder="e.g. Precision Calipers, Micrometers"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-bold">{errors.name.message}</p>}
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

                <div className="flex gap-3 pt-6 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-12 shadow-lg shadow-primary-200"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                {item ? "Update Information" : "Save Classification"}
                            </div>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300 text-secondary-700 font-bold h-12 rounded-xl"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Discard
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
