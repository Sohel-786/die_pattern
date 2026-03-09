"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { QC, QcStatus } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        onMutate: (variables) => {
            // Optimistic update — immediately reflect the decision in UI before server responds
            setStatusMap((prev) => ({ ...prev, [variables.qcItemId]: variables.isApproved }));
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            if (variables.isApproved !== undefined) {
                toast.success(variables.isApproved ? "Item approved ✓" : "Item rejected ✗");
            } else {
                toast.success("Note updated");
            }
        },
        onError: (err: any, variables) => {
            // Rollback optimistic update on error
            setStatusMap((prev) => ({ ...prev, [variables.qcItemId]: null }));
            toast.error(err.response?.data?.message || "Update failed");
        },
    });

    const approveEntryMutation = useMutation({
        mutationFn: () => api.post(`/quality-control/${qc.id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
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
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            toast.success("QC entry rejected. Items are back in stock.");
            onOpenChange(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed"),
    });

    const handleItemDecision = (itId: number, approved: boolean) => {
        if (isReadOnly) return;
        approveItemMutation.mutate({
            qcItemId: itId,
            isApproved: approved,
            remarks: remarksMap[itId] || "",
        });
    };

    const handleUpdateNote = (itId: number) => {
        if (isReadOnly) return;
        const currentStatus = statusMap[itId];
        if (currentStatus === null || currentStatus === undefined) return;

        approveItemMutation.mutate({
            qcItemId: itId,
            isApproved: currentStatus,
            remarks: remarksMap[itId] || "",
        });
    };

    const handleApproveEntry = () => {
        const allResolved = qc.items.every((it) => statusMap[it.id] !== null && statusMap[it.id] !== undefined);
        if (!allResolved) {
            return toast.error("Resolve all items (Approve or Reject) before approving the entry.");
        }
        approveEntryMutation.mutate();
    };

    const handleRejectEntry = () => {
        if (isReadOnly) return;
        if (window.confirm("Are you sure you want to reject the entire QC entry? This will mark all items as rejected and return them to stock.")) {
            rejectEntryMutation.mutate(rejectEntryRemark || undefined);
        }
    };

    const isReadOnly = qc.status !== QcStatus.Pending;
    const allItemsResolved = qc.items.length > 0 && qc.items.every((it) => statusMap[it.id] !== null && statusMap[it.id] !== undefined);
    const someItemsResolved = qc.items.some((it) => statusMap[it.id] !== null && statusMap[it.id] !== undefined);

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
                {/* Header Summary */}
                <div className="px-6 py-4 bg-secondary-50/50 border-b border-secondary-100 flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Party Name</span>
                        <span className="text-sm font-semibold text-secondary-900">{qc.partyName}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col items-center px-3 border-r border-secondary-200">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Approved</span>
                            <span className="text-sm font-bold text-emerald-600">{qc.items.filter((it) => statusMap[it.id] === true).length}</span>
                        </div>
                        <div className="flex flex-col items-center px-3 border-r border-secondary-200">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Rejected</span>
                            <span className="text-sm font-bold text-rose-600">{qc.items.filter((it) => statusMap[it.id] === false).length}</span>
                        </div>
                        <div className="flex flex-col items-center px-3">
                            <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest leading-none mb-1">Pending</span>
                            <span className="text-sm font-bold text-amber-500">
                                {qc.items.filter((it) => statusMap[it.id] === null || statusMap[it.id] === undefined).length}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bulk Action Bar Removed - replaced by individual item decisions + Finalize button */}


                {/* Items Table */}
                <div className="p-5 overflow-hidden min-h-0 flex-1">
                    <div className={cn(
                        "border border-secondary-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col",
                        qc.items.length > 5 ? "max-h-[450px]" : ""
                    )}>
                        <div className="overflow-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 text-[10px] font-bold text-secondary-600 uppercase tracking-wider z-20">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Item Details</th>
                                        <th className="px-4 py-3">Source & Inward</th>
                                        <th className="px-4 py-3 text-center w-60">Decision</th>
                                        <th className="px-4 py-3 min-w-[180px]">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 bg-white">
                                    {qc.items.map((it, idx) => {
                                        const isApproved = statusMap[it.id] === true;
                                        const isRejected = statusMap[it.id] === false;
                                        const isPending = !isApproved && !isRejected;
                                        const isMutating = approveItemMutation.isPending && approveItemMutation.variables?.qcItemId === it.id;

                                        return (
                                            <tr
                                                key={it.id}
                                                className={cn(
                                                    "transition-all duration-200",
                                                    isApproved && "bg-emerald-50/50",
                                                    isRejected && "bg-rose-50/50",
                                                    isPending && "hover:bg-secondary-50/40"
                                                )}
                                            >
                                                <td className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900 text-sm leading-tight">{it.currentName}</span>
                                                        <span className="text-xs text-secondary-500">{it.mainPartName || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-[11px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 w-fit">{it.inwardNo}</span>
                                                        <span className="text-[10px] text-secondary-500 font-bold uppercase tracking-tight">{it.sourceRefDisplay || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isReadOnly ? (
                                                        /* View-only status pill */
                                                        <div className="flex justify-center">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border",
                                                                isApproved && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                                isRejected && "bg-rose-50 text-rose-700 border-rose-200",
                                                                isPending && "bg-amber-50 text-amber-700 border-amber-200"
                                                            )}>
                                                                <span className={cn("w-1.5 h-1.5 rounded-full", isApproved && "bg-emerald-500", isRejected && "bg-rose-500", isPending && "bg-amber-400 animate-pulse")} />
                                                                {isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
                                                            </span>
                                                        </div>
                                                    ) : isApproved ? (
                                                        /* Decided: Approved — show solid badge + subtle change button */
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase border bg-emerald-600 text-white border-emerald-600 shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3" /> Approved
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemDecision(it.id, false)}
                                                                disabled={isMutating}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase border-secondary-200 text-secondary-400 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-40"
                                                                title="Change to Reject"
                                                            >
                                                                {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                                                Reject
                                                            </button>
                                                        </div>
                                                    ) : isRejected ? (
                                                        /* Decided: Rejected — show solid badge + subtle change button */
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase border bg-rose-600 text-white border-rose-600 shadow-sm">
                                                                <XCircle className="w-3 h-3" /> Rejected
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemDecision(it.id, true)}
                                                                disabled={isMutating}
                                                                className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold uppercase border-secondary-200 text-secondary-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-40"
                                                                title="Change to Approve"
                                                            >
                                                                {isMutating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                                                Approve
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        /* Undecided — action buttons */
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemDecision(it.id, true)}
                                                                disabled={isMutating}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all bg-white border-secondary-200 text-secondary-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm disabled:opacity-40"
                                                            >
                                                                {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemDecision(it.id, false)}
                                                                disabled={isMutating}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all bg-white border-secondary-200 text-secondary-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 shadow-sm disabled:opacity-40"
                                                            >
                                                                {isMutating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={remarksMap[it.id] || ""}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemarksMap((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                                            placeholder="Inspection notes..."
                                                            disabled={isReadOnly}
                                                            className="h-8 text-[11px] border-secondary-200 focus:ring-primary-500 bg-transparent hover:bg-white transition-colors flex-1"
                                                        />
                                                        {!isReadOnly && statusMap[it.id] !== null && remarksMap[it.id] !== (it.remarks || "") && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleUpdateNote(it.id)}
                                                                disabled={approveItemMutation.isPending}
                                                                className="h-7 px-2 text-[9px] bg-secondary-100 hover:bg-secondary-200 text-secondary-600 border-none font-bold"
                                                            >
                                                                Save Note
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-secondary-50/50 border-t border-secondary-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2">
                        {!isReadOnly && !allItemsResolved && someItemsResolved && (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 animate-pulse">
                                Resolve all items to enable finalization
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {!isReadOnly && (
                            <Button
                                onClick={handleApproveEntry}
                                disabled={!allItemsResolved || approveEntryMutation.isPending}
                                className="h-9 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-tight text-[11px] gap-2 shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all active:scale-[0.98]"
                            >
                                {approveEntryMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Finalize QC Inspection
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            className="h-9 px-8 font-bold border-secondary-300 bg-white text-secondary-700 hover:bg-secondary-50 transition-all rounded-lg text-[11px] uppercase tracking-wider"
                        >
                            Close Review
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
