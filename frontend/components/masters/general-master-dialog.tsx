"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

interface GeneralMasterDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: FormValues) => void;
    item?: any | null;
    title: string;
    isLoading?: boolean;
}

export function GeneralMasterDialog({ isOpen, onClose, onSubmit, item, title, isLoading }: GeneralMasterDialogProps) {
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
        } else {
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
            title={item ? `Edit ${title}` : `New ${title}`}
            size="sm"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="master-name" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Master Entry Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="master-name"
                            {...register("name")}
                            className="h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            placeholder={`e.g. Standard ${title}`}
                        />
                        {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name.message}</p>}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-xl border border-secondary-200">
                        <Label htmlFor="active-status" className="text-sm font-bold text-secondary-700">Active Record</Label>
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
                        {isLoading ? "Saving..." : (item ? "Update Record" : "Create Record")}
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
