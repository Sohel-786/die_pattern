"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2, Package, FileText, Truck, Briefcase, Info, Calendar, User, MapPin, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import { Inward, InwardSourceType, InwardStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouter, useParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "Purchase Order",
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
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Inward submitted for QC successfully");
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
            <div className="flex h-screen items-center justify-center bg-secondary-50/20">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
                    <p className="text-secondary-400 font-bold uppercase tracking-widest text-[10px]">Loading Receipt Data...</p>
                </div>
            </div>
        );
    }

    const isSubmitted = inward.status === InwardStatus.Submitted;

    return (
        <div className="flex flex-col h-screen bg-[#f8fafc] overflow-hidden font-sans">
            {/* High-Fidelity Header */}
            <header className="shrink-0 bg-white border-b border-secondary-200 px-8 py-5 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 w-10 p-0 text-secondary-500 hover:text-primary-600 hover:bg-secondary-50 transition-all rounded-xl border border-transparent hover:border-secondary-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-secondary-900 tracking-tight leading-none">
                                {inward.inwardNo}
                            </h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                isSubmitted
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                                {isSubmitted ? "Submitted to QC" : "Draft Entry"}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-primary-500" />
                            Received on {format(new Date(inward.inwardDate), "dd MMM yyyy")}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!isSubmitted && permissions?.createInward && (
                        <Button
                            onClick={() => submitMutation.mutate()}
                            disabled={submitMutation.isPending}
                            className="h-11 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4)] gap-3 transition-all active:scale-95"
                        >
                            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Submit for Inspection
                        </Button>
                    )}
                    {isSubmitted && (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Receipt Locked</span>
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-auto px-8 py-8 pb-12">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Key Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex flex-col gap-4 group hover:border-primary-200 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 border-l-4 border-l-blue-500 shadow-inner group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Vendor / Party</Label>
                                <p className="font-black text-secondary-900 text-lg mt-1 truncate">{inward.vendorName ?? "Internal Receipt"}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex flex-col gap-4 group hover:border-primary-200 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 border-l-4 border-l-emerald-500 shadow-inner group-hover:scale-110 transition-transform">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Inventory Location</Label>
                                <p className="font-black text-secondary-900 text-lg mt-1 truncate">{inward.locationName}</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex flex-col gap-4 group hover:border-primary-200 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 border-l-4 border-l-amber-500 shadow-inner group-hover:scale-110 transition-transform">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Total Package Qty</Label>
                                <p className="font-black text-secondary-900 text-lg mt-1">{inward.lines?.reduce((sum, l) => sum + l.quantity, 0)} Items</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex flex-col gap-4 group hover:border-primary-200 transition-all border-l-4 border-l-primary-500">
                            <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100 shadow-inner group-hover:scale-110 transition-transform">
                                <Info className="w-6 h-6" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest leading-none">Created By</Label>
                                <p className="font-black text-secondary-900 text-lg mt-1 truncate">{inward.creatorName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Received Items Breakdown */}
                    <div className="bg-white rounded-3xl border border-secondary-200 shadow-xl overflow-hidden flex flex-col">
                        <div className="px-8 py-5 border-b border-secondary-100 bg-secondary-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg border border-secondary-200 shadow-sm">
                                    <FileText className="w-5 h-5 text-primary-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-secondary-800 uppercase tracking-widest">Received Product Breakdown</h3>
                                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter mt-0.5">Verification of goods against source documents</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-primary-600 bg-primary-50 px-4 py-1.5 rounded-xl border border-primary-100 shadow-sm uppercase tracking-widest">
                                    {inward.lines?.length} Distinct Line(s)
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#fcfdfe] border-b border-secondary-100">
                                    <tr>
                                        <th className="py-4 px-8 text-left font-black text-secondary-400 text-[10px] uppercase tracking-widest w-16">SR</th>
                                        <th className="py-4 px-8 text-left font-black text-secondary-400 text-[10px] uppercase tracking-widest">Item Specification</th>
                                        <th className="py-4 px-8 text-left font-black text-secondary-400 text-[10px] uppercase tracking-widest">Source Context</th>
                                        <th className="py-4 px-8 text-center font-black text-secondary-400 text-[10px] uppercase tracking-widest w-32">Qty</th>
                                        <th className="py-4 px-8 text-left font-black text-secondary-400 text-[10px] uppercase tracking-widest">Remark</th>
                                        <th className="py-4 px-8 text-right font-black text-secondary-400 text-[10px] uppercase tracking-widest">QC Health</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {(inward.lines || []).map((line, idx) => (
                                        <tr key={line.id} className="hover:bg-primary-50/20 transition-all group">
                                            <td className="py-5 px-8 font-black text-secondary-300 group-hover:text-primary-600 transition-colors tabular-nums">{String(idx + 1).padStart(2, '0')}</td>
                                            <td className="py-5 px-8">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-secondary-900 group-hover:text-primary-700 transition-colors text-base tracking-tight leading-none">
                                                        {line.itemName || line.mainPartName || "No Name"}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-secondary-400 uppercase mt-1.5 tracking-tighter tabular-nums">{line.mainPartName || "—"}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-black text-secondary-400 uppercase leading-none mb-1 tracking-widest flex items-center gap-1.5">
                                                        {line.sourceType === InwardSourceType.PO ? <FileText className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                                        {SOURCE_LABELS[line.sourceType]}
                                                    </span>
                                                    <span className="font-black text-primary-600 tracking-tight text-sm">
                                                        {line.sourceRefDisplay}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-8 text-center">
                                                <span className="inline-flex h-10 px-4 items-center justify-center bg-secondary-100/50 rounded-xl font-black text-secondary-900 border border-secondary-200 shadow-inner text-base">
                                                    {line.quantity}
                                                </span>
                                            </td>
                                            <td className="py-5 px-8">
                                                <p className="text-xs font-bold text-secondary-500 italic max-w-xs truncate tabular-nums">
                                                    {line.remarks ? `"${line.remarks}"` : <span className="text-secondary-200">No notes</span>}
                                                </p>
                                            </td>
                                            <td className="py-5 px-8 text-right">
                                                {line.isQCApproved ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-[9px] uppercase tracking-widest border border-emerald-100 shadow-sm cursor-default">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        Approved
                                                    </div>
                                                ) : line.isQCPending ? (
                                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 font-black text-[9px] uppercase tracking-widest border border-amber-100 shadow-sm cursor-default">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Awaiting QC
                                                    </div>
                                                ) : (
                                                    <span className="text-secondary-300 text-[9px] uppercase font-black tracking-widest">
                                                        Logged
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Descriptive Extras */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-secondary-200 shadow-sm border-l-8 border-l-primary-500 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                                <Info className="w-32 h-32" />
                            </div>
                            <Label className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-4 block">General Receipt Remarks</Label>
                            <p className="text-sm text-secondary-700 leading-relaxed font-bold italic bg-secondary-50/50 p-6 rounded-2xl border border-secondary-100 min-h-[100px] shadow-inner">
                                &quot;{inward.remarks || "No specific instructions provided for this inward batch entry."}&quot;
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-3xl border border-secondary-200 shadow-sm">
                            <Label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-6 block border-b border-secondary-100 pb-2">Audit Trace & System Logs</Label>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:text-primary-500 transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Created By</span>
                                    </div>
                                    <span className="text-sm font-black text-secondary-900 bg-secondary-50 px-3 py-1 rounded-lg border border-secondary-100">{inward.creatorName}</span>
                                </div>
                                <div className="flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:text-amber-500 transition-colors">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">System Timestamp</span>
                                    </div>
                                    <span className="text-[11px] font-black text-secondary-900 tabular-nums">{format(new Date(inward.createdAt || inward.inwardDate), "dd MMM yyyy, HH:mm:ss")}</span>
                                </div>
                                <div className="flex justify-between items-center group pt-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-400">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-bold text-secondary-500 uppercase tracking-wider">Audit Status</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100">Verified System Entry</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

const ShieldCheck = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);
