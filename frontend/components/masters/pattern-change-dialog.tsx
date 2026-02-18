"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PatternDie } from "@/types";
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

interface PatternChangeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ChangeFormValues) => void;
    item: PatternDie | null;
    isLoading?: boolean;
}

export function PatternChangeDialog({ isOpen, onClose, onSubmit, item, isLoading }: PatternChangeDialogProps) {
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
        <Dialog isOpen={isOpen} onClose={onClose} title="Change Process" hideHeader={true}>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-white flex items-center gap-3">
                            <Settings2 className="w-8 h-8" />
                            Change Process
                        </DialogTitle>
                        <p className="text-white/90 text-sm font-medium mt-2">
                            Recording a modification or repair for <span className="underline decoration-white/40">{item.currentName}</span>
                        </p>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-8">
                    <div className="space-y-6">
                        <div className="flex gap-4 p-1.5 bg-secondary-100/50 rounded-2xl border border-gray-100">
                            <button
                                type="button"
                                onClick={() => setValue("changeType", "Modification")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${changeType === "Modification" ? 'bg-white text-amber-600 shadow-sm border border-amber-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Settings2 className="w-4 h-4" /> MODIFICATION
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue("changeType", "Repair")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all ${changeType === "Repair" ? 'bg-white text-amber-600 shadow-sm border border-amber-100' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <Hammer className="w-4 h-4" /> REPAIR
                            </button>
                        </div>

                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <Label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-tight">Updated Pattern Name</Label>
                                <Input
                                    {...register("newName")}
                                    className="rounded-2xl h-14 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all text-base font-bold"
                                    placeholder="Enter new name after process"
                                />
                                {errors.newName && <p className="text-xs text-rose-500 ml-1">{errors.newName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-tight">New Revision Number</Label>
                                <Input
                                    {...register("newRevision")}
                                    className="rounded-2xl h-14 bg-secondary-50/50 border-gray-200 focus:bg-white transition-all text-base font-bold"
                                    placeholder="e.g. 1, 2, 3"
                                />
                                {errors.newRevision && <p className="text-xs text-rose-500 ml-1">{errors.newRevision.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-extrabold text-gray-700 ml-1 uppercase tracking-tight">Process Remarks</Label>
                                <Textarea
                                    {...register("remarks")}
                                    className="rounded-2xl min-h-[120px] bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-medium leading-relaxed"
                                    placeholder="Describe the changes or repair work performed..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-14 rounded-2xl font-bold border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="flex-[1.5] h-14 rounded-2xl font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98]"
                        >
                            {isLoading ? "Processing..." : "Finish Change Process"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
