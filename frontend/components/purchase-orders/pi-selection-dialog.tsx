"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { PurchaseIndent, PurchaseIndentStatus } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useCallback } from "react";
import { registerDialog, isTopDialog } from "@/lib/dialog-stack";

interface PiSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    availablePIs: PurchaseIndent[];
    selectedPiIds: number[];
    onSelectPIs: (pis: PurchaseIndent[]) => void;
}

export function PiSelectionDialog({
    isOpen,
    onClose,
    availablePIs,
    selectedPiIds,
    onSelectPIs,
}: PiSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) setTempSelectedIds(selectedPiIds);
    }, [isOpen, selectedPiIds]);



    const filteredPIs = useMemo(() => {
        // Filter rejected PIs AND PIs that are already selected in the main PO dialog
        let result = availablePIs.filter(pi =>
            pi.status !== PurchaseIndentStatus.Rejected &&
            !selectedPiIds.includes(pi.id)
        );

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (pi) =>
                    pi.piNo.toLowerCase().includes(query) ||
                    pi.creatorName.toLowerCase().includes(query) ||
                    pi.remarks?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [availablePIs, searchQuery]);

    const toggleSelection = (pi: PurchaseIndent) => {
        if (pi.status !== PurchaseIndentStatus.Approved) return;

        setTempSelectedIds(prev =>
            prev.includes(pi.id)
                ? prev.filter(id => id !== pi.id)
                : [...prev, pi.id]
        );
    };

    const handleAdd = () => {
        const selectedPIs = availablePIs.filter(pi => tempSelectedIds.includes(pi.id));
        onSelectPIs(selectedPIs);
        onClose();
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Select Purchase Indents"
            size="3xl"
            overlayClassName="z-[1200]" // Higher than PO dialog (1100)
        >
            <div className="flex flex-col max-h-[70vh]">
                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search by PI No, requester, or remarks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 border-secondary-200 focus:ring-primary-500/20"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                    {filteredPIs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-secondary-500">
                            <AlertCircle className="w-12 h-12 mb-3 text-secondary-300" />
                            <p className="text-lg font-bold">No Indents Available</p>
                            <p className="text-sm">Only approved indents that are not yet in a PO will be shown here.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white border-b border-secondary-200 z-10">
                                <tr className="text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                                    <th className="px-4 py-3 w-12">Select</th>
                                    <th className="px-4 py-3">Indent Details</th>
                                    <th className="px-4 py-3">Requester</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Items</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filteredPIs.map((pi) => {
                                    const isApproved = pi.status === PurchaseIndentStatus.Approved;
                                    const isSelected = tempSelectedIds.includes(pi.id);

                                    return (
                                        <tr
                                            key={pi.id}
                                            onClick={() => isApproved && toggleSelection(pi)}
                                            className={cn(
                                                "transition-all duration-200 border-transparent",
                                                isApproved
                                                    ? "hover:bg-primary-50 cursor-pointer"
                                                    : "opacity-50 cursor-not-allowed bg-secondary-50/50"
                                            )}
                                        >
                                            <td className="px-4 py-4">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-5 h-5 text-primary-600 fill-primary-50" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-secondary-300" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-black text-secondary-900 uppercase tracking-tight">{pi.piNo}</span>
                                                {pi.remarks && (
                                                    <p className="text-[10px] text-secondary-500 line-clamp-1 mt-1 font-medium">{pi.remarks}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-sm font-bold text-secondary-700">{pi.creatorName}</td>
                                            <td className="px-4 py-4 text-sm text-secondary-500">{format(new Date(pi.createdAt), 'dd MMM yyyy')}</td>
                                            <td className="px-4 py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                                    isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    {pi.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-xs font-black text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">
                                                    {pi.items?.length || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">
                        {tempSelectedIds.length} Indents Selected
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="h-10 px-6 font-bold text-xs uppercase tracking-widest border-secondary-300">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={tempSelectedIds.length === 0}
                            className="h-10 px-8 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary-200"
                        >
                            Add PI
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
