"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Item } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Hammer, Settings2 } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

const changeSchema = z.object({
    newName: z.string().min(1, "New name is required"),
    newRevision: z.string().min(1, "New revision is required"),
    changeType: z.string().min(1, "Change type is required"),
    remarks: z.string().optional().nullable(),
});

type ChangeFormValues = z.infer<typeof changeSchema>;

interface ItemChangeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ChangeFormValues) => void;
    item: Item | null;
    isLoading?: boolean;
}

export function ItemChangeDialog({ isOpen, onClose, onSubmit, item, isLoading }: ItemChangeDialogProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch,
    } = useForm<ChangeFormValues>({
        resolver: zodResolver(changeSchema),
    });

    const changeType = watch("changeType");

    useEffect(() => {
        if (item && isOpen) {
            reset({
                newName: item.currentName,
                newRevision: item.revisionNo || "0",
                changeType: "Modification",
                remarks: "",
            });
        }
    }, [item, reset, isOpen]);

    if (!item) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Change Process"
            size="md"
        >
            <div className="mb-6 px-1">
                <p className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none mb-1">
                    Process Tracking
                </p>
                <p className="text-[13px] font-bold text-secondary-600 dark:text-secondary-100 leading-relaxed">
                    Recording a modification or repair for <span className="text-amber-600 dark:text-amber-500 font-black italic">{item.currentName}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-secondary-50/50 dark:bg-secondary-900/50 rounded-xl border border-secondary-200 dark:border-border w-full shadow-inner">
                        <button
                            type="button"
                            onClick={() => setValue("changeType", "Modification")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300",
                                changeType === "Modification" 
                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                                    : "text-secondary-500 dark:text-secondary-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                            )}
                        >
                            <Settings2 className="w-4 h-4" /> MODIFICATION
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue("changeType", "Repair")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2.5 py-2.5 rounded-lg text-[10px] font-black tracking-widest transition-all duration-300",
                                changeType === "Repair" 
                                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                                    : "text-secondary-500 dark:text-secondary-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20"
                            )}
                        >
                            <Hammer className="w-4 h-4" /> REPAIR
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="newName" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">Updated Pattern Name</Label>
                            <Input
                                id="newName"
                                {...register("newName")}
                                className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card focus:ring-amber-500/10 rounded-xl font-bold text-sm tracking-tight shadow-sm transition-all"
                                placeholder="Enter new name after process"
                            />
                            {errors.newName && <p className="text-xs text-rose-500 mt-1.5 font-bold">{errors.newName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newRevision" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">New Revision Number</Label>
                            <Input
                                id="newRevision"
                                {...register("newRevision")}
                                className="h-11 border-secondary-200 dark:border-border bg-white dark:bg-card focus:ring-amber-500/10 rounded-xl font-bold text-sm tracking-tight shadow-sm transition-all"
                                placeholder="e.g. 1, 2, 3"
                            />
                            {errors.newRevision && <p className="text-xs text-rose-500 mt-1.5 font-bold">{errors.newRevision.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="remarks" className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-none block ml-1">Process Remarks</Label>
                            <Textarea
                                id="remarks"
                                {...register("remarks")}
                                className="border-secondary-200 dark:border-border bg-white dark:bg-card focus:ring-amber-500/10 rounded-xl font-bold text-sm min-h-[100px] shadow-sm transition-all"
                                placeholder="Describe the changes or repair work performed..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-secondary-100 dark:border-border">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[1.5] bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[11px] h-12 rounded-xl shadow-lg shadow-amber-500/20 dark:shadow-none transition-all active:scale-95 disabled:scale-100 italic"
                    >
                        {isLoading ? "Processing..." : "Finish Change Process"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-secondary-300 dark:border-secondary-800 text-secondary-700 dark:text-secondary-400 font-black uppercase tracking-widest text-[11px] h-12 rounded-xl transition-all hover:bg-secondary-50 dark:hover:bg-secondary-900 active:scale-95"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}
