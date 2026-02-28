"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { QC, QcStatus } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
            size="full"
            overlayClassName="z-[1100]"
        >
            <div className="flex flex-col h-[85vh] max-h-[900px] font-sans">
                <div className="p-6 bg-secondary-50/50 border-b border-secondary-200 shrink-0 space-y-4">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-bold text-secondary-900">{qc.qcNo}</p>
                            <p className="text-xs text-secondary-500">Party: {qc.partyName}</p>
                        </div>
                        <div className="text-right text-sm font-medium text-secondary-600">
                            {qc.items.filter((it) => statusMap[it.id] === true).length} approved,{" "}
                            {qc.items.filter((it) => statusMap[it.id] === false).length} rejected,{" "}
                            {qc.items.filter((it) => statusMap[it.id] === null).length} pending
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-secondary-200">
                            <Button
                                onClick={handleApproveEntry}
                                disabled={anyItemResolved || approveEntryMutation.isPending || !allItemsResolved}
                                className="h-9 px-5 bg-green-600 hover:bg-green-700 text-white font-semibold gap-2 disabled:opacity-50"
                            >
                                {approveEntryMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Approve entire QC entry
                            </Button>
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <Textarea
                                    value={rejectEntryRemark}
                                    onChange={(e) => setRejectEntryRemark(e.target.value)}
                                    placeholder="Rejection remark (optional)"
                                    className="min-h-[36px] text-xs border-secondary-200 resize-none flex-1 max-w-md"
                                />
                                <Button
                                    onClick={handleRejectEntry}
                                    disabled={anyItemResolved || rejectEntryMutation.isPending}
                                    variant="outline"
                                    className="h-9 px-5 border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold gap-2 disabled:opacity-50 shrink-0"
                                >
                                    {rejectEntryMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <XCircle className="w-4 h-4" />
                                    )}
                                    Reject entire QC entry
                                </Button>
                            </div>
                            {anyItemResolved && (
                                <p className="text-[11px] text-amber-600 font-medium w-full">
                                    One or more items are already resolved. Use item-level Approve/Reject only.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-6 min-h-0">
                    <div className="flex-1 border border-secondary-200 rounded-xl overflow-hidden bg-white">
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 text-[10px] font-bold text-secondary-600 uppercase tracking-wider z-10">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-4 py-3">Item</th>
                                        <th className="px-4 py-3">Inward No. / Source</th>
                                        <th className="px-4 py-3 text-center w-48">Approve / Reject</th>
                                        <th className="px-4 py-3">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {qc.items.map((it, idx) => {
                                        const isItemApproved = statusMap[it.id] === true;
                                        const isItemRejected = statusMap[it.id] === false;

                                        return (
                                            <tr
                                                key={it.id}
                                                className={cn(
                                                    "transition-colors",
                                                    isItemApproved && "bg-green-50/30",
                                                    isItemRejected && "bg-rose-50/30"
                                                )}
                                            >
                                                <td className="px-4 py-3 text-secondary-500 text-center">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-secondary-900">{it.currentName}</span>
                                                        <span className="text-xs text-secondary-500">{it.mainPartName || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-primary-700 text-xs">{it.inwardNo}</span>
                                                        <span className="text-xs text-secondary-500">{it.sourceRefDisplay || "—"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isReadOnly ? (
                                                        <span
                                                            className={cn(
                                                                "inline-flex px-2 py-1 rounded-full text-[10px] font-semibold uppercase",
                                                                isItemApproved && "bg-green-50 text-green-700 border border-green-200",
                                                                isItemRejected && "bg-rose-50 text-rose-700 border border-rose-200",
                                                                statusMap[it.id] === null && "bg-amber-50 text-amber-700 border border-amber-200"
                                                            )}
                                                        >
                                                            {isItemApproved ? "Approved" : isItemRejected ? "Rejected" : "Pending"}
                                                        </span>
                                                    ) : (
                                                        <div className="flex gap-2 justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemToggle(it.id, true)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                                                                    isItemApproved
                                                                        ? "bg-green-600 border-green-600 text-white"
                                                                        : "bg-white border-secondary-200 text-secondary-600 hover:border-green-300 hover:bg-green-50"
                                                                )}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleItemToggle(it.id, false)}
                                                                className={cn(
                                                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                                                                    isItemRejected
                                                                        ? "bg-rose-600 border-rose-600 text-white"
                                                                        : "bg-white border-secondary-200 text-secondary-600 hover:border-rose-300 hover:bg-rose-50"
                                                                )}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Textarea
                                                        value={remarksMap[it.id] || ""}
                                                        onChange={(e) => setRemarksMap((prev) => ({ ...prev, [it.id]: e.target.value }))}
                                                        onBlur={() => {
                                                            if (statusMap[it.id] !== null) {
                                                                approveItemMutation.mutate({
                                                                    qcItemId: it.id,
                                                                    isApproved: statusMap[it.id] as boolean,
                                                                    remarks: remarksMap[it.id] || "",
                                                                });
                                                            }
                                                        }}
                                                        placeholder="Item remarks..."
                                                        disabled={isReadOnly}
                                                        className="text-xs min-h-[44px] border-secondary-200 resize-none"
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

                <div className="p-6 bg-white border-t border-secondary-200 flex justify-between items-center shrink-0">
                    <p className="text-xs text-secondary-500">
                        Resolve each item with Approve or Reject. Once any item is resolved, full-entry Approve/Reject are disabled; use item-level actions only.
                    </p>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                        Close
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
