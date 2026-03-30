"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Trash2, Save, Package, Loader2, Plus, Printer, Eye
} from "lucide-react";
import api from "@/lib/api";
import {
    PurchaseIndent,
    PurchaseIndentType,
    PurchaseIndentStatus,
    ItemWithStatus,
} from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { PiItemSelectionDialog } from "./pi-item-selection-dialog";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn, formatDate } from "@/lib/utils";

interface PurchaseIndentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    indent?: PurchaseIndent;
    /** Callback to open the print/preview view for this PI (e.g. set preview id so modal opens). */
    onOpenPreview?: (id: number) => void;
    /** When true, dialog becomes view-only (no Save/Update). */
    readOnly?: boolean;
    onSuccess?: () => void;
}

export function PurchaseIndentDialog({ open, onOpenChange, indent, onOpenPreview, readOnly, onSuccess }: PurchaseIndentDialogProps) {
    const isEditing = !!indent;
    const isReadOnly = !!readOnly;
    const queryClient = useQueryClient();
    const [initialItemIds, setInitialItemIds] = useState<number[]>([]);
    const [selectedItemsState, setSelectedItemsState] = useState<any[]>([]);
    const [remarks, setRemarks] = useState("");
    const [type, setType] = useState<PurchaseIndentType>(PurchaseIndentType.New);
    const [reqDateOfDelivery, setReqDateOfDelivery] = useState<string>("");
    const [mtcReq, setMtcReq] = useState<boolean>(false);
    const [nextPiCode, setNextPiCode] = useState("");
    const [itemSelectionOpen, setItemSelectionOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const submitLockRef = useRef(false);

    useEffect(() => {
        if (indent && open) {
            setSelectedItemsState(indent.items.map(i => ({
                id: i.itemId,
                currentName: i.currentName,
                mainPartName: i.mainPartName,
                itemTypeName: i.itemTypeName
            })));
            setInitialItemIds(indent.items.map(i => i.itemId));
            setRemarks(indent.remarks || "");
            setType(indent.type);
            setReqDateOfDelivery(indent.reqDateOfDelivery ? format(new Date(indent.reqDateOfDelivery), "yyyy-MM-dd") : "");
            setMtcReq(indent.mtcReq ?? false);
            setNextPiCode(indent.piNo);
        } else if (open) {
            setSelectedItemsState([]);
            setInitialItemIds([]);
            setRemarks("");
            setType(PurchaseIndentType.New);
            setReqDateOfDelivery("");
            setMtcReq(false);
            api.get("/purchase-indents/next-code").then(res => {
                setNextPiCode(res.data.data);
            }).catch(() => {
                setNextPiCode("PI-01");
            });
        }
    }, [indent, open]);

    // When main PI dialog closes, ensure the add-item dialog is also closed (avoids stale overlay)
    useEffect(() => {
        if (!open) setItemSelectionOpen(false);
    }, [open]);

    const mutation = useMutation({
        mutationFn: async (data: { type: PurchaseIndentType; remarks?: string; reqDateOfDelivery?: string; mtcReq: boolean; itemIds: number[] }) => {
            if (isEditing) {
                // If dialog is in read-only mode (approved PI), only allow removing unused items.
                if (isReadOnly && indent) {
                    const removedItemIds = initialItemIds.filter(id => !selectedItemsState.some(si => si.id === id));
                    return api.put(`/purchase-indents/${indent.id}/remove-unused-items`, { itemIds: removedItemIds });
                }
                return api.put(`/purchase-indents/${indent!.id}`, data);
            }
            return api.post("/purchase-indents", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            if (onSuccess) onSuccess();
            toast.success(`Indent ${isEditing ? "updated" : "created"} successfully`);
            onOpenChange(false);
        },
        onError: (err: { response?: { data?: { message?: string } } }) =>
            toast.error(err.response?.data?.message || "Operation failed")
        ,
        onSettled: () => {
            // Always release local lock after request finishes.
            setSubmitting(false);
            submitLockRef.current = false;
        }
    });

    const selectedItemIds = useMemo(() => selectedItemsState.map(i => i.id), [selectedItemsState]);
    const selectedItems = selectedItemsState;

    const itemIdsInPo = useMemo(
        () => new Set((indent?.items ?? []).filter((i) => i.isInPO).map((i) => i.itemId)),
        [indent?.items]
    );

    const removeItem = (id: number) => {
        if (itemIdsInPo.has(id)) {
            toast.error("This item is in an active PO and cannot be removed from the indent.");
            return;
        }
        setSelectedItemsState(prev => prev.filter(x => x.id !== id));
    };

    const addItemsFromSelection = (newItems: ItemWithStatus[]) => {
        if (newItems.length === 0) return;
        setSelectedItemsState(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const itemsToAdd = newItems
                .filter(ni => !existingIds.has(ni.itemId))
                .map(ni => ({
                    id: ni.itemId,
                    currentName: ni.currentName,
                    mainPartName: ni.mainPartName,
                    itemTypeName: ni.itemTypeName
                }));
            return [...prev, ...itemsToAdd];
        });
    };

    const handleSubmit = () => {
        // Prevent double-click while mutation is in-flight.
        if (submitLockRef.current) return;
        if (submitting || mutation.isPending) return;
        submitLockRef.current = true;
        if (selectedItemIds.length === 0) {
            submitLockRef.current = false;
            toast.error("Please select at least one item");
            return;
        }
        if (!reqDateOfDelivery && !isReadOnly) {
            submitLockRef.current = false;
            toast.error("Required Date of Delivery is mandatory");
            return;
        }

        if (!isReadOnly) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selected = new Date(reqDateOfDelivery);
            if (selected < today) {
                submitLockRef.current = false;
                toast.error("Required Date of Delivery cannot be in the past");
                return;
            }
        }

        setSubmitting(true);
        mutation.mutate({
            type,
            remarks: remarks || undefined,
            reqDateOfDelivery,
            mtcReq,
            itemIds: selectedItemIds
        });
    };

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={isEditing ? "Edit Purchase Indent" : "Purchase Indent"}
            size="full"
            contentScroll={false}
            className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
        >
            <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                    {/* Top row: PI No, Date, Type – same layout as PO */}
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-secondary-600">PI No.</Label>
                            <Input
                                value={nextPiCode}
                                readOnly
                                className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm font-semibold"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-secondary-600">PI Date</Label>
                            <div className="h-9 mt-0.5 px-3 flex items-center bg-secondary-50 border border-secondary-200 rounded-lg text-sm text-secondary-700">
                                {formatDate(indent?.createdAt ?? new Date())}
                            </div>
                        </div>
                        <div className="col-span-3">
                            <Label className="text-xs font-semibold text-secondary-600">Indent Type</Label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as PurchaseIndentType)}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-9 mt-0.5 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                                    isReadOnly && "bg-secondary-50 cursor-not-allowed"
                                )}
                            >
                                <option value={PurchaseIndentType.New}>New Procurement</option>
                                <option value={PurchaseIndentType.Repair}>Repair / Refurbishing</option>
                                <option value={PurchaseIndentType.Correction}>Engineering Correction</option>
                                <option value={PurchaseIndentType.Modification}>Design Modification</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-secondary-600">Req. Date of Delivery <span className="text-rose-500">*</span></Label>
                            <div className="mt-0.5">
                                <DatePicker
                                    value={reqDateOfDelivery || null}
                                    onChange={(date) => setReqDateOfDelivery(date ? format(date, "yyyy-MM-dd") : "")}
                                    placeholder="Select date"
                                    clearable
                                    disabled={isReadOnly}
                                    disabledDays={(date: Date) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        return date < today;
                                    }}
                                    className="h-9 text-sm border-secondary-200 bg-white"
                                />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-secondary-600">MTC Req.</Label>
                            <select
                                value={mtcReq ? "yes" : "no"}
                                onChange={(e) => setMtcReq(e.target.value === "yes")}
                                disabled={isReadOnly}
                                className={cn(
                                    "w-full h-9 mt-0.5 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500",
                                    isReadOnly && "bg-secondary-50 cursor-not-allowed"
                                )}
                            >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                            </select>
                        </div>
                    </div>

                    {/* Add items row – same pattern as PO "Add PI" */}
                    <div className="flex items-end gap-2">
                        <Label className="text-xs font-semibold text-secondary-600 shrink-0">Die / Pattern</Label>
                        <Button
                            type="button"
                            onClick={() => setItemSelectionOpen(true)}
                            disabled={isReadOnly}
                            className="h-9 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold gap-2 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            Add Die / Pattern
                        </Button>
                    </div>

                    {/* Add-item dialog: single dialog for "Add Die / Pattern"; renders as overlay when open */}
                    <PiItemSelectionDialog
                        open={itemSelectionOpen}
                        onClose={() => setItemSelectionOpen(false)}
                        selectedItemIds={selectedItemIds}
                        onAddItems={addItemsFromSelection}
                        excludePiId={isEditing ? indent?.id : undefined}
                    />

                    {/* Items table – scrollable like PO */}
                    <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                            <table className="w-full border-collapse text-sm min-w-[500px]">
                                <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                    <tr>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-12 text-center">#</th>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap">Name</th>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-24">Type</th>
                                        <th className="text-right py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider whitespace-nowrap w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {selectedItems.length === 0 ? (<tr key="no-items">
                                            <td colSpan={4} className="py-12 text-center text-secondary-500 text-sm">
                                                No items. Click &quot;Add Die / Pattern&quot; to add items.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedItems.map((item, idx) => {
                                            const inPo = itemIdsInPo.has(item.id);
                                            return (<tr
                                                    key={item.id}
                                                    className={cn("hover:bg-primary-50/30", inPo && "opacity-70 bg-secondary-50/50")}
                                                >
                                                    <td className="py-2.5 px-3 text-secondary-500 font-medium text-sm text-center">{idx + 1}</td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-secondary-900 truncate">{item.currentName}</span>
                                                            <span className="text-xs text-secondary-500 truncate">{item.mainPartName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-secondary-700 whitespace-nowrap">{item.itemTypeName ?? "—"}</td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeItem(item.id)}
                                                            disabled={inPo}
                                                            title={inPo ? "Item is in an active PO and cannot be removed" : "Remove"}
                                                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">
                            <Label className="text-xs font-semibold text-secondary-600">Remarks</Label>
                            <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder="Reason for raising this indent..."
                                className={cn("mt-0.5 min-h-[72px] text-sm border-secondary-200 rounded-lg resize-none", isReadOnly && "bg-secondary-50")}
                            />
                        </div>
                    </div>
                </div>

                <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        {isEditing && onOpenPreview && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenPreview(indent!.id)}
                                    className="h-9 px-4 font-semibold border-secondary-300 gap-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    View Preview
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenPreview(indent!.id)}
                                    disabled={indent?.status !== PurchaseIndentStatus.Approved}
                                    title={indent?.status !== PurchaseIndentStatus.Approved ? "Print is available only after approval" : "Print"}
                                    className="h-9 px-4 font-semibold border-secondary-300 gap-2 disabled:opacity-60"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-9 px-5 font-semibold"
                        >
                            Cancel
                        </Button>
                        {(!isReadOnly || (isReadOnly && initialItemIds.some(id => !selectedItemIds.includes(id)))) && (
                            <Button
                                onClick={handleSubmit}
                            disabled={mutation.isPending || submitting || selectedItemsState.length === 0}
                                className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2 disabled:opacity-50"
                                title={
                                    isEditing && indent?.isActive === false
                                        ? "Inactive indents cannot be updated"
                                        : (isEditing && indent?.status !== PurchaseIndentStatus.Pending
                                            ? "Approved or Rejected indents cannot be updated except for removing unused items."
                                            : "")
                                }
                            >
                            {mutation.isPending || submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEditing ? "Update" : "Save"}
                            </Button>
                        )}
                    </div>
                </footer>
            </div>
        </Dialog>
    );
}
