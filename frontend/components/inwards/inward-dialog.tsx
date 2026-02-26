"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Send, Loader2, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import {
    InwardSourceType, CreateInwardDto, CreateInwardLineDto,
    PO, PoStatus, Location, Movement, MovementType, JobWork, JobWorkStatus
} from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "Purchase Order",
    [InwardSourceType.OutwardReturn]: "Outward Return",
    [InwardSourceType.JobWork]: "Job Work",
};

interface InwardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InwardDialog({ open, onOpenChange }: InwardDialogProps) {
    const queryClient = useQueryClient();
    const [sourceType, setSourceType] = useState<InwardSourceType>(InwardSourceType.PO);
    const [sourceRefId, setSourceRefId] = useState<number>(0);
    const [locationId, setLocationId] = useState<number>(0);
    const [remarks, setRemarks] = useState("");
    const [lines, setLines] = useState<CreateInwardLineDto[]>([]);
    const [submitAfterSave, setSubmitAfterSave] = useState(false);

    const { data: pos = [] } = useQuery<PO[]>({
        queryKey: ["purchase-orders"],
        queryFn: async () => {
            const res = await api.get("/purchase-orders");
            return (res.data.data ?? []).filter((p: PO) => p.status === PoStatus.Approved && p.isActive !== false);
        },
        enabled: open && sourceType === InwardSourceType.PO
    });

    const { data: movements = [] } = useQuery<Movement[]>({
        queryKey: ["movements"],
        queryFn: async () => {
            const res = await api.get("/movements");
            return (res.data.data ?? []).filter((m: Movement) => m.type === MovementType.Outward);
        },
        enabled: open && sourceType === InwardSourceType.OutwardReturn
    });

    const { data: jobWorks = [] } = useQuery<JobWork[]>({
        queryKey: ["job-works"],
        queryFn: async () => {
            const res = await api.get("/job-works");
            return (res.data.data ?? []).filter((jw: JobWork) => jw.status === JobWorkStatus.Pending);
        },
        enabled: open && sourceType === InwardSourceType.JobWork
    });

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    const { data: items = [] } = useQuery<{ id: number; currentName: string; mainPartName: string }[]>({
        queryKey: ["items", "active"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return res.data.data ?? [];
        },
        enabled: open
    });

    useEffect(() => {
        if (!open) {
            setSourceRefId(0);
            setLines([]);
        }
    }, [open, sourceType]);

    const createMutation = useMutation({
        mutationFn: (body: CreateInwardDto) => api.post("/inwards", body),
        onSuccess: async (res: any) => {
            const id = res?.data?.data?.id;
            if (id && submitAfterSave) {
                setSubmitAfterSave(false);
                try {
                    await api.post(`/inwards/${id}/submit`);
                    toast.success("Inward created and submitted for QC");
                } catch (err: any) {
                    toast.error(err.response?.data?.message || "Submit failed");
                }
                queryClient.invalidateQueries({ queryKey: ["inwards"] });
                queryClient.invalidateQueries({ queryKey: ["quality-control"] });
                queryClient.invalidateQueries({ queryKey: ["items"] });
                onOpenChange(false);
                return;
            }
            if (id) {
                toast.success("Inward saved as draft");
                queryClient.invalidateQueries({ queryKey: ["inwards"] });
                onOpenChange(false);
            }
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create inward")
    });

    const loadRefLines = () => {
        if (sourceType === InwardSourceType.PO && sourceRefId) {
            const po = pos.find((p) => p.id === sourceRefId);
            if (po?.items?.length) setLines(po.items.map((i) => ({ itemId: i.itemId, quantity: 1 })));
        } else if (sourceType === InwardSourceType.OutwardReturn && sourceRefId) {
            const mov = movements.find((m) => m.id === sourceRefId);
            if (mov?.itemId) setLines([{ itemId: mov.itemId, quantity: 1 }]);
        } else if (sourceType === InwardSourceType.JobWork && sourceRefId) {
            const jw = jobWorks.find((j) => j.id === sourceRefId);
            if (jw?.itemId) setLines([{ itemId: jw.itemId, quantity: 1 }]);
        }
    };

    const refOptions = sourceType === InwardSourceType.PO
        ? pos.map((p) => ({ value: p.id, label: `${p.poNo} - ${p.vendorName}` }))
        : sourceType === InwardSourceType.OutwardReturn
            ? movements.map((m) => ({ value: m.id, label: `#${m.id} ${m.itemName ?? m.item?.currentName}` }))
            : jobWorks.map((j) => ({ value: j.id, label: `${j.jobWorkNo} - ${j.itemName ?? ""}` }));

    const validLines = lines.filter((l) => l.itemId > 0 && l.quantity >= 1);
    const canSave = sourceRefId > 0 && locationId > 0 && validLines.length > 0;

    const handleSave = (andSubmit: boolean) => {
        if (!canSave) {
            toast.error("Select source reference, location, and add at least one valid line.");
            return;
        }
        setSubmitAfterSave(andSubmit);
        createMutation.mutate({
            sourceType,
            sourceRefId,
            locationId,
            remarks: remarks || undefined,
            lines: validLines
        });
    };

    const handleAddLine = () => setLines((prev) => [...prev, { itemId: 0, quantity: 1 }]);
    const handleRemoveLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
    const handleLineChange = (idx: number, field: "itemId" | "quantity", value: number) => {
        setLines((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title="New Inward"
            size="full"
            contentScroll={false}
            className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
        >
            <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
                <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-2">
                            <Label className="text-xs font-semibold text-secondary-600">Source Type</Label>
                            <select
                                value={sourceType}
                                onChange={(e) => {
                                    setSourceType(Number(e.target.value));
                                    setSourceRefId(0);
                                    setLines([]);
                                }}
                                className="w-full h-9 mt-0.5 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                            >
                                {(Object.keys(SOURCE_LABELS) as unknown as InwardSourceType[]).map((k) => (
                                    <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-3">
                            <Label className="text-xs font-semibold text-secondary-600">
                                {sourceType === InwardSourceType.PO ? "Purchase Order" : sourceType === InwardSourceType.OutwardReturn ? "Outward Movement" : "Job Work"}
                            </Label>
                            <div className="mt-0.5">
                                <SearchableSelect
                                    options={refOptions}
                                    value={sourceRefId || ""}
                                    onChange={(val) => {
                                        setSourceRefId(Number(val));
                                        setLines([]);
                                    }}
                                    placeholder={`Select ${SOURCE_LABELS[sourceType]}...`}
                                />
                            </div>
                        </div>
                        {sourceRefId > 0 && (
                            <div className="col-span-2">
                                <Button type="button" variant="outline" size="sm" className="h-9" onClick={loadRefLines}>
                                    Load items from reference
                                </Button>
                            </div>
                        )}
                        <div className="col-span-3">
                            <Label className="text-xs font-semibold text-secondary-600">Receiving Location *</Label>
                            <div className="mt-0.5">
                                <SearchableSelect
                                    options={locations.map((l) => ({ value: l.id, label: l.name }))}
                                    value={locationId || ""}
                                    onChange={(val) => setLocationId(Number(val))}
                                    placeholder="Select location..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">
                            <Label className="text-xs font-semibold text-secondary-600">Remarks</Label>
                            <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Optional remarks..."
                                className="mt-0.5 min-h-[72px] text-sm border-secondary-200 rounded-lg resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <Label className="text-xs font-semibold text-secondary-600 shrink-0">Lines</Label>
                        <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleAddLine}>
                            <Plus className="w-4 h-4 mr-1" /> Add line
                        </Button>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-auto overflow-x-auto">
                            <table className="w-full border-collapse text-sm min-w-[500px]">
                                <thead className="sticky top-0 bg-secondary-100 border-b border-secondary-200 z-10">
                                    <tr>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-12 text-center">#</th>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider">Item</th>
                                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-700 text-xs uppercase tracking-wider w-24">Qty</th>
                                        <th className="w-16" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {lines.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-secondary-500 text-sm">
                                                Add at least one line or use &quot;Load items from reference&quot;.
                                            </td>
                                        </tr>
                                    ) : (
                                        lines.map((line, idx) => (
                                            <tr key={idx} className="hover:bg-primary-50/30">
                                                <td className="py-2.5 px-3 text-secondary-500 text-sm text-center">{idx + 1}</td>
                                                <td className="py-2.5 px-3">
                                                    <SearchableSelect
                                                        options={items.map((i) => ({ value: i.id, label: `${i.currentName} (${i.mainPartName})` }))}
                                                        value={line.itemId || ""}
                                                        onChange={(val) => handleLineChange(idx, "itemId", Number(val))}
                                                        placeholder="Select item..."
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={line.quantity}
                                                        onChange={(e) => handleLineChange(idx, "quantity", Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                        className="w-full h-9 px-2 rounded border border-secondary-200 text-sm"
                                                    />
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50" onClick={() => handleRemoveLine(idx)}>
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
                        onClick={() => handleSave(false)}
                        disabled={createMutation.isPending || !canSave}
                        variant="outline"
                        className="h-9 px-5 font-semibold gap-2"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save as Draft
                    </Button>
                    <Button
                        onClick={() => handleSave(true)}
                        disabled={createMutation.isPending || !canSave}
                        className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2"
                    >
                        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Save & Submit to QC
                    </Button>
                </footer>
            </div>
        </Dialog>
    );
}
