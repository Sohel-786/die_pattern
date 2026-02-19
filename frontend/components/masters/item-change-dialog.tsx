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
            <div className="mb-6">
                <p className="text-secondary-500 text-sm font-medium">
                    Recording a modification or repair for <span className="text-amber-600 font-bold">{item.currentName}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-6">
                    <div className="flex gap-2 p-1 bg-secondary-50/50 rounded-lg border border-secondary-200 w-full">
                        <button
                            type="button"
                            onClick={() => setValue("changeType", "Modification")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${changeType === "Modification" ? 'bg-amber-500 text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                        >
                            <Settings2 className="w-4 h-4" /> MODIFICATION
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue("changeType", "Repair")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${changeType === "Repair" ? 'bg-amber-500 text-white shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                        >
                            <Hammer className="w-4 h-4" /> REPAIR
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newName" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Updated Pattern Name</Label>
                            <Input
                                id="newName"
                                {...register("newName")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-amber-500 text-sm"
                                placeholder="Enter new name after process"
                            />
                            {errors.newName && <p className="text-xs text-rose-500 mt-1">{errors.newName.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="newRevision" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">New Revision Number</Label>
                            <Input
                                id="newRevision"
                                {...register("newRevision")}
                                className="h-10 border-secondary-300 shadow-sm focus:ring-amber-500 text-sm"
                                placeholder="e.g. 1, 2, 3"
                            />
                            {errors.newRevision && <p className="text-xs text-rose-500 mt-1">{errors.newRevision.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="remarks" className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">Process Remarks</Label>
                            <Textarea
                                id="remarks"
                                {...register("remarks")}
                                className="border-secondary-300 shadow-sm focus:ring-amber-500 text-sm min-h-[100px]"
                                placeholder="Describe the changes or repair work performed..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-100">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="flex-[1.5] bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {isLoading ? "Processing..." : "Finish Change Process"}
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
