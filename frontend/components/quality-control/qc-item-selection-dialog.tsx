"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { PendingQC, InwardSourceType } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QCItemSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    pendingItems: PendingQC[];
    selectedInwardLineIds: number[];
    onSelectItems: (items: PendingQC[]) => void;
}

export function QCItemSelectionDialog({
    isOpen,
    onClose,
    pendingItems,
    selectedInwardLineIds,
    onSelectItems,
}: QCItemSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) setTempSelectedIds(selectedInwardLineIds);
    }, [isOpen, selectedInwardLineIds]);

    const filteredItems = useMemo(() => {
        let result = pendingItems.filter(item => !selectedInwardLineIds.includes(item.inwardLineId));

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    (item.itemName || "").toLowerCase().includes(query) ||
                    (item.mainPartName || "").toLowerCase().includes(query) ||
                    (item.inwardNo || "").toLowerCase().includes(query) ||
                    (item.sourceRefDisplay || "").toLowerCase().includes(query)
            );
        }

        return result;
    }, [pendingItems, searchQuery, selectedInwardLineIds]);

    const toggleSelection = (item: PendingQC) => {
        setTempSelectedIds(prev =>
            prev.includes(item.inwardLineId)
                ? prev.filter(id => id !== item.inwardLineId)
                : [...prev, item.inwardLineId]
        );
    };

    const handleAdd = () => {
        const itemsToAdd = pendingItems.filter(item => tempSelectedIds.includes(item.inwardLineId));
        onSelectItems(itemsToAdd);
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Select Items for Quality Inspection"
            size="3xl"
            overlayClassName="z-[1200]"
        >
            <div className="flex flex-col max-h-[70vh] bg-white dark:bg-background">
                <div className="px-6 py-4 border-b border-secondary-200 dark:border-border bg-secondary-50 dark:bg-secondary-900/50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search by Item, Inward No, or Reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-secondary-200 dark:border-border bg-white dark:bg-card text-sm font-medium focus:ring-primary-500/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar bg-white dark:bg-background">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-secondary-500 dark:text-secondary-600">
                            <AlertCircle className="w-12 h-12 mb-3 text-secondary-300 dark:text-secondary-800" />
                            <p className="text-lg font-black uppercase tracking-tight">No Items Available</p>
                            <p className="text-sm font-bold opacity-60">No pending inward items match your criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white dark:bg-secondary-900 z-10">
                                <tr className="text-left text-[10px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest bg-secondary-50/50 dark:bg-secondary-900/80 border-b border-secondary-200 dark:border-border">
                                    <th className="px-4 py-3 w-12 text-center">Select</th>
                                    <th className="px-4 py-3 text-center">Inward</th>
                                    <th className="px-4 py-3">Source Ref</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Item Description</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Drawing / Rev</th>
                                    <th className="px-4 py-3">Material</th>
                                    <th className="px-4 py-3 text-right whitespace-nowrap">Inward Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                                {filteredItems.map((item) => {
                                    const isSelected = tempSelectedIds.includes(item.inwardLineId);

                                    return (<tr
                                            key={item.inwardLineId}
                                            onClick={() => toggleSelection(item)}
                                            className={cn(
                                                "transition-all duration-200 border-transparent hover:bg-primary-50/50 dark:hover:bg-primary-900/10 cursor-pointer group",
                                                isSelected && "bg-primary-50/80 dark:bg-primary-900/30"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400 fill-primary-50 dark:fill-primary-950 mx-auto" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-secondary-300 dark:text-secondary-700 mx-auto group-hover:text-primary-300 dark:group-hover:text-primary-700 transition-colors" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-[10px] font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded border border-primary-200 dark:border-primary-900 uppercase tabular-nums">
                                                    {item.inwardNo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col italic">
                                                    <span className="text-[11px] font-bold text-secondary-700 dark:text-secondary-200 uppercase">{item.sourceRefDisplay || "—"}</span>
                                                    <span className="text-[9px] text-secondary-400 dark:text-secondary-500 font-black uppercase tracking-widest leading-none">
                                                        {item.sourceType === InwardSourceType.PO ? "Purchase Order" :
                                                            item.sourceType === InwardSourceType.JobWork ? "Job Work" : "Outward Return"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold text-secondary-900 uppercase italic tracking-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{item.itemName}</span>
                                                    {item.newDisplayNameFromJobWork ? (
                                                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold">
                                                            Old → New: {item.newDisplayNameFromJobWork} <span className="text-primary-500/90 dark:text-primary-500/70 font-medium">(on QC approve)</span>
                                                        </span>
                                                    ) : null}
                                                    <span className="text-[10px] font-bold text-secondary-400 dark:text-secondary-500 uppercase tracking-widest leading-none">{item.mainPartName || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-bold text-secondary-600 dark:text-secondary-300 uppercase italic whitespace-nowrap">
                                                {item.itemTypeName || "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col italic">
                                                    <span className="text-[11px] font-bold text-secondary-700 dark:text-secondary-200">{item.drawingNo || "N/A"}</span>
                                                    <span className="text-[9px] text-secondary-400 dark:text-secondary-500 font-bold uppercase tracking-widest">REV: {item.revisionNo || "0"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-[11px] font-bold text-secondary-600 dark:text-secondary-400 uppercase italic">
                                                {item.materialName || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-secondary-500 dark:text-secondary-400 italic tabular-nums">
                                                    <Clock className="w-3 h-3 text-primary-500 dark:text-primary-400" />
                                                    {formatDateTime(item.inwardDate)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-secondary-200 dark:border-border bg-secondary-50 dark:bg-secondary-900/50 flex items-center justify-between">
                    <p className="text-[11px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest italic leading-none">
                        {tempSelectedIds.length} Items Selected for Certification
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="h-10 px-6 font-bold text-[10px] uppercase tracking-widest border-secondary-300 dark:border-border text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors italic rounded-lg"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={tempSelectedIds.length === 0}
                            className="h-10 px-8 bg-primary-600 hover:bg-primary-700 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary-200 dark:shadow-none italic transition-all hover:scale-[1.02] active:scale-95 rounded-lg"
                        >
                            Confirm Selection
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
