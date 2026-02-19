"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Trash2, Save, Package,
    Loader2, Calendar
} from "lucide-react";
import api from "@/lib/api";
import {
    Item,
    PurchaseIndent,
    PurchaseIndentType,
} from "@/types";
import {
    Dialog,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface PurchaseIndentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    indent?: PurchaseIndent;
}

export function PurchaseIndentDialog({ open, onOpenChange, indent }: PurchaseIndentDialogProps) {
    const isEditing = !!indent;
    const queryClient = useQueryClient();
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [remarks, setRemarks] = useState("");
    const [nextPiCode, setNextPiCode] = useState("");
    const [addingItemId, setAddingItemId] = useState<number | string>("");

    // Initialize state when editing
    useEffect(() => {
        if (indent && open) {
            setSelectedItemIds(indent.items.map(i => i.itemId));
            setRemarks(indent.remarks || "");
            setNextPiCode(indent.piNo);
        } else if (open) {
            setSelectedItemIds([]);
            setRemarks("");
            setAddingItemId("");
            // Fetch next code for new indent
            api.get("/purchase-indents/next-code").then(res => {
                setNextPiCode(res.data.data);
            }).catch(() => {
                setNextPiCode("PI-01");
            });
        }
    }, [indent, open]);

    const { data: items = [], isLoading: itemsLoading } = useQuery<Item[]>({
        queryKey: ["items"],
        queryFn: async () => {
            const res = await api.get("/items");
            return res.data.data;
        },
        enabled: open
    });

    const mutation = useMutation({
        mutationFn: (data: any) =>
            isEditing
                ? api.put(`/purchase-indents/${indent.id}`, data)
                : api.post("/purchase-indents", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            toast.success(`Indent ${isEditing ? 'updated' : 'created'} successfully`);
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Operation failed")
    });

    const selectedItems = items.filter(i => selectedItemIds.includes(i.id));

    const removeItem = (id: number) => {
        setSelectedItemIds(prev => prev.filter(x => x !== id));
    };

    const addItem = (id: number | string) => {
        if (!id) return;
        const numId = Number(id);
        if (!selectedItemIds.includes(numId)) {
            setSelectedItemIds(prev => [...prev, numId]);
        }
        setAddingItemId("");
    };

    const handleSubmit = () => {
        if (selectedItemIds.length === 0) {
            toast.error("Please select at least one item");
            return;
        }
        mutation.mutate({
            type: PurchaseIndentType.New, // Default
            remarks,
            itemIds: selectedItemIds
        });
    };

    const itemOptions = items
        .filter(i => !selectedItemIds.includes(i.id))
        .map(i => ({
            value: i.id,
            label: `${i.currentName} (${i.mainPartName})`
        }));

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? "Update Purchase Indent" : "Generate Purchase Indent"}
            size="2xl"
            contentScroll={true}
        >
            <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Indent Number
                        </Label>
                        <Input
                            value={nextPiCode}
                            readOnly
                            className="h-10 border-secondary-300 shadow-sm bg-secondary-50 text-sm font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Creation Date
                        </Label>
                        <div className="h-10 px-3 flex items-center bg-secondary-50 border border-secondary-300 rounded-md text-sm text-secondary-600 font-medium">
                            <Calendar className="w-4 h-4 mr-2 text-secondary-400" />
                            {indent ? format(new Date(indent.createdAt), 'dd MMMM yyyy') : format(new Date(), 'dd MMMM yyyy')}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Select Die / Pattern
                            </Label>
                            <SearchableSelect
                                options={itemOptions}
                                value={addingItemId}
                                onChange={(val) => addItem(val)}
                                placeholder="Search by name or main part to add items..."
                                disabled={itemsLoading}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode="popLayout">
                            {selectedItems.length > 0 ? selectedItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg border border-secondary-200 group hover:border-primary-200 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded bg-white border border-secondary-200 flex items-center justify-center text-primary-600 shadow-sm">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900 text-sm leading-tight">{item.currentName}</p>
                                            <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{item.mainPartName}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(item.id)}
                                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            )) : (
                                <div className="py-8 text-center border border-dashed border-secondary-200 rounded-lg bg-secondary-50/30">
                                    <p className="text-secondary-400 font-medium text-sm italic">No items added to this indent yet.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                        Remarks
                    </Label>
                    <Textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="min-h-[100px] border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                        placeholder="Reason for raising this indent..."
                    />
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-100">
                    <Button
                        onClick={handleSubmit}
                        disabled={mutation.isPending || selectedItemIds.length === 0}
                        className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    >
                        {mutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isEditing ? "Update Indent" : "Save Indent"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1 border-secondary-300"
                    >
                        Discard
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}

