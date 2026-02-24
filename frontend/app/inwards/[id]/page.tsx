"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Package, FileText, Truck, Briefcase } from "lucide-react";
import api from "@/lib/api";
import { Inward, InwardSourceType, InwardStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "PO",
    [InwardSourceType.OutwardReturn]: "Outward Return",
    [InwardSourceType.JobWork]: "Job Work",
};

export default function InwardDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);
    const queryClient = useQueryClient();
    const { data: permissions } = useCurrentUserPermissions();

    const { data: inward, isLoading } = useQuery<Inward>({
        queryKey: ["inwards", id],
        queryFn: async () => {
            const res = await api.get(`/inwards/${id}`);
            return res.data.data;
        },
        enabled: !!id && !isNaN(id)
    });

    const submitMutation = useMutation({
        mutationFn: () => api.post(`/inwards/${id}/submit`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            toast.success("Inward submitted for QC");
            router.push("/inwards");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Submit failed")
    });

    if (!id || isNaN(id)) {
        router.replace("/inwards");
        return null;
    }

    if (isLoading || !inward) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    const isDraft = inward.status === InwardStatus.Draft;
    const SourceIcon = inward.sourceType === InwardSourceType.PO ? FileText : inward.sourceType === InwardSourceType.OutwardReturn ? Truck : Briefcase;

    return (
        <div className="p-4 bg-secondary-50/30 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="h-10 w-10 rounded-lg bg-white shadow-sm border border-secondary-200"
                        >
                            <ArrowLeft className="w-5 h-5 text-secondary-500" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">{inward.inwardNo}</h1>
                            <p className="text-secondary-500 text-sm">
                                {SOURCE_LABELS[inward.sourceType]} • {inward.sourceRefDisplay} • {format(new Date(inward.inwardDate), "dd MMM yyyy")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${isDraft ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {isDraft ? "Draft" : "Submitted"}
                        </span>
                        {isDraft && permissions?.createInward && (
                            <Button
                                onClick={() => submitMutation.mutate()}
                                disabled={submitMutation.isPending}
                                className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-5"
                            >
                                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Submit to QC
                            </Button>
                        )}
                    </div>
                </div>

                <Card className="border-secondary-200 shadow-sm bg-white overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                                <SourceIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Source</p>
                                <p className="font-bold text-secondary-900">{SOURCE_LABELS[inward.sourceType]} — {inward.sourceRefDisplay}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-secondary-500 uppercase">Vendor / Location</p>
                            <p className="font-bold text-secondary-900">{inward.vendorName ?? "—"}</p>
                            <p className="text-sm text-secondary-600">{inward.locationName}</p>
                        </div>
                        {inward.remarks && (
                            <div className="md:col-span-2">
                                <p className="text-[10px] font-bold text-secondary-500 uppercase">Remarks</p>
                                <p className="text-secondary-700">{inward.remarks}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6">
                        <h3 className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-3">Lines</h3>
                        <div className="border border-secondary-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-secondary-50 border-b border-secondary-200">
                                    <tr>
                                        <th className="text-left p-3 font-bold text-secondary-700">Item</th>
                                        <th className="text-left p-3 font-bold text-secondary-700">Qty</th>
                                        <th className="text-left p-3 font-bold text-secondary-700">QC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(inward.lines || []).map((line) => (
                                        <tr key={line.id} className="border-b border-secondary-100">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-secondary-400" />
                                                    <span className="font-medium text-secondary-900">{line.itemName ?? line.mainPartName ?? line.itemId}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 font-bold">{line.quantity}</td>
                                            <td className="p-3">
                                                {line.isQCApproved ? (
                                                    <span className="text-emerald-600 font-bold text-xs">Approved</span>
                                                ) : line.isQCPending ? (
                                                    <span className="text-amber-600 font-bold text-xs">Pending</span>
                                                ) : (
                                                    <span className="text-secondary-400 text-xs">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
