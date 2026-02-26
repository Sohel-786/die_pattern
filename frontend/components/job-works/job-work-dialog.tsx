"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Save, Package, Loader2, Calendar, Plus } from "lucide-react";
import api from "@/lib/api";
import { Item, Party, HolderType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface JobWorkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JobWorkDialog({ open, onOpenChange }: JobWorkDialogProps) {
    const queryClient = useQueryClient();
    const [nextCode, setNextCode] = useState("");
    const [toPartyId, setToPartyId] = useState<number>(0);
    const [description, setDescription] = useState("");
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [itemSelectionOpen, setItemSelectionOpen] = useState(false);

    useEffect(() => {
        if (!open) {
            setToPartyId(0);
            setDescription("");
            setSelectedItemIds([]);
            setItemSelectionOpen(false);
        } else {
            api.get("/job-works/next-code").then((res) => setNextCode(res.data?.data ?? "JW-01")).catch(() => setNextCode("JW-01"));
        }
    }, [open]);

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    const { data: inStockItems = [] } = useQuery<Item[]>({
        queryKey: ["items", "active", "in-stock"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return (res.data.data ?? []).filter((i: Item) => i.currentHolderType === HolderType.Location);
        },
        enabled: open
    });

    const createMutation = useMutation({
        mutationFn: async (payload: { itemId: number; toPartyId?: number; description?: string }) =>
            api.post("/job-works", payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Create failed")
    });

    const selectedItems = inStockItems.filter((i) => selectedItemIds.includes(i.id));

    const addItems = (ids: number[]) => {
        setSelectedItemIds((prev) => [...new Set([...prev, ...ids])]);
        setItemSelectionOpen(false);
    };

    const removeItem = (id: number) => setSelectedItemIds((prev) => prev.filter((x) => x !== id));

    const handleSubmit = async () => {
        if (selectedItemIds.length === 0) {
            toast.error("Please add at least one item (Die/Pattern).");
            return;
        }
        const toParty = toPartyId > 0 ? toPartyId : undefined;
        for (const itemId of selectedItemIds) {
            try {
                await createMutation.mutateAsync({ itemId, toPartyId: toParty, description: description || undefined });
            } catch {
                return;
            }
        }
        toast.success(`Job Work created for ${selectedItemIds.length} item(s).`);
        onOpenChange(false);
    };

    return (
        <>
            <Dialog
                isOpen={open}
                onClose={() => onOpenChange(false)}
                title="New Job Work"
                size="full"
                contentScroll={false}
                className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
            >
                <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                    <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                        <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-secondary-600">Job Work No.</Label>
                                <Input value={nextCode} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm font-semibold" />
                            </div>
                            <div className="col-span-2">
                                <Label className="text-xs font-semibold text-secondary-600">Date</Label>
                                <div className="h-9 mt-0.5 px-3 flex items-center bg-secondary-50 border border-secondary-200 rounded-lg text-sm text-secondary-700">
                                    <Calendar className="w-4 h-4 mr-2 text-secondary-400 shrink-0" />
                                    {format(new Date(), "dd-MMM-yyyy")}
                                </div>
                            </div>
                            <div className="col-span-4">
                                <Label className="text-xs font-semibold text-secondary-600">Party (send to) *</Label>
                                <div className="mt-0.5">
                                    <SearchableSelect
                                        options={parties.map((p) => ({ value: p.id, label: p.name }))}
                                        value={toPartyId || ""}
                                        onChange={(val) => setToPartyId(Number(val))}
                                        placeholder="Select party..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <Label className="text-xs font-semibold text-secondary-600">Job work for (purpose) *</Label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Heat treatment, Surface coating..."
                                    className="mt-0.5 min-h-[72px] text-sm border-secondary-200 rounded-lg resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            <Label className="text-xs font-semibold text-secondary-600 shrink-0">Die / Pattern</Label>
                            <Button
                                type="button"
                                onClick={() => setItemSelectionOpen(true)}
                                className="h-9 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Die / Pattern
                            </Button>
                        </div>
                        <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden">
                            <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                                <table className="w-full border-collapse text-sm min-w-[500px]">
                                    <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                        <tr>
                                            <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-12 text-center">#</th>
                                            <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Name</th>
                                            <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-24">Type</th>
                                            <th className="text-right py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-20">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100 bg-white">
                                        {selectedItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-secondary-500 text-sm">
                                                    No items. Click &quot;Add Die / Pattern&quot; to add items (In Stock only).
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedItems.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-primary-50/30">
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
                                                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 rounded-full"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || selectedItemIds.length === 0 || !description.trim()}
                            className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Create Job Work
                        </Button>
                    </footer>
                </div>
            </Dialog>

            {/* In-stock item selection dialog */}
            <Dialog
                isOpen={itemSelectionOpen}
                onClose={() => setItemSelectionOpen(false)}
                title="Add Die / Pattern (In Stock only)"
                size="2xl"
                contentScroll={false}
                className="max-h-[90vh] flex flex-col"
            >
                <div className="flex flex-col flex-1 min-h-0 p-6 gap-4">
                    <p className="text-sm text-secondary-600">
                        Select items that are currently In Stock to send for job work.
                    </p>
                    <div className="flex-1 min-h-0 overflow-auto border border-secondary-200 rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary-50">
                                    <TableHead className="w-12 text-center">#</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Main Part</TableHead>
                                    <TableHead className="w-24">Type</TableHead>
                                    <TableHead className="w-20 text-center">Add</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {inStockItems
                                    .filter((i) => !selectedItemIds.includes(i.id))
                                    .map((item, idx) => (
                                        <TableRow key={item.id} className="hover:bg-primary-50/30">
                                            <TableCell className="text-center text-secondary-500 text-sm">{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-secondary-900">{item.currentName}</TableCell>
                                            <TableCell className="text-secondary-600 text-sm">{item.mainPartName}</TableCell>
                                            <TableCell className="text-secondary-600 text-sm">{item.itemTypeName ?? "—"}</TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    onClick={() => addItems([item.id])}
                                                >
                                                    Add
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setItemSelectionOpen(false)}>Done</Button>
                    </div>
                </div>
            </Dialog>
        </>
    );
}
