"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ClipboardCheck, Search, ShieldAlert,
    Package, Clock, CheckCircle, XCircle,
    ArrowDownLeft, RotateCcw, Loader2, MoreVertical
} from "lucide-react";
import api from "@/lib/api";
import { Movement, MovementType, InwardSourceType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

const SOURCE_TABS: { value: "" | InwardSourceType; label: string }[] = [
    { value: "", label: "All" },
    { value: InwardSourceType.PO, label: "PO" },
    { value: InwardSourceType.OutwardReturn, label: "Outward Return" },
    { value: InwardSourceType.JobWork, label: "Job Work" },
];

export default function QualityControlPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");
    const [sourceTab, setSourceTab] = useState<"" | InwardSourceType>("");
    const [approveTarget, setApproveTarget] = useState<Movement | null>(null);
    const [rejectTarget, setRejectTarget] = useState<Movement | null>(null);
    const [remarks, setRemarks] = useState("");
    const queryClient = useQueryClient();

    if (permissions && !permissions.viewQC) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don't have the required clearance to view quality certifications.</p>
                </div>
            </div>
        );
    }

    const { data: pending = [], isLoading } = useQuery<Movement[]>({
        queryKey: ["quality-control", "pending", sourceTab],
        queryFn: async () => {
            const params = sourceTab !== "" ? `?sourceType=${sourceTab}` : "";
            const res = await api.get("/quality-control/pending" + params);
            return res.data.data;
        },
    });

    const performMutation = useMutation({
        mutationFn: (data: { movementId: number; isApproved: boolean; remarks: string }) =>
            api.post("/quality-control/perform", data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["quality-control", "pending"] });
            queryClient.invalidateQueries({ queryKey: ["movements"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success(variables.isApproved ? "QC approved and item released" : "QC rejected");
            setApproveTarget(null);
            setRejectTarget(null);
            setRemarks("");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Execution failed")
    });

    const filteredPending = pending.filter(m =>
        (m.itemName ?? m.item?.currentName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.toName ?? m.toLocation?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.inwardNo ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.sourceRefDisplay ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Quality Certification</h1>
                    <p className="text-secondary-500 text-sm">Verify material integrity for incoming components</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-secondary-200 shadow-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-bold text-secondary-900">{pending.length} Pending Inspection</span>
                </div>
            </div>

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {SOURCE_TABS.map((tab) => (
                            <Button
                                key={tab.value === "" ? "all" : tab.value}
                                variant={sourceTab === tab.value ? "default" : "ghost"}
                                size="sm"
                                className={sourceTab === tab.value ? "bg-primary-600 text-white font-bold" : "text-secondary-600 hover:text-primary-600 font-bold"}
                                onClick={() => setSourceTab(tab.value)}
                            >
                                {tab.label}
                            </Button>
                        ))}
                    </div>
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by item, location, Inward No, Ref..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary-500 hover:text-primary-600 font-bold text-xs uppercase tracking-wider"
                        onClick={() => setSearch("")}
                    >
                        Clear Filter
                    </Button>
                </div>

                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <TableHead className="w-16 h-11 text-center font-bold text-primary-900 uppercase tracking-tight text-[11px]">Sr.No</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Source / Ref</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Entry Type</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Component Unit</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Quarantine Zone</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Arrival Log</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px] text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={7} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredPending.length > 0 ? (
                                filteredPending.map((m, idx) => (
                                    <TableRow
                                        key={m.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans whitespace-nowrap"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-primary-600 text-[11px] uppercase">{m.inwardNo ?? "—"}</span>
                                                <span className="text-[10px] text-secondary-500 font-bold uppercase">{m.sourceRefDisplay ?? "—"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-8 w-8 rounded bg-white border border-secondary-200 flex items-center justify-center ${m.type === MovementType.Inward ? "text-emerald-600" : "text-amber-600"}`}>
                                                    {m.type === MovementType.Inward ? <ArrowDownLeft className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                                </div>
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{m.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-secondary-900 text-[11px] uppercase leading-tight">{m.itemName ?? m.item?.currentName}</p>
                                                    <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight italic">{m.mainPartName ?? m.item?.mainPartName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 font-bold text-secondary-700 text-[11px] uppercase">
                                                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                                {m.toName ?? m.toLocation?.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-secondary-900 capitalize">{format(new Date(m.createdAt), "dd MMM yyyy")}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{format(new Date(m.createdAt), "hh:mm a")}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {(permissions?.createQC || permissions?.approveQC) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-all"
                                                            title="Approve or Reject"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="min-w-[11rem] py-1">
                                                        {permissions?.approveQC && (
                                                            <DropdownMenuItem
                                                                onClick={() => setApproveTarget(m)}
                                                                className="flex items-center gap-2 cursor-pointer py-2"
                                                            >
                                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                                                <span>Approve</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            onClick={() => setRejectTarget(m)}
                                                            className="flex items-center gap-2 cursor-pointer py-2"
                                                        >
                                                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                                            <span>Reject</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </td>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <td colSpan={7} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No items awaiting quality certification.
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Approve QC Confirm Dialog */}
            <Dialog isOpen={!!approveTarget} onClose={() => setApproveTarget(null)} title="Approve QC" size="sm">
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Approve QC and release <span className="font-bold text-secondary-900">{approveTarget?.itemName ?? approveTarget?.item?.currentName ?? "this item"}</span> to stock?
                    </p>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-secondary-600">Remarks (optional)</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="min-h-[80px] border-secondary-200 text-sm"
                            placeholder="Inspection notes..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setApproveTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                            onClick={() => approveTarget && performMutation.mutate({ movementId: approveTarget.id, isApproved: true, remarks })}
                            disabled={performMutation.isPending}
                        >
                            {performMutation.isPending ? "Processing..." : "Confirm Approve"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Reject QC Confirm Dialog */}
            <Dialog isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject QC" size="sm">
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Reject QC for <span className="font-bold text-secondary-900">{rejectTarget?.itemName ?? rejectTarget?.item?.currentName ?? "this item"}</span>?
                    </p>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-secondary-600">Remarks (optional)</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="min-h-[80px] border-secondary-200 text-sm"
                            placeholder="Reason for rejection..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setRejectTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                            onClick={() => rejectTarget && performMutation.mutate({ movementId: rejectTarget.id, isApproved: false, remarks })}
                            disabled={performMutation.isPending}
                        >
                            {performMutation.isPending ? "Processing..." : "Confirm Reject"}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
