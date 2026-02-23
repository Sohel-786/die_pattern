"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, Truck, Package, MapPin,
    ArrowDownLeft, Loader2
} from "lucide-react";
import api from "@/lib/api";
import { PO, Location, PoStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function InwardEntryPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [selectedPoId, setSelectedPoId] = useState<number>(0);
    const [selectedItemId, setSelectedItemId] = useState<number>(0);
    const [targetLocationId, setTargetLocationId] = useState<number>(0);
    const [remarks, setRemarks] = useState("");

    const { data: pos = [], isLoading: loadingPOs } = useQuery<PO[]>({
        queryKey: ["purchase-orders"],
        queryFn: async () => {
            const res = await api.get("/purchase-orders");
            return res.data.data.filter((po: PO) => po.status === PoStatus.Approved);
        },
    });

    const { data: locations = [], isLoading: loadingLocations } = useQuery<Location[]>({
        queryKey: ["locations", "active"],
        queryFn: async () => {
            const res = await api.get("/locations");
            return res.data.data;
        },
    });

    const mutation = useMutation({
        mutationFn: (data: any) => api.post("/movements/inward", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movements"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Item received and sent for QC");
            router.push("/inwards");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Inward failed")
    });

    const selectedPo = pos.find(p => p.id === selectedPoId);
    const poItems = selectedPo?.items || [];

    const handleInward = () => {
        if (!selectedPoId || !selectedItemId || !targetLocationId) {
            toast.error("Please fill all required fields");
            return;
        }
        mutation.mutate({
            purchaseOrderId: selectedPoId,
            itemId: selectedItemId,
            toLocationId: targetLocationId,
            remarks
        });
    };

    return (
        <div className="p-4 bg-secondary-50/30 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center gap-4 mb-2">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 w-10 rounded-lg bg-white shadow-sm border border-secondary-200 flex items-center justify-center hover:bg-secondary-50 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-500" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Inward Receipt</h1>
                        <p className="text-secondary-500 text-sm">Acknowledge material delivery and initiate quality control</p>
                    </div>
                </div>

                <Card className="border-secondary-200 shadow-sm overflow-hidden bg-white">
                    <div className="p-6 border-b border-secondary-100 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                            <Truck className="w-5 h-5" />
                        </div>
                        <h3 className="text-xs font-bold text-secondary-900 uppercase tracking-widest">Receipt Specifications</h3>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Purchase Order</Label>
                                <SearchableSelect
                                    options={pos.map(p => ({ value: p.id, label: `${p.poNo} - ${p.vendorName}` }))}
                                    value={selectedPoId || ""}
                                    onChange={(val) => {
                                        setSelectedPoId(Number(val));
                                        setSelectedItemId(0);
                                    }}
                                    placeholder="Select Approved PO..."
                                    disabled={loadingPOs}
                                />
                                {selectedPo && (
                                    <p className="text-[10px] text-primary-600 font-bold mt-1.5 uppercase italic px-1">
                                        Vendor: {selectedPo.vendorName}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Pending Item</Label>
                                <SearchableSelect
                                    options={poItems.map(i => ({ value: i.itemId, label: i.currentName }))}
                                    value={selectedItemId || ""}
                                    onChange={(val) => setSelectedItemId(Number(val))}
                                    placeholder={selectedPoId ? "Select Item to Receive..." : "Select PO first"}
                                    disabled={!selectedPoId}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Target Storage Location</Label>
                                <SearchableSelect
                                    options={locations.map(l => ({ value: l.id, label: l.name }))}
                                    value={targetLocationId || ""}
                                    onChange={(val) => setTargetLocationId(Number(val))}
                                    placeholder="Select Location..."
                                    disabled={loadingLocations}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider ml-1">Delivery Condition / Remarks</Label>
                                <Textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    placeholder="Note down any observed damages or delivery specifics..."
                                    className="h-[100px] border-secondary-200 focus:border-primary-500 transition-all text-sm p-4 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-secondary-50/50 border-t border-secondary-100 flex justify-end">
                        <Button
                            onClick={handleInward}
                            disabled={mutation.isPending || !selectedPoId || !selectedItemId || !targetLocationId}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-11 px-8 rounded-lg shadow-lg active:scale-[0.98] transition-all flex items-center gap-2"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <ArrowDownLeft className="w-4 h-4" />
                            )}
                            Finalize Inward Entry
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
