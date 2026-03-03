"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check, Loader2, X, Package, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface TransferItemSelectionDialogProps {
    open: boolean;
    onClose: () => void;
    fromPartyId: number | null;
    selectedItemIds: number[];
    onAddItems: (items: any[]) => void;
}

export function TransferItemSelectionDialog({
    open,
    onClose,
    fromPartyId,
    selectedItemIds,
    onAddItems,
}: TransferItemSelectionDialogProps) {
    const [search, setSearch] = useState("");
    const [pendingItems, setPendingItems] = useState<any[]>([]);

    useEffect(() => {
        if (!open) {
            setSearch("");
            setPendingItems([]);
        }
    }, [open]);

    const { data: availableItems = [], isLoading } = useQuery<any[]>({
        queryKey: ["available-items-transfer", fromPartyId],
        queryFn: async () => {
            const res = await api.get(`/transfers/available-items?fromPartyId=${fromPartyId || ""}`);
            return res.data.data ?? [];
        },
        enabled: open,
    });

    const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
    const pendingSet = useMemo(() => new Set(pendingItems.map((i) => i.id)), [pendingItems]);

    const filtered = useMemo(() => {
        let result = availableItems.filter((i) => !selectedSet.has(i.id));
        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(
                (i) =>
                    (i.mainPartName ?? "").toLowerCase().includes(query) ||
                    (i.currentName ?? "").toLowerCase().includes(query) ||
                    (i.drawingNo ?? "").toLowerCase().includes(query) ||
                    (i.materialName ?? "").toLowerCase().includes(query)
            );
        }
        return result;
    }, [availableItems, search, selectedSet]);

    const addToPending = (item: any) => {
        if (selectedSet.has(item.id) || pendingSet.has(item.id)) return;
        setPendingItems((prev) => [...prev, item]);
    };

    const removeFromPending = (itemId: number) => {
        setPendingItems((prev) => prev.filter((i) => i.id !== itemId));
    };

    const clearPending = () => {
        setPendingItems([]);
    };

    const commitAdd = () => {
        if (pendingItems.length === 0) return;
        onAddItems(pendingItems);
        setPendingItems([]);
    };

    const handleDone = () => {
        setSearch("");
        setPendingItems([]);
        onClose();
    };

    return (
        <Dialog
            isOpen={open}
            onClose={handleDone}
            title="Select Available Items"
            size="3xl"
            contentScroll={false}
            className="max-h-[90vh] flex flex-col"
        >
            <div className="flex flex-col flex-1 min-h-0 p-6 gap-4">
                <p className="text-[11px] font-bold text-secondary-500 uppercase tracking-widest">
                    Add available items to your transfer selection. You can add multiple batches without closing.
                </p>

                {/* Pending Selection Section */}
                {pendingItems.length > 0 && (
                    <div className="rounded-xl border-2 border-primary-200 bg-primary-50/20 overflow-hidden shrink-0 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between px-4 py-2 bg-primary-100/50 border-b border-primary-200">
                            <h3 className="text-[10px] font-black text-primary-900 uppercase tracking-widest flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-primary-600" />
                                Selection Batch ({pendingItems.length})
                            </h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={clearPending}
                                className="h-6 px-2 text-[9px] font-black uppercase text-primary-700 hover:bg-primary-200 hover:text-primary-900 transition-colors"
                            >
                                Clear batch
                            </Button>
                        </div>
                        <div className="max-h-[160px] overflow-auto bg-white/50 backdrop-blur-sm">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-secondary-50/50 border-b border-primary-100">
                                        <TableHead className="w-10 text-center text-[10px] font-black uppercase text-secondary-500 tracking-tighter">#</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-500 tracking-tighter">Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-500 tracking-tighter">Main Part</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-500 tracking-tighter w-24">Type</TableHead>
                                        <TableHead className="w-12 text-center text-[10px] font-black uppercase text-secondary-500 tracking-tighter">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingItems.map((item, idx) => (
                                        <TableRow
                                            key={item.id}
                                            className="border-b border-primary-50 last:border-0 hover:bg-primary-50/30 transition-colors"
                                        >
                                            <td className="text-center text-secondary-400 font-black text-[11px] py-1.5">{idx + 1}</td>
                                            <td className="py-1.5">
                                                <span className="font-bold text-secondary-900 text-xs">{item.currentName}</span>
                                            </td>
                                            <td className="py-1.5 text-secondary-600 font-bold text-xs uppercase tracking-tighter">{item.mainPartName}</td>
                                            <td className="py-1.5">
                                                <span className="text-secondary-500 font-black text-[10px] uppercase tracking-widest">{item.itemTypeName}</span>
                                            </td>
                                            <td className="text-center py-1.5">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFromPending(item.id)}
                                                    className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </td>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 group-focus-within:text-primary-500 transition-colors pointer-events-none" />
                    <Input
                        placeholder="Search by name, part or drawing number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-11 border-secondary-200 bg-white shadow-sm focus:ring-primary-500/10 rounded-xl font-medium"
                    />
                </div>

                {/* Available Items Section */}
                <div className="flex-1 min-h-0 border border-secondary-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col">
                    <div className="px-4 py-2 border-b border-secondary-100 bg-secondary-50/50 flex items-center justify-between">
                        <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                            Available In-Stock Items
                        </span>
                        <span className="bg-secondary-200 text-secondary-700 px-2 py-0.5 rounded text-[9px] font-black">
                            {filtered.length} Results
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3 grayscale opacity-50">
                            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                            <p className="font-black uppercase tracking-[0.2em] text-[10px] text-secondary-400 animate-pulse">Loading available items...</p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1 min-h-0 bg-white">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-10 border-b border-secondary-100">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-14 text-center text-[10px] font-black uppercase text-secondary-400 tracking-widest">Action</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-400 tracking-widest">Die/Pattern Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-400 tracking-widest">Main Part</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-secondary-400 tracking-widest w-32">Specification</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-2 grayscale opacity-40">
                                                    <Package className="w-10 h-10" />
                                                    <p className="font-black uppercase tracking-widest text-[10px]">No matching items found</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filtered.map((item) => {
                                            const inPending = pendingSet.has(item.id);
                                            return (
                                                <TableRow
                                                    key={item.id}
                                                    className={cn(
                                                        "border-b border-secondary-50 last:border-0 transition-all cursor-pointer group",
                                                        inPending ? "bg-primary-50/30" : "hover:bg-secondary-50/50"
                                                    )}
                                                    onClick={() => addToPending(item)}
                                                >
                                                    <td className="text-center align-middle py-3">
                                                        <div className="flex justify-center">
                                                            {inPending ? (
                                                                <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm animate-in zoom-in-50">
                                                                    <Check className="w-4 h-4 stroke-[3px]" />
                                                                </div>
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full border-2 border-dashed border-secondary-200 text-secondary-300 flex items-center justify-center group-hover:border-primary-400 group-hover:text-primary-500 group-hover:bg-white transition-all">
                                                                    <Plus className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex flex-col">
                                                            <span className={cn("font-bold text-sm transition-colors", inPending ? "text-primary-700 font-black" : "text-secondary-900")}>
                                                                {item.currentName}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">
                                                                {item.drawingNo || "No Drawing"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="text-secondary-600 font-bold text-xs uppercase tracking-tight">
                                                            {item.mainPartName}
                                                        </span>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">{item.itemTypeName}</span>
                                                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">{item.materialName}</span>
                                                        </div>
                                                    </td>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-4 border-t border-secondary-100 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest text-center">Batch Items</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-primary-600">{pendingItems.length}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDone}
                            className="font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl border-secondary-200 hover:bg-secondary-50 transition-colors"
                        >
                            Done
                        </Button>
                        <Button
                            type="button"
                            onClick={commitAdd}
                            disabled={pendingItems.length === 0}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-black text-[10px] uppercase tracking-widest h-11 px-8 rounded-xl shadow-lg shadow-primary-200 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
                        >
                            Add Assets to List
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
