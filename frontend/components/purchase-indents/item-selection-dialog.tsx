"use client";

import { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Package, AlertCircle, Loader2 } from "lucide-react";
import { ItemWithStatus } from "@/types";
import { cn } from "@/lib/utils";

interface ItemSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    items: ItemWithStatus[];
    onSelectItem: (item: ItemWithStatus) => void;
    isLoading?: boolean;
    selectedItemIds: number[];
}

export function ItemSelectionDialog({
    isOpen,
    onClose,
    items,
    onSelectItem,
    isLoading = false,
    selectedItemIds,
}: ItemSelectionDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredItems = useMemo(() => {
        let result = items;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (item) =>
                    item.currentName?.toLowerCase().includes(query) ||
                    item.mainPartName?.toLowerCase().includes(query)
            );
        }
        return result;
    }, [items, searchQuery]);

    const handleSelectItem = (item: ItemWithStatus) => {
        if (item.status === "NotInStock" && !selectedItemIds.includes(item.itemId)) {
            onSelectItem(item);
            setSearchQuery("");
            onClose();
        }
    };

    const handleClose = () => {
        onClose();
        setSearchQuery("");
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "NotInStock":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200">Not in Stock</span>;
            case "InStock":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">In Stock</span>;
            case "InPI":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">PI Issued</span>;
            case "InPO":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">PO Issued</span>;
            case "InQC":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">In QC</span>;
            case "InJobwork":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">In Job Work</span>;
            case "Outward":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">Outward</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary-100 text-secondary-800 border border-secondary-200">{status}</span>;
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Select Die / Pattern"
            size="3xl"
            contentScroll={true}
        >
            <div className="flex flex-col h-[65vh]">
                <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50 sticky top-0 z-20 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search by name or main part..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-primary-600">
                            <Loader2 className="w-10 h-10 animate-spin mb-3" />
                            <p className="text-secondary-600 font-medium tracking-wide">
                                Loading items...
                            </p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-secondary-500">
                            <AlertCircle className="w-12 h-12 mb-3 text-secondary-400" />
                            <p className="text-lg font-bold text-secondary-900">No items found</p>
                            <p className="text-sm font-medium">
                                Try adjusting your search query
                            </p>
                        </div>
                    ) : (
                        <div className="border border-secondary-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead className="bg-secondary-50 border-b border-secondary-200 sticky top-[-17px] z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest bg-secondary-50">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest bg-secondary-50">
                                            Type
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-secondary-500 uppercase tracking-widest bg-secondary-50">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {filteredItems.map((item) => {
                                        const isSelectable = item.status === "NotInStock" && !selectedItemIds.includes(item.itemId);
                                        const alreadySelected = selectedItemIds.includes(item.itemId);

                                        return (
                                            <tr
                                                key={item.itemId}
                                                tabIndex={isSelectable ? 0 : -1}
                                                role="button"
                                                aria-disabled={!isSelectable}
                                                onClick={() => isSelectable && handleSelectItem(item)}
                                                onKeyDown={(e) => {
                                                    if (isSelectable && (e.key === "Enter" || e.key === " ")) {
                                                        e.preventDefault();
                                                        handleSelectItem(item);
                                                    }
                                                }}
                                                className={cn(
                                                    "transition-colors outline-none",
                                                    isSelectable
                                                        ? "hover:bg-primary-50 focus:bg-primary-50 cursor-pointer"
                                                        : "bg-secondary-50/50 cursor-not-allowed"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 border",
                                                            isSelectable ? "bg-white border-primary-100 text-primary-600" : "bg-secondary-100 border-secondary-200 text-secondary-400"
                                                        )}>
                                                            <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className={cn(
                                                                "text-[13px] font-bold truncate",
                                                                isSelectable ? "text-secondary-900" : "text-secondary-500 opacity-70"
                                                            )}>
                                                                {item.currentName}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase tracking-widest truncate mt-0.5",
                                                                isSelectable ? "text-secondary-500" : "text-secondary-400 opacity-70"
                                                            )}>
                                                                {item.mainPartName}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        isSelectable ? "text-secondary-700" : "text-secondary-500 opacity-70"
                                                    )}>
                                                        {item.itemTypeName || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusBadge(item.status)}
                                                        {alreadySelected && (
                                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest">
                                                                Added to List
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-secondary-200 bg-secondary-50 shrink-0">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-secondary-600">
                            Showing <span className="font-bold text-secondary-900">{filteredItems.length}</span> item(s)
                        </p>
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-bold text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 hover:text-secondary-900 transition-colors shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
