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
        <Dialog isOpen={isOpen} onClose={onClose} title={item ? `Edit ${title}` : `New ${title}`} hideHeader={true}>
            <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-primary-600 p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">
                            {item ? `Edit ${title}` : `New ${title}`}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Master Entry Name</Label>
                            <Input
                                {...register("name")}
                                className="rounded-2xl h-12 bg-secondary-50/50 border-gray-200 font-bold focus:bg-white transition-all"
                                placeholder={`e.g. Standard ${title}`}
                            />
                            {errors.name && <p className="text-xs text-rose-500 ml-1">{errors.name.message}</p>}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-secondary-50/50 rounded-2xl border border-gray-100">
                            <Label className="text-sm font-bold text-gray-700">Active Record</Label>
                            <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => setValue("isActive", checked)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold border-gray-100">Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="flex-1 h-12 rounded-2xl font-black bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary/20 transition-all active:scale-[0.98]">
                            {isLoading ? "Saving..." : "Save Record"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
