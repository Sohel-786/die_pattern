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
}

export function StatusDialog({ isOpen, onClose, onSubmit, item, isLoading }: StatusDialogProps) {
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="status-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Status Label Master <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                id="status-name"
                                {...register("name")}
                                className="h-12 pl-11 border-secondary-200 focus:ring-primary-500/20 rounded-xl font-medium shadow-none"
                                placeholder="e.g. Under Repair, Ready for Production"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-rose-500 mt-1 font-bold">{errors.name.message}</p>}
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

                <div className="flex gap-3 pt-6 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-12 shadow-lg shadow-primary-200"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
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
                        className="flex-1 border-secondary-300 text-secondary-700 font-bold h-12 rounded-xl"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
