"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Package, CheckCircle2, Circle } from "lucide-react";
import api from "@/lib/api";
import { InwardSourceType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SourceSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sourceType: InwardSourceType;
    onSelect: (items: any[]) => void;
    alreadySelectedIds: number[];
    vendorId: number;
}

export function SourceSelectionDialog({
    isOpen,
    onClose,
    sourceType,
    onSelect,
    alreadySelectedIds,
    vendorId
}: SourceSelectionDialogProps) {
    const [search, setSearch] = useState("");
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTempSelectedIds([]);
            setSearch("");
        }
    }, [isOpen]);

    const { data: sources = [], isLoading } = useQuery({
        queryKey: ["inward-sources", sourceType, vendorId],
        queryFn: async () => {
            let url = "";
            if (sourceType === InwardSourceType.PO) url = "/purchase-orders/approved";
            else if (sourceType === InwardSourceType.JobWork) url = "/job-works/pending";

            const params = vendorId ? { vendorId } : {};
            const res = await api.get(url, { params });
            return res.data.data ?? [];
        },
        enabled: isOpen
    });

    const getSourceLabel = () => {
        if (sourceType === InwardSourceType.PO) return "Purchase Order";
        if (sourceType === InwardSourceType.JobWork) return "Job Work";
        return "Outward Entry";
    };

    const filtered = sources.filter((s: any) => {
        const sourcePartyId = s.vendorId;
        if (sourcePartyId !== vendorId) return false;

        const term = search.toLowerCase();
        if (sourceType === InwardSourceType.PO) {
            return s.poNo?.toLowerCase().includes(term) || s.vendorName?.toLowerCase().includes(term);
        } else if (sourceType === InwardSourceType.JobWork) {
            return s.jwNo?.toLowerCase().includes(term) || s.vendorName?.toLowerCase().includes(term);
        }
    }).filter((s: any) => !alreadySelectedIds.includes(s.id));

    const toggleSelection = (sourceId: number) => {
        setTempSelectedIds(prev =>
            prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
        );
    };

    const handleConfirm = () => {
        const selectedSources = sources.filter((s: any) => tempSelectedIds.includes(s.id));
        let allItems: any[] = [];

        selectedSources.forEach((source: any) => {
            if (sourceType === InwardSourceType.PO) {
                const items = (source.items || []).map((i: any) => ({
                    itemId: i.itemId,
                    itemName: i.currentName || i.itemName,
                    mainPartName: i.mainPartName,
                    quantity: 1,
                    sourceType: InwardSourceType.PO,
                    sourceRefId: source.id,
                    sourceRefDisplay: source.poNo,
                    vendorId: source.vendorId,
                    vendorName: source.vendorName,
                    sourceRate: i.rate,
                    sourceGstPercent: i.gstPercent,
                    rate: i.rate,
                    gstPercent: i.gstPercent
                }));
                allItems = [...allItems, ...items];
            } else if (sourceType === InwardSourceType.JobWork) {
                allItems.push({
                    itemId: source.itemId,
                    itemName: source.itemName,
                    mainPartName: source.mainPartName,
                    quantity: 1,
                    sourceType: InwardSourceType.JobWork,
                    sourceRefId: source.id,
                    sourceRefDisplay: source.jobWorkNo,
                    vendorId: source.vendorId,
                    vendorName: source.vendorName
                });
            }
        });

        if (allItems.length > 0) {
            onSelect(allItems);
            onClose();
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={`Import from ${getSourceLabel()}s`}
            size="3xl"
            className="overflow-hidden"
        >
            <div className="flex flex-col h-[70vh]">
                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                        <Input
                            placeholder={`Search ${getSourceLabel().toLowerCase()}s to import...`}
                            className="pl-10 h-10 border-secondary-200 focus:ring-primary-500/20"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-primary-600">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="mt-4 text-[10px] font-black text-secondary-500 uppercase tracking-widest">Searching Records...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-secondary-300">
                            <Package className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest">No pending entries found</p>
                            <p className="text-xs font-medium text-secondary-400 mt-1">Check if items are already added or if sources are approved.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white border-b border-secondary-200 z-10">
                                <tr className="text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                                    <th className="px-4 py-3 w-12 text-center">Select</th>
                                    <th className="px-4 py-3">Reference No</th>
                                    <th className="px-4 py-3">Vendor / Party</th>
                                    <th className="px-4 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {filtered.map((item: any) => {
                                    const isSelected = tempSelectedIds.includes(item.id);
                                    let refNo = "";
                                    let party = "";
                                    let dateText = "";

                                    if (sourceType === InwardSourceType.PO) {
                                        refNo = item.poNo;
                                        party = item.vendorName;
                                        dateText = item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : "—";
                                    } else {
                                        refNo = item.jobWorkNo;
                                        party = item.vendorName;
                                        dateText = item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : "—";
                                    }

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => toggleSelection(item.id)}
                                            className={cn(
                                                "transition-all duration-200 border-transparent group hover:bg-primary-50 cursor-pointer",
                                                isSelected && "bg-primary-50/50"
                                            )}
                                        >
                                            <td className="px-4 py-4 text-center">
                                                {isSelected ? (
                                                    <CheckCircle2 className="w-5 h-5 text-primary-600 fill-primary-50" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-secondary-200 group-hover:text-primary-300" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-bold text-secondary-900 uppercase tracking-tight">{refNo}</span>
                                            </td>
                                            <td className="px-4 py-4 text-sm font-semibold text-secondary-700">{party}</td>
                                            <td className="px-4 py-4 text-sm text-secondary-500 font-medium">{dateText}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50 flex items-center justify-between">
                    <p className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                        {tempSelectedIds.length} Entries Marked for Import
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="h-9 px-6 font-bold text-xs uppercase tracking-widest">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={tempSelectedIds.length === 0}
                            className="h-9 px-8 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary-200"
                        >
                            Import Selected
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
