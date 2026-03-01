"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ClipboardCheck, ChevronRight, Minus, Edit2, CheckCircle2, Ban, Eye } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import api from "@/lib/api";
import { QC, QcStatus, InwardSourceType } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { format } from "date-fns";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { QualityControlDialog } from "@/components/quality-control/quality-control-dialog";
import { QCReviewDialog } from "@/components/quality-control/qc-review-dialog";
import { QCFilters } from "@/components/filters/qc-filters";
import { initialQCFilters, buildQCFilterParams, QCFiltersState } from "@/lib/qc-filters";
import { toast } from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";

export default function QualityControlPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<QCFiltersState>(initialQCFilters);
    const [expandedQcId, setExpandedQcId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQc, setEditingQc] = useState<QC | null>(null);
    const [reviewQc, setReviewQc] = useState<QC | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<QC | null>(null);
    const [activeTarget, setActiveTarget] = useState<QC | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);

    const queryParams = useMemo(() => {
        const p = buildQCFilterParams({ ...filters, search: debouncedSearch });
        const params = new URLSearchParams();
        Object.entries(p).forEach(([k, v]) => {
            if (v === undefined || v === "") return;
            if (Array.isArray(v)) v.forEach((x) => params.append(k, String(x)));
            else params.set(k, String(v));
        });
        return params;
    }, [filters, debouncedSearch]);

    const { data: qcs = [], isLoading } = useQuery<QC[]>({
        queryKey: ["quality-control", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/quality-control?" + queryParams.toString());
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewQC,
    });

    const { data: parties = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data ?? [];
        },
    });

    const partyOptions = useMemo(
        () => parties.map((p) => ({ label: p.name, value: p.id })),
        [parties]
    );

    const setInactiveMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/quality-control/${id}/inactive`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            toast.success("QC entry deactivated");
            setInactiveTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Deactivate failed"),
    });

    const setActiveMutation = useMutation({
        mutationFn: (id: number) => api.patch(`/quality-control/${id}/active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control"] });
            toast.success("QC entry activated");
            setActiveTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Activate failed"),
    });

    const resetFilters = useCallback(() => setFilters(initialQCFilters), []);

    /** Normalize sourceType from API (number or string) to display label. */
    const getSourceTypeLabel = (sourceType: InwardSourceType | string | number): string => {
        const n =
            typeof sourceType === "number"
                ? sourceType
                : typeof sourceType === "string"
                    ? (sourceType === "PO" ? 0 : sourceType === "JobWork" ? 2 : -1)
                    : -1;
        switch (n) {
            case 0:
                return "Purchase Order";
            case 2:
                return "Job Work";
            default:
                return "—";
        }
    };

    if (permissions && !permissions.viewQC) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ClipboardCheck className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don&apos;t have permission to view quality control entries.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Quality Control</h1>
                    <p className="text-secondary-500 text-sm tracking-tight font-medium">Inspect and approve inward items before stock</p>
                </div>
                {permissions?.createQC && (
                    <Button
                        onClick={() => {
                            setEditingQc(null);
                            setDialogOpen(true);
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New QC Entry
                    </Button>
                )}
            </div>

            <QCFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClear={resetFilters}
                partyOptions={partyOptions}
                className="shrink-0"
            />

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900 hover:bg-primary-100">
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">QC NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">QC DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">PARTY NAME</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">SOURCE TYPE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">ACTIVE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right whitespace-nowrap">CREATED BY</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={9} className="h-16 px-6 text-center">
                                            <div className="h-4 bg-secondary-100 rounded-full w-full max-w-sm mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : qcs.length > 0 ? (
                                qcs.map((q, idx) => (
                                    <Fragment key={q.id}>
                                        <TableRow
                                            className={cn(
                                                "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                                                expandedQcId === q.id && "bg-primary-50/30",
                                                !q.isActive && "bg-secondary-50/50 opacity-75"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedQcId(expandedQcId === q.id ? null : q.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500 hover:bg-white border border-transparent hover:border-secondary-200 rounded"
                                                >
                                                    {expandedQcId === q.id ? <Minus className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{idx + 1}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-sm">{q.qcNo}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">{format(new Date(q.createdAt), "dd MMM yyyy")}</td>
                                            <td className="px-4 py-3 font-medium text-secondary-800 text-sm">{q.partyName ?? "—"}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">{getSourceTypeLabel(q.sourceType)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={cn(
                                                        "inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                                                        q.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                    )}
                                                >
                                                    {q.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm">{q.creatorName ?? "System"}</td>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {q.isActive !== false && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setReviewQc(q)}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Review / Approve items"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    {permissions?.editQC && q.status === QcStatus.Pending && q.isActive !== false && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingQc(q);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Edit QC"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (q.isActive) setInactiveTarget(q);
                                                            else setActiveTarget(q);
                                                        }}
                                                        disabled={q.status === QcStatus.Approved}
                                                        className={cn(
                                                            "h-8 w-8 p-0 border border-transparent rounded-lg transition-all",
                                                            q.status === QcStatus.Approved && "opacity-30 cursor-not-allowed",
                                                            q.isActive ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                        )}
                                                        title={q.status === QcStatus.Approved ? "Cannot deactivate approved entry" : q.isActive ? "Deactivate" : "Activate"}
                                                    >
                                                        {q.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedQcId === q.id && (
                                                <TableRow key={`expand-${q.id}`} className="bg-secondary-50/10 border-b border-secondary-100 border-t-0 p-0 hover:bg-secondary-50/10">
                                                    <td colSpan={9} className="p-0 border-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider px-4 py-2 border-b border-secondary-100">Items</p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider w-12 text-center">SR.NO</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">SOURCE REF</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM DESCRIPTION</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM TYPE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">DRAWING NO. / REV</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">INWARD NO.</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center w-24">QC STATUS</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {q.items?.map((it, lidx) => (
                                                                                <TableRow key={it.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30">
                                                                                    <TableCell className="px-4 py-2 text-secondary-500 font-medium text-sm text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm whitespace-nowrap">{it.sourceRefDisplay || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-semibold text-secondary-900 text-sm">{it.currentName ?? "—"}</span>
                                                                                            <span className="text-xs text-secondary-500">{it.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 text-sm font-medium">{it.itemTypeName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-medium text-secondary-800 text-sm truncate">{it.drawingNo ?? "N/A"}</span>
                                                                                            <span className="text-xs text-secondary-500">R{it.revisionNo ?? "0"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm">{it.inwardNo || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-center whitespace-nowrap">
                                                                                        {it.isApproved === true ? (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">Approved</span>
                                                                                        ) : it.isApproved === false ? (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">Rejected</span>
                                                                                        ) : (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </TableRow>
                                            )}
                                        </AnimatePresence>
                                    </Fragment>
                                ))
                            ) : (
                                <TableRow>
                                    <td colSpan={9} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-secondary-50 rounded-2xl flex items-center justify-center text-secondary-200">
                                                <ClipboardCheck className="w-6 h-6" />
                                            </div>
                                            <p className="text-secondary-400 font-bold text-sm uppercase tracking-widest">No QC entries found</p>
                                        </div>
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <QualityControlDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingQc(null);
                }}
                qc={editingQc ?? undefined}
            />

            {reviewQc && (
                <QCReviewDialog open={!!reviewQc} onOpenChange={(open) => !open && setReviewQc(null)} qc={reviewQc} />
            )}

            <Dialog isOpen={!!inactiveTarget} onClose={() => setInactiveTarget(null)} title="Confirm Deactivation" size="sm">
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600 font-medium">
                        Deactivate QC entry <span className="font-bold text-secondary-900">{inactiveTarget?.qcNo}</span>? Approved entries cannot be deactivated.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={() => inactiveTarget && setInactiveMutation.mutate(inactiveTarget.id)}
                            disabled={setInactiveMutation.isPending || inactiveTarget?.status === QcStatus.Approved}
                        >
                            {setInactiveMutation.isPending ? "Deactivating..." : "Deactivate"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog isOpen={!!activeTarget} onClose={() => setActiveTarget(null)} title="Confirm Activation" size="sm">
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600 font-medium">
                        Activate QC entry <span className="font-bold text-secondary-900">{activeTarget?.qcNo}</span>?
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setActiveTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                            onClick={() => activeTarget && setActiveMutation.mutate(activeTarget.id)}
                            disabled={setActiveMutation.isPending}
                        >
                            {setActiveMutation.isPending ? "Activating..." : "Activate"}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
