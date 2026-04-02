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
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/ui/access-denied";
import { Role } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { QualityControlDialog } from "@/components/quality-control/quality-control-dialog";
import { QCReviewDialog } from "@/components/quality-control/qc-review-dialog";
import { QCFilters } from "@/components/filters/qc-filters";
import { initialQCFilters, buildQCFilterParams, QCFiltersState } from "@/lib/qc-filters";
import { toast } from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { TablePagination } from "@/components/ui/table-pagination";

export default function QualityControlPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<QCFiltersState>(initialQCFilters);
    const [expandedQcId, setExpandedQcId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingQc, setEditingQc] = useState<QC | null>(null);
    const [reviewQc, setReviewQc] = useState<QC | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<QC | null>(null);
    const [activeTarget, setActiveTarget] = useState<QC | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);

    const queryParams = useMemo(() =>
        buildQCFilterParams({ ...filters, search: debouncedSearch }),
        [filters, debouncedSearch]
    );

    const { data: qcData, isLoading } = useQuery<{ list: QC[]; totalCount: number }>({
        queryKey: ["quality-control", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/quality-control?" + queryParams.toString());
            return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
        },
        enabled: !!permissions?.viewQC,
    });
    const qcs = qcData?.list ?? [];
    const totalCount = qcData?.totalCount ?? 0;

    const { data: parties = [] } = useQuery<{ id: number; name: string }[]>({
        queryKey: ["parties", "active"],
        queryFn: async () => {
            const res = await api.get("/parties/active");
            return res.data.data ?? [];
        },
    });

    const { data: locationUsers = [] } = useQuery<any[]>({
        queryKey: ["location-users"],
        queryFn: async () => {
            const res = await api.get("/users/location-users");
            return res.data.data ?? [];
        }
    });

    const creatorOptions = useMemo(() =>
        locationUsers.map(u => ({ label: `${u.firstName} ${u.lastName}`, value: u.id })),
        [locationUsers]);

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

    const resetFilters = useCallback(() => {
        setFilters((prev) => ({ ...initialQCFilters, pageSize: prev.pageSize, page: 1 }));
    }, []);

    // Prefer a real time value when available; fall back sensibly.
    const getInwardDateForDisplay = (item: any): string | null => {
        const inward = item?.inwardDate ? new Date(item.inwardDate) : null;
        const source = item?.sourceDate ? new Date(item.sourceDate) : null;

        // If inwardDate has a non‑midnight time, treat it as authoritative.
        if (inward && (inward.getHours() !== 0 || inward.getMinutes() !== 0)) {
            return item.inwardDate;
        }

        // Otherwise prefer sourceDate when it exists (often has the correct time).
        if (source) return item.sourceDate;

        // Last resort: return inwardDate even if it's date‑only.
        return item?.inwardDate ?? null;
    };

    /** Normalize sourceType from API (number or string) to display label. */
    const getSourceTypeLabel = (sourceType: InwardSourceType | string | number): string => {
        const n =
            typeof sourceType === "number"
                ? sourceType
                : typeof sourceType === "string"
                    ? (sourceType === "PO" || sourceType === "0" ? InwardSourceType.PO : sourceType === "JobWork" || sourceType === "1" ? InwardSourceType.JobWork : -1)
                    : -1;
        switch (n) {
            case InwardSourceType.PO:
                return "Purchase Order";
            case InwardSourceType.JobWork:
                return "Job Work";
            default:
                return "—";
        }
    };

    if (permissions && !permissions.viewQC) {
        return <AccessDenied actionLabel="Go to Quality Control" actionHref="/quality-control" />;
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
                creatorOptions={creatorOptions}
                isAdmin={isAdmin}
                className="shrink-0"
            />

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 font-sans">
                                <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-11 px-0 text-center"></TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-primary-900 dark:!text-white tracking-wider text-center w-12 border-r border-primary-200/50 dark:border-primary-800/50">SR.NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider">QC NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider">QC DATE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider">PARTY NAME</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider">SOURCE TYPE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider text-center">ACTIVE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider text-right">CREATED BY</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 dark:text-secondary-400 tracking-wider text-right pr-6">ACTIONS</TableHead>
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
                                    <Fragment key={q.id}><TableRow
                                            className={cn(
                                                "border-b border-secondary-100 dark:border-secondary-800 transition-all font-sans whitespace-nowrap group cursor-pointer",
                                                expandedQcId === q.id ? "bg-primary-50/60 dark:bg-primary-900/30 dark:border-transparent" : "hover:bg-primary-50/30 dark:hover:bg-primary-900/10",
                                                !q.isActive && "bg-secondary-50/50 dark:bg-secondary-900/40 opacity-75"
                                            )}
                                            onClick={() => setExpandedQcId(expandedQcId === q.id ? null : q.id)}
                                        >
                                            <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                                <div className="flex items-center justify-center">
                                                    <motion.div
                                                        animate={{ rotate: expandedQcId === q.id ? 90 : 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        style={{ originX: "50%", originY: "50%" }}
                                                        className={cn(
                                                            "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                                            expandedQcId === q.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                                                        )}
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </motion.div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">
                                                {String(qcs.length - idx).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-bold text-secondary-900 text-sm">{q.qcNo}</TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-700 text-sm">
                                                {formatDateTime(q.createdAt)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-medium text-secondary-800 text-sm">{q.partyName ?? "—"}</TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-500 font-medium text-xs italic">{getSourceTypeLabel(q.sourceType)}</TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                <span
                                                    className={cn(
                                                        "inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                                        q.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                    )}
                                                >
                                                    {q.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right text-secondary-600 text-sm whitespace-nowrap">{q.creatorName ?? "System"}</TableCell>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {permissions?.approveQC && q.isActive !== false && (
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
                                                    {permissions?.viewQC && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingQc(q);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title={permissions?.editQC && q.status === QcStatus.Pending && q.isActive !== false ? "Edit QC" : "View QC (incl. attachments)"}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    {isAdmin && (
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
                                                    )}
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedQcId === q.id && (
                                                <TableRow key={`expand-${q.id}`} className="hover:bg-transparent border-b border-secondary-100">
                                                    <td colSpan={9} className="p-0 border-none max-w-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                            className="overflow-hidden bg-secondary-50/10 w-full"
                                                        >
                                                            <div className="px-4 pb-4 pt-4">
                                                                <div className="bg-white dark:bg-card rounded-xl border border-secondary-200 dark:border-border overflow-hidden shadow-sm">
                                                                    <div className="bg-secondary-50/50 dark:bg-secondary-900/30 px-4 py-2 border-b border-secondary-100 dark:border-border flex items-center justify-between">
                                                                        <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">
                                                                            QC Items
                                                                        </p>
                                                                        <span className="text-[10px] font-medium text-secondary-400">
                                                                            Total: {q.items?.length || 0} item(s)
                                                                        </span>
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="bg-transparent dark:bg-transparent border-b border-secondary-100 dark:border-secondary-800 hover:bg-transparent dark:hover:bg-transparent text-nowrap">
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider w-14 text-center">SR.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">
                                                                                        {q.sourceType === InwardSourceType.PO ? "PO NO." : "JW NO."}
                                                                                    </TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">
                                                                                        {q.sourceType === InwardSourceType.PO ? "PO DATE" : "JW DATE"}
                                                                                    </TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">ITEM DESCRIPTION</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">ITEM TYPE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider w-40">DRAWING NO / REV</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">INWARD NO.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider">INWARD DATE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:!text-white tracking-wider text-center w-24 pr-6">QC STATUS</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                        <TableBody>
                                                                            {q.items?.map((it, lidx) => (
                                                                                <TableRow key={it.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 text-nowrap font-sans">
                                                                                    <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-primary-700 font-bold text-[13px]">{it.sourceRefDisplay || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px]">
                                                                                        {it.sourceDate ? formatDateTime(it.sourceDate) : "—"}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-bold text-secondary-900 text-[13px] tracking-tight">{it.currentName ?? "—"}</span>
                                                                                            <span className="text-[11px] text-secondary-500 font-medium">{it.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px] uppercase">
                                                                                            {it.itemTypeName || "—"}
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-nowrap">
                                                                                        <div className="flex flex-col items-center min-w-0">
                                                                                            <span className="font-medium text-secondary-800 text-[13px] truncate">{it.drawingNo ?? "N/A"}</span>
                                                                                            <span className="text-[10px] text-secondary-400 font-medium">REV: {it.revisionNo ?? "0"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 font-bold text-[12px]">{it.inwardNo || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] whitespace-nowrap">
                                                                                        {getInwardDateForDisplay(it) ? formatDateTime(getInwardDateForDisplay(it)) : "—"}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-center pr-6">
                                                                                        {it.isApproved === true ? (
                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">Approved</span>
                                                                                        ) : it.isApproved === false ? (
                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-rose-50 text-rose-700 border-rose-200">Rejected</span>
                                                                                        ) : (
                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </TableRow>
                                            )}
                                        </AnimatePresence></Fragment>
                                ))
                            ) : (
                                <TableRow key="empty">
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
                <TablePagination page={filters.page} pageSize={filters.pageSize} totalCount={totalCount} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
            </Card>

            <QualityControlDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingQc(null);
                }}
                qc={editingQc ?? undefined}
                readOnly={!!editingQc && !permissions?.editQC}
            />

            {reviewQc && (
                <QCReviewDialog
                    open={!!reviewQc}
                    onOpenChange={(open) => !open && setReviewQc(null)}
                    qc={reviewQc}
                    canApprove={!!permissions?.approveQC}
                />
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
