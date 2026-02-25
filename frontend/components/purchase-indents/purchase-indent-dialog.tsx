"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Trash2, Save, Package,
    Loader2, Calendar, Plus
} from "lucide-react";
import api from "@/lib/api";
import {
    Item,
    Location,
    PurchaseIndent,
    PurchaseIndentType,
    ItemWithStatus
} from "@/types";
import {
    Dialog,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ItemSelectionDialog } from "./item-selection-dialog";
import { PiItemSelectionDialog } from "./pi-item-selection-dialog";
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
    const [type, setType] = useState<PurchaseIndentType>(PurchaseIndentType.New);
    const [nextPiCode, setNextPiCode] = useState("");
    const [itemSelectionOpen, setItemSelectionOpen] = useState(false);
    const [locationId, setLocationId] = useState<number | "">("");

    // Initialize state when editing
    useEffect(() => {
        if (indent && open) {
            setSelectedItemIds(indent.items.map(i => i.itemId));
            setRemarks(indent.remarks || "");
            setType(indent.type);
            setNextPiCode(indent.piNo);
            setLocationId(indent.locationId ?? "");
        } else if (open) {
            setSelectedItemIds([]);
            setRemarks("");
            setType(PurchaseIndentType.New);
            setLocationId("");
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

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations/active");
            return res.data.data;
        },
        enabled: open
    });

    const { data: itemsWithStatus = [], isLoading: itemsWithStatusLoading } = useQuery<ItemWithStatus[]>({
        queryKey: ["purchase-indents", "items-with-status", isEditing ? indent?.id : null],
        queryFn: async () => {
            const params = isEditing && indent?.id ? { excludePiId: indent.id } : {};
            const res = await api.get("/purchase-indents/items-with-status", { params });
            return res.data.data ?? [];
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

    /** When editing, item IDs that are in an active PO cannot be removed. */
    const itemIdsInPo = useMemo(
        () => new Set((indent?.items ?? []).filter((i) => i.isInPO).map((i) => i.itemId)),
        [indent?.items]
    );

    const removeItem = (id: number) => {
        if (itemIdsInPo.has(id)) {
            toast.error("This item is in an active PO and cannot be removed from the indent.");
            return;
        }
        setSelectedItemIds(prev => prev.filter(x => x !== id));
    };

    const addItemsFromSelection = (ids: number[]) => {
        if (ids.length === 0) return;
        setSelectedItemIds(prev => [...new Set([...prev, ...ids])]);
    };

    const handleSubmit = () => {
        if (selectedItemIds.length === 0) {
            toast.error("Please select at least one item");
            return;
        }
        mutation.mutate({
            locationId: locationId === "" ? undefined : locationId,
            type,
            remarks,
            itemIds: selectedItemIds
        });
    };

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Location (optional)
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-secondary-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value === "" ? "" : Number(e.target.value))}
                        >
                            <option value="">— Select Location —</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                            Indent Type
                        </Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-secondary-300 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/10 transition-all"
                            value={type}
                            onChange={(e) => setType(e.target.value as PurchaseIndentType)}
                        >
                            <option value={PurchaseIndentType.New}>New Procurement</option>
                            <option value={PurchaseIndentType.Repair}>Repair / Refurbishing</option>
                            <option value={PurchaseIndentType.Correction}>Engineering Correction</option>
                            <option value={PurchaseIndentType.Modification}>Design Modification</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1 block">
                                Select Die / Pattern
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setItemSelectionOpen(true)}
                                className="w-full justify-start h-10 px-3 bg-white border-secondary-300 hover:bg-secondary-50 hover:text-secondary-900 shadow-sm transition-all text-sm font-medium text-secondary-600"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Custom Item Selection
                            </Button>
                        </div>
                    </div>

                    <PiItemSelectionDialog
                        open={itemSelectionOpen}
                        onClose={() => setItemSelectionOpen(false)}
                        selectedItemIds={selectedItemIds}
                        onAddItems={addItemsFromSelection}
                        excludePiId={isEditing ? indent?.id : undefined}
                    />

                    <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 py-1 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {selectedItems.length > 0 ? selectedItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-secondary-200 group hover:border-primary-300 hover:shadow-sm transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-colors">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900 text-[13px] leading-tight">{item.currentName}</p>
                                            <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest mt-0.5">{item.mainPartName}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeItem(item.id)}
                                        disabled={itemIdsInPo.has(item.id)}
                                        title={itemIdsInPo.has(item.id) ? "Item is in an active PO and cannot be removed" : "Remove from indent"}
                                        className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            )) : (
                                <div className="py-12 text-center border-2 border-dashed border-secondary-100 rounded-2xl bg-secondary-50/20">
                                    <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50">
                                        <Package className="w-6 h-6 text-secondary-400" />
                                    </div>
                                    <p className="text-secondary-400 font-bold text-xs uppercase tracking-widest">No items selected yet</p>
                                    <p className="text-secondary-300 text-[10px] mt-1">Search and select items above to add them to this indent.</p>
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
                        {isEditing ? "Update Indent" : "Save"}
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

            {itemSelectionOpen && (
                <ItemSelectionDialog
                    isOpen={itemSelectionOpen}
                    onClose={() => setItemSelectionOpen(false)}
                    items={itemsWithStatus}
                    onSelectItem={(item) => addItem(item.itemId)}
                    isLoading={itemsWithStatusLoading}
                    selectedItemIds={selectedItemIds}
                />
            )}
        </Dialog>
    );
}

