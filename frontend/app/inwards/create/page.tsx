"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Loader2, Save, Send } from "lucide-react";
import api from "@/lib/api";
import {
    InwardSourceType, CreateInwardDto, CreateInwardLineDto,
    PO, PoStatus, Location, Movement, MovementType, JobWork, JobWorkStatus
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "Purchase Order",
    [InwardSourceType.OutwardReturn]: "Outward Return",
    [InwardSourceType.JobWork]: "Job Work",
};

export default function CreateInwardPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [sourceType, setSourceType] = useState<InwardSourceType>(InwardSourceType.PO);
    const [sourceRefId, setSourceRefId] = useState<number>(0);
    const [locationId, setLocationId] = useState<number>(0);
    const [remarks, setRemarks] = useState("");
    const [lines, setLines] = useState<CreateInwardLineDto[]>([]);
    const submitAfterSaveRef = useRef(false);

    const { data: pos = [] } = useQuery<PO[]>({
        queryKey: ["purchase-orders"],
        queryFn: async () => {
            const res = await api.get("/purchase-orders");
            return res.data.data.filter((p: PO) => p.status === PoStatus.Approved && p.isActive !== false);
        },
        enabled: sourceType === InwardSourceType.PO
    });

    const { data: movements = [] } = useQuery<Movement[]>({
        queryKey: ["movements"],
        queryFn: async () => {
            const res = await api.get("/movements");
            return res.data.data.filter((m: Movement) => m.type === MovementType.Outward);
        },
        enabled: sourceType === InwardSourceType.OutwardReturn
    });

    const { data: jobWorks = [] } = useQuery<JobWork[]>({
        queryKey: ["job-works"],
        queryFn: async () => {
            const res = await api.get("/job-works");
            return (res.data.data ?? []).filter((jw: JobWork) => jw.status === JobWorkStatus.Pending);
        },
        enabled: sourceType === InwardSourceType.JobWork
    });

    const { data: locations = [] } = useQuery<Location[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations/active");
            return res.data.data;
        }
    });

    const { data: items = [] } = useQuery<{ id: number; currentName: string; mainPartName: string }[]>({
        queryKey: ["items", "active"],
        queryFn: async () => {
            const res = await api.get("/items/active");
            return res.data.data;
        }
    });

    const createMutation = useMutation({
        mutationFn: (body: CreateInwardDto) => api.post("/inwards", body),
        onSuccess: async (res: any) => {
            const id = res?.data?.data?.id;
            if (id && submitAfterSaveRef.current) {
                submitAfterSaveRef.current = false;
                try {
                    await api.post(`/inwards/${id}/submit`);
                    toast.success("Inward created and submitted for QC");
                } catch (err: any) {
                    toast.error(err.response?.data?.message || "Submit failed");
                }
                queryClient.invalidateQueries({ queryKey: ["inwards"] });
                queryClient.invalidateQueries({ queryKey: ["quality-control"] });
                queryClient.invalidateQueries({ queryKey: ["items"] });
                router.push("/inwards");
                return;
            }
            if (id) {
                toast.success("Inward saved as draft");
                queryClient.invalidateQueries({ queryKey: ["inwards"] });
                router.push("/inwards");
            }
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create inward")
    });

    const handleAddLine = () => {
        setLines((prev) => [...prev, { itemId: 0, quantity: 1 }]);
    };

    const handleRemoveLine = (idx: number) => {
        setLines((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleLineChange = (idx: number, field: "itemId" | "quantity", value: number) => {
        setLines((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const loadRefLines = () => {
        if (sourceType === InwardSourceType.PO && sourceRefId) {
            const po = pos.find((p) => p.id === sourceRefId);
            if (po?.items?.length) {
                setLines(po.items.map((i) => ({ itemId: i.itemId, quantity: 1 })));
                return;
            }
        }
        if (sourceType === InwardSourceType.OutwardReturn && sourceRefId) {
            const mov = movements.find((m) => m.id === sourceRefId);
            if (mov?.itemId) {
                setLines([{ itemId: mov.itemId, quantity: 1 }]);
                return;
            }
        }
        if (sourceType === InwardSourceType.JobWork && sourceRefId) {
            const jw = jobWorks.find((j) => j.id === sourceRefId);
            if (jw?.itemId) {
                setLines([{ itemId: jw.itemId, quantity: 1 }]);
                return;
            }
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
        submitAfterSaveRef.current = andSubmit;
        const body: CreateInwardDto = {
            sourceType,
            sourceRefId,
            locationId,
            remarks: remarks || undefined,
            lines: validLines
        };
        createMutation.mutate(body);
    };

    return (
        <div className="p-4 bg-secondary-50/30 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-4 mb-2">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-lg bg-white shadow-sm border border-secondary-200 flex items-center justify-center hover:bg-secondary-50"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">New Inward</h1>
                        <p className="text-secondary-500 text-sm">All PO, Outward Return and Job Work receipts go through Inward → QC</p>
                    </div>
                </div>

                <Card className="border-secondary-200 shadow-sm bg-white overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Source Type</Label>
                                <select
                                    value={sourceType}
                                    onChange={(e) => {
                                        setSourceType(Number(e.target.value));
                                        setSourceRefId(0);
                                        setLines([]);
                                    }}
                                    className="w-full h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                                >
                                    {(Object.keys(SOURCE_LABELS) as unknown as InwardSourceType[]).map((k) => (
                                        <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">
                                    {sourceType === InwardSourceType.PO ? "Purchase Order" : sourceType === InwardSourceType.OutwardReturn ? "Outward Movement" : "Job Work"}
                                </Label>
                                <SearchableSelect
                                    options={refOptions}
                                    value={sourceRefId || ""}
                                    onChange={(val) => {
                                        setSourceRefId(Number(val));
                                        setLines([]);
                                    }}
                                    placeholder={`Select ${SOURCE_LABELS[sourceType]}...`}
                                />
                                {sourceRefId > 0 && (
                                    <Button type="button" variant="outline" size="sm" className="mt-1 text-xs" onClick={loadRefLines}>
                                        Load items from reference
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Receiving Location</Label>
                                <SearchableSelect
                                    options={locations.map((l) => ({ value: l.id, label: l.name }))}
                                    value={locationId || ""}
                                    onChange={(val) => setLocationId(Number(val))}
                                    placeholder="Select location..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Remarks</Label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Optional remarks..."
                                    className="min-h-[80px] border-secondary-200 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Lines (Item + Qty)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={handleAddLine} className="text-xs">
                                    <Plus className="w-3 h-3 mr-1" /> Add line
                                </Button>
                            </div>
                            <div className="border border-secondary-200 rounded-lg overflow-hidden">
                                {lines.length === 0 ? (
                                    <div className="p-6 text-center text-secondary-400 text-sm">Add at least one line. Use &quot;Load items from reference&quot; to prefill from PO/Outward/Job Work.</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary-50 border-b border-secondary-200">
                                            <tr>
                                                <th className="text-left p-2 font-bold text-secondary-700">Item</th>
                                                <th className="text-left p-2 w-24 font-bold text-secondary-700">Qty</th>
                                                <th className="w-10" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => (
                                                <tr key={idx} className="border-b border-secondary-100">
                                                    <td className="p-2">
                                                        <SearchableSelect
                                                            options={items.map((i) => ({ value: i.id, label: `${i.currentName} (${i.mainPartName})` }))}
                                                            value={line.itemId || ""}
                                                            onChange={(val) => handleLineChange(idx, "itemId", Number(val))}
                                                            placeholder="Select item..."
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={line.quantity}
                                                            onChange={(e) => handleLineChange(idx, "quantity", Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                            className="w-full h-9 px-2 rounded border border-secondary-200"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500" onClick={() => handleRemoveLine(idx)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-secondary-50/50 border-t border-secondary-100 flex justify-end gap-3">
                        <Button
                            onClick={() => handleSave(false)}
                            disabled={createMutation.isPending || !canSave}
                            variant="outline"
                            className="font-bold h-11 px-6 rounded-lg"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save as Draft
                        </Button>
                        <Button
                            onClick={() => handleSave(true)}
                            disabled={createMutation.isPending || !canSave}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-11 px-6 rounded-lg shadow-lg"
                        >
                            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                            Save & Submit to QC
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
