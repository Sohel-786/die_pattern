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
import { Save, X, ShieldCheck, Power, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
    name: z.string().min(1, "Status name is required"),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface StatusDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: any | null;
    isLoading?: boolean;
    readOnly?: boolean;
}

export function StatusDialog({ isOpen, onClose, onSubmit, item, isLoading, readOnly }: StatusDialogProps) {
    const isReadOnly = !!readOnly;
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
            title={item ? "Update Status Protocol" : "Register New Status Label"}
            size="md"
        >
            <form
                onSubmit={handleSubmit((data) => {
                    if (isReadOnly) return;
                    onSubmit(data);
                })}
                className="space-y-8"
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="status-name" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">
                            Status Label Master <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative group">
                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors" />
                            <Input
                                id="status-name"
                                {...register("name")}
                                className="h-12 pl-11 border-secondary-200 dark:border-border bg-white dark:bg-card focus:ring-primary-500/10 rounded-xl font-bold text-sm tracking-tight shadow-sm transition-all"
                                placeholder="e.g. Under Repair, Ready for Production"
                                disabled={isReadOnly}
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-bold">{errors.name.message}</p>}
                    </div>

                    {!!item && (
                        <div className="flex items-center py-2 px-1">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isActive}
                                        onChange={(e) => {
                                            if (isReadOnly) return;
                                            setValue("isActive", e.target.checked);
                                        }}
                                        disabled={isReadOnly}
                                    />
                                    <div className={cn(
                                        "w-11 h-6 rounded-full transition-all duration-300 shadow-inner",
                                        isActive ? "bg-primary-600 shadow-primary-900/20" : "bg-secondary-200 dark:bg-secondary-800"
                                    )}></div>
                                    <div className={cn(
                                        "absolute top-1 left-1 bg-white dark:bg-secondary-100 w-4 h-4 rounded-full transition-all duration-300 shadow-sm transform",
                                        isActive ? "translate-x-5 scale-105" : "translate-x-0"
                                    )}></div>
                                </div>
                                <span className="text-xs font-black text-secondary-700 dark:text-secondary-300 uppercase tracking-widest select-none group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    Mark as Active Status
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-secondary-100 dark:border-border">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className={cn(
                            "flex-1 border-secondary-300 dark:border-secondary-800 text-secondary-700 dark:text-secondary-400 font-black uppercase tracking-widest text-[10px] h-12 rounded-xl transition-all hover:bg-secondary-50 dark:hover:bg-secondary-900 active:scale-95",
                            isReadOnly && "w-full"
                        )}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    {!isReadOnly && (
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95 disabled:scale-100"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Save Record
                                </div>
                            )}
                        </Button>
                    )}
                </div>
            </form>
        </Dialog>
    );
}
