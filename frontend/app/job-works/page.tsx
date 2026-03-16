"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, ChevronRight, Minus, Edit2,
    Package, Ban, CheckCircle2, Eye, LayoutGrid, X, Search
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import api from "@/lib/api";
import { JobWork, JobWorkStatus, Party } from "@/types";
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
import { useDebounce } from "@/hooks/use-debounce";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn, formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JobWorkDialog } from "@/components/job-works/job-work-dialog";
import { JobWorkFilters } from "@/components/filters/job-work-filters";
import { initialJobWorkFilters, JobWorkFiltersState, buildJobWorkFilterParams } from "@/lib/job-work-filters";
import { toast } from "react-hot-toast";
import { JobWorkPreviewModal } from "@/components/job-works/job-work-preview-modal";

/**
 * Intelligent status mapping based on the user's defined flow:
 * Item -> Job work -> Inward Done -> QC (Approved/Rejected) -> In stock
 */
function getJwFlowStage(jw: JobWork): { label: string; color: string } {
    const items = jw.items ?? [];
    if (!items.length) return { label: "Pending", color: "amber" };

    const anyInwarded = items.some(i => !!i.inwardNo);
    const allInwarded = items.every(i => !!i.inwardNo);
    const anyQCDone = items.some(i => !!i.qcNo);
    const allQCDone = items.every(i => !!i.qcNo);
    const anyQCPending = items.some(i => i.isQCPending);
    const allQCApproved = items.every(i => i.isQCApproved);

    // Flow stages
    if (!anyInwarded && !anyQCDone) {
        return { label: "Job Work Sent", color: "amber" };
    }
    if (anyInwarded && !allInwarded) {
        return { label: "Partial Inward", color: "blue" };
    }
    if (allInwarded && !anyQCDone) {
        return { label: "Inward Done", color: "indigo" };
    }
    if (anyQCDone && !allQCDone) {
        return { label: "QC In Progress", color: "violet" };
    }
    if (allQCDone && anyQCPending) {
        return { label: "QC Decided", color: "violet" };
    }
    if (allQCApproved) {
        return { label: "In Stock", color: "emerald" };
    }

    // Default fallback
    return { label: "QC Done", color: "emerald" };
}

export default function JobWorksPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const { data: permissions } = useCurrentUserPermissions();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<JobWorkFiltersState>(initialJobWorkFilters);
    const [expandedJWId, setExpandedJWId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedJobWork, setSelectedJobWork] = useState<JobWork | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<JobWork | null>(null);
    const [previewJwId, setPreviewJwId] = useState<number | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);

    const queryParams = useMemo(() =>
        buildJobWorkFilterParams({ ...filters, search: debouncedSearch }),
        [filters, debouncedSearch]
    );

    const { data: jwData, isLoading } = useQuery<{ list: JobWork[]; totalCount: number }>({
        queryKey: ["job-works", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/job-works?" + queryParams.toString());
            return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
        },
        enabled: !!permissions?.viewMovement
    });
    const jobWorks = jwData?.list ?? [];
    const totalCount = jwData?.totalCount ?? 0;

    const { data: parties = [] } = useQuery<Party[]>({
        queryKey: ["parties"],
        queryFn: async () => {
            const res = await api.get("/parties");
            return res.data.data ?? [];
        }
    });

    const partyOptions = useMemo(() =>
        parties.map(p => ({ label: p.name, value: p.id })),
        [parties]);

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



    const resetFilters = useCallback(() => {
        setFilters((prev) => ({ ...initialJobWorkFilters, pageSize: prev.pageSize, page: 1 }));
    }, []);

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
            await api.patch(`/job-works/${id}/active?active=${active}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["job-works"] });
            toast.success("Job Work status updated");
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || "Failed to update status";
            toast.error(message);
        }
    });

    const getStatusBadge = (jw: JobWork) => {
        if (!jw.isActive) {
            return (
                <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-secondary-100 text-secondary-700 border-secondary-200">
                    Inactive
                </span>
            );
        }
        const stage = getJwFlowStage(jw);
        const colorMap: Record<string, string> = {
            amber: "bg-amber-50 text-amber-700 border-amber-200",
            blue: "bg-blue-50 text-blue-700 border-blue-200",
            indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
            violet: "bg-violet-50 text-violet-700 border-violet-200",
            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
        return (
            <span className={cn(
                "inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                colorMap[stage.color] || "bg-secondary-50 text-secondary-600 border-secondary-200"
            )}>
                {stage.label}
            </span>
        );
    };

    if (permissions && !permissions.viewMovement) {
        return <AccessDenied actionLabel="Go to Job Works" actionHref="/job-works" />;
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Job Work Entries</h1>
                    <p className="text-secondary-500 text-sm tracking-tight font-medium">Manage and track process movements</p>
                </div>
                {permissions?.createMovement && (
                    <Button
                        onClick={() => {
                            setSelectedJobWork(null);
                            setDialogOpen(true);
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Job Work
                    </Button>
                )}
            </div>

            {/* Filter Area */}
            <JobWorkFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClear={resetFilters}
                partyOptions={partyOptions}
                creatorOptions={creatorOptions}
                isAdmin={isAdmin}
                className="shrink-0"
            />

            {/* Main Table Container */}
            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900 hover:bg-primary-100 font-sans">
                                <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-11 px-0 text-center"></TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider text-center w-12 border-r border-primary-200/50">SR.NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">JOBWORK NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">DATE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">PARTY NAME</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-center">STATUS</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-center">ACTIVE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right">CREATED BY</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider text-right pr-6">ACTIONS</TableHead>
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
                            ) : jobWorks.length > 0 ? (
                                jobWorks.map((jw, idx) => (
                                    <Fragment key={jw.id}><TableRow
                                            className={cn(
                                                "border-b border-secondary-100 transition-all font-sans whitespace-nowrap group cursor-pointer",
                                                expandedJWId === jw.id ? "bg-primary-50/60" : "hover:bg-primary-50/30",
                                                !jw.isActive && "bg-secondary-50/50 opacity-75"
                                            )}
                                            onClick={() => setExpandedJWId(expandedJWId === jw.id ? null : jw.id)}
                                        >
                                            <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                                <div className="flex items-center justify-center">
                                                    <motion.div
                                                        animate={{ rotate: expandedJWId === jw.id ? 90 : 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        style={{ originX: "50%", originY: "50%" }}
                                                        className={cn(
                                                            "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                                            expandedJWId === jw.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                                                        )}
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </motion.div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">
                                                {String(jobWorks.length - idx).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-bold text-secondary-900 text-sm">{jw.jobWorkNo}</TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-700 text-sm">
                                                {formatDateTime(jw.createdAt)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                {jw.toPartyName ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                {getStatusBadge(jw)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                                    jw.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                )}>
                                                    {jw.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right text-secondary-600 text-sm whitespace-nowrap">
                                                {jw.creatorName ?? "System"}
                                            </TableCell>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPreviewJwId(jw.id)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                        title="Preview Challan"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!jw.isActive}
                                                        onClick={() => {
                                                            setSelectedJobWork(jw);
                                                            setDialogOpen(true);
                                                        }}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title={jw.isActive ? "Edit Job Work" : "Inactive entries cannot be edited"}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                    {isAdmin && (
                                                        jw.isActive ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={jw.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-"))}
                                                                onClick={() => setInactiveTarget(jw)}
                                                                className={cn(
                                                                    "h-8 w-8 p-0 border border-transparent rounded-lg transition-all text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100",
                                                                    jw.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-")) && "opacity-30 cursor-not-allowed"
                                                                )}
                                                                title={jw.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-"))
                                                                    ? "Cannot deactivate because some items have been inwarded in active entries"
                                                                    : "Deactivate Job Work"}
                                                            >
                                                                <Ban className="w-3.5 h-3.5" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleActiveMutation.mutate({ id: jw.id, active: true })}
                                                                className="h-8 w-8 p-0 border border-transparent rounded-lg transition-all text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100"
                                                                title="Activate Job Work"
                                                            >
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedJWId === jw.id && (
                                                <TableRow key={`expand-${jw.id}`} className="hover:bg-transparent border-b border-secondary-100">
                                                    <td colSpan={11} className="p-0 border-none max-w-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                            className="overflow-hidden bg-secondary-50/10 w-full"
                                                        >
                                                            <div className="px-4 pb-4 pt-4">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <div className="bg-secondary-50/50 px-4 py-2 border-b border-secondary-100 flex items-center justify-between">
                                                                        <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">
                                                                            Job Work Items
                                                                        </p>
                                                                        <span className="text-[10px] font-medium text-secondary-400">
                                                                            Total: {jw.items?.length || 0} item(s)
                                                                        </span>
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="bg-white border-b border-secondary-100 hover:bg-white text-nowrap">
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider w-14 text-center">SR.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">ITEM DESCRIPTION</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">TYPE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">MATERIAL</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider w-40 text-center">DWG NO / REV</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">UNIT RATE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">GST%</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">TOTAL AMOUNT</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">INWARD NO.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">INWARD DATE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">QC NO.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">QC DATE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center pr-6">QC STATUS</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {jw.items?.map((item, lidx) => {
                                                                                    const rate = item.rate ?? 0;
                                                                                    const gst = item.gstPercent ?? 0;
                                                                                    const total = rate + (rate * gst / 100);
                                                                                    return (
                                                                                        <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 text-nowrap font-sans">
                                                                                            <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">{lidx + 1}</TableCell>
                                                                                            <TableCell className="px-4 py-2">
                                                                                                <div className="flex flex-col min-w-0">
                                                                                                    <span className="font-bold text-secondary-900 text-[13px] tracking-tight">{item.itemName ?? "—"}</span>
                                                                                                    <span className="text-[11px] text-secondary-500 font-medium">{item.mainPartName ?? "—"}</span>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2">
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px] uppercase">
                                                                                                    {item.itemTypeName || "—"}
                                                                                                </span>
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-600 text-[12px]">{item.materialName || "—"}</TableCell>
                                                                                            <TableCell className="px-4 py-2">
                                                                                                <div className="flex flex-col items-center min-w-0">
                                                                                                    <span className="font-medium text-secondary-800 text-[13px]">{item.drawingNo ?? "N/A"}</span>
                                                                                                    <span className="text-[10px] text-secondary-400 font-medium">REV: {item.revisionNo ?? "0"}</span>
                                                                                                </div>
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-900 font-bold text-[13px] text-right">
                                                                                                ₹{rate.toLocaleString()}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-700 text-[12px] text-center font-medium">
                                                                                                {gst}%
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-900 font-black text-[13px] text-right">
                                                                                                ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-center">
                                                                                                {item.inwardNo ? (
                                                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                                                        {item.inwardNo}
                                                                                                    </span>
                                                                                                ) : <span className="text-secondary-300">—</span>}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] whitespace-nowrap">
                                                                                                {item.inwardNo && item.inwardDate ? formatDateTime(item.inwardDate) : "—"}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-indigo-700 font-bold text-[12px]">
                                                                                                {item.qcNo || <span className="text-secondary-300">—</span>}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] whitespace-nowrap">
                                                                                                {item.qcNo && item.qcDate ? formatDateTime(item.qcDate) : "—"}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-center pr-6">
                                                                                                {item.qcNo ? (() => {
                                                                                                    const decision = item.qcDecision;
                                                                                                    if (decision === true) {
                                                                                                        return (
                                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">Approved</span>
                                                                                                        );
                                                                                                    } else if (decision === false) {
                                                                                                        return (
                                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-rose-50 text-rose-700 border-rose-200">Rejected</span>
                                                                                                        );
                                                                                                    } else {
                                                                                                        return (
                                                                                                            <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                                                                                                        );
                                                                                                    }
                                                                                                })() : <span className="text-secondary-300">—</span>}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    );
                                                                                })}
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
                                                <LayoutGrid className="w-6 h-6" />
                                            </div>
                                            <p className="text-secondary-400 font-bold text-sm uppercase tracking-widest">No job work entries found</p>
                                        </div>
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination page={filters.page} pageSize={filters.pageSize} totalCount={totalCount} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
            </Card>

            <JobWorkDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setSelectedJobWork(null);
                }}
                jobWork={selectedJobWork}
                readOnly={!!selectedJobWork && !permissions?.editMovement}
            />

            {previewJwId !== null && (
                <JobWorkPreviewModal jwId={previewJwId} onClose={() => setPreviewJwId(null)} />
            )}

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title="Confirm Inactivation"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600 font-medium">
                        Are you sure you want to deactivate job work entry <span className="font-bold text-secondary-900">{inactiveTarget?.jobWorkNo}</span>?
                        This will mark the entry as inactive and prevent further processing.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setInactiveTarget(null)}
                            className="flex-1 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={() => {
                                if (inactiveTarget?.id) {
                                    toggleActiveMutation.mutate({ id: inactiveTarget.id, active: false });
                                    setInactiveTarget(null);
                                }
                            }}
                            disabled={toggleActiveMutation.isPending}
                        >
                            {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate Entry"}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
