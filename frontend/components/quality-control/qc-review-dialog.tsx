"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { QC, QcStatus, InwardSourceType } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface QCReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    qc: QC;
}

export function QCReviewDialog({ open, onOpenChange, qc }: QCReviewDialogProps) {
    const queryClient = useQueryClient();
    const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
    const [statusMap, setStatusMap] = useState<Record<number, boolean | null>>({});
    const [rejectEntryRemark, setRejectEntryRemark] = useState("");

    useEffect(() => {
        if (open && qc) {
            const remarks: Record<number, string> = {};
            const status: Record<number, boolean | null> = {};
            qc.items.forEach((it) => {
                remarks[it.id] = it.remarks || "";
                status[it.id] = it.isApproved ?? null;
            });
            setRemarksMap(remarks);
            setStatusMap(status);
            setRejectEntryRemark("");
        }
    }, [open, qc]);

    const approveItemMutation = useMutation({
        mutationFn: (data: { qcItemId: number; isApproved: boolean; remarks: string }) =>
            api.post(`/quality-control/${qc.id}/approve-item`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Item status updated");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed"),
    });

    const approveEntryMutation = useMutation({
        mutationFn: () => api.post(`/quality-control/${qc.id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            toast.success("QC entry approved. Approved items moved to stock.");
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed"),
    });

    const rejectEntryMutation = useMutation({
        mutationFn: (remarks?: string) =>
            api.post(`/quality-control/${qc.id}/reject`, remarks != null ? { remarks } : {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("QC entry rejected. Items are back in stock.");
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed"),
    });

    const handleItemToggle = (itId: number, approved: boolean) => {
        setStatusMap((prev) => ({ ...prev, [itId]: approved }));
        approveItemMutation.mutate({
            qcItemId: itId,
            isApproved: approved,
            remarks: remarksMap[itId] || "",
        });
    };

    const handleApproveEntry = () => {
        const allResolved = qc.items.every((it) => statusMap[it.id] !== null);
        if (!allResolved) {
            return toast.error("Resolve all items (Approve or Reject) before approving the entry.");
        }
        approveEntryMutation.mutate();
    };

    const handleRejectEntry = () => {
        rejectEntryMutation.mutate(rejectEntryRemark || undefined);
    };

    const isReadOnly = qc.status !== QcStatus.Pending;
    const anyItemResolved = qc.items.some((it) => statusMap[it.id] !== null);
    const allItemsResolved = qc.items.length > 0 && qc.items.every((it) => statusMap[it.id] !== null);

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title={`Review QC — ${qc.qcNo}`}
            size="2xl"
            overlayClassName="z-[1100]"
            contentScroll={false}
        >
            <div className="flex flex-col font-sans h-full">
                {/* Information Header Section */}
                <div className="px-6 py-4 bg-secondary-50/50 border-b border-secondary-100 flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Party Name</span>
                        <span className="text-sm font-semibold text-secondary-900">{qc.partyName}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col items-center px-3 border-r border-secondary-200">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Approved</span>
                            <span className="text-sm font-bold text-green-600">{qc.items.filter((it) => statusMap[it.id] === true).length}</span>
                        </div>
                        <div className="flex flex-col items-center px-3 border-r border-secondary-200">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Rejected</span>
                            <span className="text-sm font-bold text-rose-600">{qc.items.filter((it) => statusMap[it.id] === false).length}</span>
                        </div>
                        <div className="flex flex-col items-center px-3">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Pending</span>
                            <span className="text-sm font-bold text-amber-600">{qc.items.filter((it) => statusMap[it.id] === null).length}</span>
                        </div>
                    </div>
                </div>

                {/* Bulk Action Section */}
                {!isReadOnly && (
                    <div className="px-6 py-4 bg-white border-b border-secondary-100 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleApproveEntry}
                                    disabled={anyItemResolved || approveEntryMutation.isPending || !allItemsResolved}
                                    className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tight text-[11px] gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-40 whitespace-nowrap transition-all active:scale-[0.98]"
                                >
                                    {approveEntryMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    Approve Entire QC
                                </Button>

                                <div className="h-8 w-[1px] bg-secondary-200 mx-1" />

                                <div className="flex items-center gap-2 max-w-xl w-full">
                                    <Input
                                        value={rejectEntryRemark}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRejectEntryRemark(e.target.value)}
                                        placeholder="Add rejection remark for entire entry..."
                                        className="h-10 text-xs border-secondary-200 focus:ring-rose-500 bg-secondary-50/20"
                                    />
                                    <Button
                                        onClick={handleRejectEntry}
                                        disabled={anyItemResolved || rejectEntryMutation.isPending}
                                        className="h-10 px-6 bg-white border-2 border-rose-500 text-rose-600 hover:bg-rose-50 font-black uppercase tracking-tight text-[11px] gap-2 disabled:opacity-40 shrink-0 whitespace-nowrap transition-all active:scale-[0.98]"
                                    >
                                        {rejectEntryMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5" />
                                        )}
                                        Reject Entire QC
                                    </Button>
                                </div>
                            </div>

                            {anyItemResolved && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                                    <span className="text-[10px] text-amber-700 font-bold uppercase flex items-center gap-1">
                                        Note: Use item-level actions below
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Main Table Content - Scrollable if > 5 items */}
                <div className="p-6 overflow-hidden min-h-0">
                    <div className={cn(
                        "border border-secondary-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col",
                        qc.items.length > 5 ? "max-h-[450px]" : ""
                    )}>
                        <div className="overflow-auto scroll-smooth">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 text-[10px] font-bold text-secondary-600 uppercase tracking-wider z-20">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Item Details</th>
                                        <th className="px-4 py-3">Source & Inward</th>
                                        <th className="px-4 py-3 text-center w-56">Approve / Reject</th>
                                        <th className="px-4 py-3 w-64">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {qc.items.map((it, idx) => {
                                        const isItemApproved = statusMap[it.id] === true;
                                        const isItemRejected = statusMap[it.id] === false;

                                        return (
                                            <tr
                                                key={it.id}
                                                className={cn(
                                                    "transition-colors group",
                                                    isItemApproved && "bg-green-50/50",
                                                    isItemRejected && "bg-rose-50/50",
                                                    !isItemApproved && !isItemRejected && "hover:bg-secondary-50/50"
                                                )}
                                            >
                                                <td className="px-4 py-3 text-secondary-400 font-medium text-center">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-secondary-900 leading-tight">{it.currentName}</span>
                                                        <span className="text-xs text-secondary-500 font-medium">{it.mainPartName || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 w-fit">
                                                            {it.inwardNo}
                                                        </span>
                                                        <span className="text-[10px] text-secondary-500 font-bold uppercase tracking-tight pl-1">
                                                            {it.sourceRefDisplay || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isReadOnly ? (
                                                        <div className="flex justify-center">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                                    isItemApproved && "bg-green-50 text-green-700 border-green-200",
                                                                    isItemRejected && "bg-rose-50 text-rose-700 border-rose-200",
                                                                    statusMap[it.id] === null && "bg-amber-50 text-amber-700 border border-amber-200"
                                                                )}
                                                            >
                                                                {isItemApproved ? "Approved" : isItemRejected ? "Rejected" : "Pending"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemToggle(it.id, true)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all shadow-sm",
                                                                    isItemApproved
                                                                        ? "bg-green-600 border-green-600 text-white shadow-green-200"
                                                                        : "bg-white border-secondary-200 text-secondary-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                                                                )}
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemToggle(it.id, false)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all shadow-sm",
                                                                    isItemRejected
                                                                        ? "bg-rose-600 border-rose-600 text-white shadow-rose-200"
                                                                        : "bg-white border-secondary-200 text-secondary-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                                                                )}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input
                                                        value={remarksMap[it.id] || ""}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarksMap((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                                        onBlur={() => {
                                                            if (statusMap[it.id] !== null) {
                                                                approveItemMutation.mutate({
                                                                    qcItemId: it.id,
                                                                    isApproved: statusMap[it.id] as boolean,
                                                                    remarks: remarksMap[it.id] || "",
                                                                });
                                                            }
                                                        }}
                                                        placeholder="Add inspection notes..."
                                                        disabled={isReadOnly}
                                                        className="h-8 text-[11px] border-secondary-200 focus:ring-primary-500 bg-transparent group-hover:bg-white transition-colors"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-secondary-50/50 border-t border-secondary-200 flex justify-end items-center shrink-0">
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        className="h-10 px-8 font-bold border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-all rounded-lg"
                    >
                        Close Review
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
