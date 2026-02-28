"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, CheckCircle2, Circle, Clock } from "lucide-react";
import { PendingQC, InwardSourceType } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
            <div className="flex flex-col max-h-[70vh]">
                <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search by Item, Inward No, or Reference..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-secondary-200 focus:ring-primary-500/20"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-secondary-500">
                            <AlertCircle className="w-12 h-12 mb-3 text-secondary-300" />
                            <p className="text-lg font-bold uppercase tracking-tight">No Items Available</p>
                            <p className="text-sm font-medium">No pending inward items match your criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white border-b border-secondary-200 z-10">
                                <tr className="text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                                    <th className="px-4 py-3 w-12">Select</th>
                                    <th className="px-4 py-3 text-center">Inward Details</th>
                                    <th className="px-4 py-3">Source Ref</th>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3">Main Part Name</th>
                                    <th className="px-4 py-3 text-right">Inward Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredItems.map((item) => {
                                    const isSelected = tempSelectedIds.includes(item.inwardLineId);

                                    return (
                                        <tr
                                            key={item.inwardLineId}
                                            onClick={() => toggleSelection(item)}
                                            className={cn(
                                                "transition-all duration-200 border-transparent hover:bg-primary-50 cursor-pointer",
                                                isSelected && "bg-primary-50/50"
                                            )}
                                        >
                                            <td className="px-4 py-4">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-5 h-5 text-primary-600 fill-primary-50" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-secondary-300" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-[11px] font-black text-primary-600 bg-primary-50 px-2 py-1 rounded-md uppercase tracking-tight shadow-sm border border-primary-100 italic">
                                                    {item.inwardNo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col italic">
                                                    <span className="text-[11px] font-bold text-secondary-700 uppercase">{item.sourceRefDisplay || "—"}</span>
                                                    <span className="text-[9px] text-secondary-400 font-black uppercase tracking-widest">
                                                        {item.sourceType === InwardSourceType.PO ? "Purchase Order" :
                                                            item.sourceType === InwardSourceType.JobWork ? "Job Work" : "Outward Return"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-secondary-900 uppercase italic">{item.itemName}</td>
                                            <td className="px-4 py-4 text-[11px] font-bold text-secondary-500 uppercase italic">{item.mainPartName || "—"}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-secondary-500 italic">
                                                    <Clock className="w-3 h-3 text-primary-400" />
                                                    {format(new Date(item.inwardDate), 'dd MMM yy')}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50 flex items-center justify-between">
                    <p className="text-xs font-black text-secondary-500 uppercase tracking-widest italic">
                        {tempSelectedIds.length} Items Selected for Certification
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="h-10 px-6 font-bold text-xs uppercase tracking-widest border-secondary-300 italic ring-offset-background transition-colors hover:bg-secondary-100">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={tempSelectedIds.length === 0}
                            className="h-10 px-8 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary-200 italic transition-all hover:scale-[1.02] active:scale-95"
                        >
                            Confirm Selection
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
