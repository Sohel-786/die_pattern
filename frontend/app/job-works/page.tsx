"use client";

import { useState, useCallback, useMemo, Fragment, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, ChevronRight, Minus, Edit2,
    Package, Ban, CheckCircle2, Eye, LayoutGrid, X, Search, Printer
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
import { format } from "date-fns";
import { useCurrentUserPermissions, useCurrentCompany } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JobWorkDialog } from "@/components/job-works/job-work-dialog";
import { JobWorkFilters } from "@/components/filters/job-work-filters";
import { initialJobWorkFilters, JobWorkFiltersState, buildJobWorkFilterParams } from "@/lib/job-work-filters";
import { toast } from "react-hot-toast";
import { registerDialog } from "@/lib/dialog-stack";

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
    const { data: currentCompany } = useCurrentCompany();
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

    const { data: jobWorks = [], isLoading } = useQuery<JobWork[]>({
        queryKey: ["job-works", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/job-works?" + queryParams.toString());
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewMovement
    });

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

    const { data: itemsList = [] } = useQuery<any[]>({
        queryKey: ["items-minimal"],
        queryFn: async () => {
            const res = await api.get("/items/minimal");
            return res.data.data ?? [];
        }
    });

    const itemOptions = useMemo(() =>
        itemsList.map(i => ({ label: [i.currentName, i.mainPartName].filter(Boolean).join(" – "), value: i.id })),
        [itemsList]);

    const resetFilters = useCallback(() => {
        setFilters(initialJobWorkFilters);
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
        return (
            <div className="flex h-[80vh] items-center justify-center px-4 font-sans">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don&apos;t have permission to view Job Work entries.</p>
                </div>
            </div>
        );
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
                itemOptions={itemOptions}
                isAdmin={isAdmin}
                className="shrink-0"
            />

            {/* Main Table Container */}
            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900 hover:bg-primary-100">
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">JOBWORK NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">PARTY NAME</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">STATUS</TableHead>
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
                            ) : jobWorks.length > 0 ? (
                                jobWorks.map((jw, idx) => (
                                    <Fragment key={jw.id}>
                                        <TableRow
                                            className={cn(
                                                "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                                                expandedJWId === jw.id && "bg-primary-50/30",
                                                !jw.isActive && "bg-secondary-50/50 opacity-75"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedJWId(expandedJWId === jw.id ? null : jw.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500 hover:bg-white border border-transparent hover:border-secondary-200 rounded"
                                                >
                                                    {expandedJWId === jw.id ? <Minus className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{jobWorks.length - idx}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-sm">{jw.jobWorkNo}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">
                                                {format(new Date(jw.createdAt), "dd MMM yyyy")}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                {jw.toPartyName ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(jw)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                                                    jw.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                )}>
                                                    {jw.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm">
                                                {jw.creatorName ?? "System"}
                                            </td>
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
                                                    {permissions?.createMovement && (
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
                                                    )}
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
                                                <TableRow key={`expand-${jw.id}`} className="bg-secondary-50/10 border-b border-secondary-100 border-t-0 p-0 hover:bg-secondary-50/10">
                                                    <td colSpan={11} className="p-0 border-0 max-w-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider px-4 py-2 border-b border-secondary-100">
                                                                        Job Work Items
                                                                    </p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-12 text-center">SR.NO</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM DESCRIPTION</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">TYPE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">MATERIAL</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">DRAWING NO. / REV</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-right">UNIT RATE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-center">GST%</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-right">TOTAL</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-center">INWARD NO.</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">QC NO.</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center w-24">QC STATUS</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {jw.items?.map((item, lidx) => {
                                                                                const rate = item.rate ?? 0;
                                                                                const gst = item.gstPercent ?? 0;
                                                                                const total = rate + (rate * gst / 100);
                                                                                return (
                                                                                    <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30">
                                                                                        <TableCell className="px-4 py-2 text-secondary-500 font-medium text-sm text-center">{lidx + 1}</TableCell>
                                                                                        <TableCell className="px-4 py-2">
                                                                                            <div className="flex flex-col min-w-0">
                                                                                                <span className="font-semibold text-secondary-900 text-sm">{item.itemName ?? "—"}</span>
                                                                                                <span className="text-xs text-secondary-500">{item.mainPartName ?? "—"}</span>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-700 text-sm">{item.itemTypeName ?? "—"}</TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-700 text-sm">{item.materialName ?? "—"}</TableCell>
                                                                                        <TableCell className="px-4 py-2">
                                                                                            <div className="flex flex-col min-w-0">
                                                                                                <span className="font-medium text-secondary-800 text-sm truncate">{item.drawingNo ?? "N/A"}</span>
                                                                                                <span className="text-xs text-secondary-500">R{item.revisionNo ?? "0"}</span>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-900 font-medium text-sm text-right">
                                                                                            ₹{rate.toLocaleString()}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-700 text-sm text-center">
                                                                                            {gst}%
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-900 font-bold text-sm text-right">
                                                                                            ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm text-center">
                                                                                            {item.inwardNo ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[10px]">
                                                                                                    {item.inwardNo}
                                                                                                </span>
                                                                                            ) : "—"}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm">
                                                                                            {item.qcNo ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px]">
                                                                                                    {item.qcNo}
                                                                                                </span>
                                                                                            ) : "—"}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-center whitespace-nowrap">
                                                                                            {item.qcNo ? (() => {
                                                                                                // Use authoritative QC decision from QC item record (qi.IsApproved)
                                                                                                const decision = item.qcDecision;

                                                                                                if (decision === true) {
                                                                                                    // Item was approved (item-level or entry-level)
                                                                                                    return (
                                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                                                                                            Approved
                                                                                                        </span>
                                                                                                    );
                                                                                                } else if (decision === false) {
                                                                                                    // Item was rejected
                                                                                                    return (
                                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                                                                                            Rejected
                                                                                                        </span>
                                                                                                    );
                                                                                                } else {
                                                                                                    // QC entry exists but no item-level decision yet
                                                                                                    return (
                                                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                                                                                                            Pending
                                                                                                        </span>
                                                                                                    );
                                                                                                }
                                                                                            })() : "—"}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                );
                                                                            })}
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
            </Card>

            <JobWorkDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setSelectedJobWork(null);
                }}
                jobWork={selectedJobWork}
            />

            {previewJwId && (
                <JobWorkPreviewModal
                    jwId={previewJwId}
                    onClose={() => setPreviewJwId(null)}
                />
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

// Separate component for preview matching PO standard
function JobWorkPreviewModal({ jwId, onClose }: { jwId: number; onClose: () => void }) {
    const { data: currentCompany } = useCurrentCompany();

    // Use global dialog stack for Esc handling
    useEffect(() => {
        if (jwId) {
            return registerDialog(onClose);
        }
    }, [jwId, onClose]);

    const { data: jw, isLoading } = useQuery<JobWork>({
        queryKey: ["job-work", jwId],
        queryFn: async () => {
            const res = await api.get(`/job-works/${jwId}`);
            return res.data.data;
        },
        enabled: !!jwId
    });

    if (!jwId) return null;

    const handlePrint = () => window.print();

    const content = (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white font-sans">
            <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
                <h2 className="text-lg font-bold text-secondary-900">Job Work Challan – Preview</h2>
                <div className="flex items-center gap-2">
                    <Button onClick={handlePrint} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold shadow-sm">
                        <Printer className="w-4 h-4 mr-2" />
                        Print Challan
                    </Button>
                    <Button variant="outline" onClick={onClose} className="border-secondary-300">
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 md:p-10 print:p-0">
                {isLoading ? (
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : jw ? (
                    <div id="jw-document" className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none p-10 border border-secondary-100">
                        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-secondary-800">
                            <div className="space-y-4">
                                {currentCompany?.logoUrl ? (
                                    <img src={currentCompany.logoUrl} alt="Logo" className="h-16 object-contain" />
                                ) : (
                                    <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                                        {currentCompany?.name?.[0] || "A"}
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-xl font-black text-secondary-900 uppercase tracking-tight">{currentCompany?.name || "COMPANY NAME"}</h1>
                                    <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mt-0.5">Delivery Challan</p>
                                </div>
                            </div>
                            <div className="text-right space-y-4">
                                <div className="bg-secondary-900 text-white px-4 py-2 rounded-lg">
                                    <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Challan No</p>
                                    <p className="text-lg font-bold">{jw.jobWorkNo}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Date</p>
                                    <p className="font-bold text-secondary-900">{format(new Date(jw.createdAt), "dd MMM yyyy")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-12 mb-10 text-sm">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Consigned To</span>
                                <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <p className="font-bold text-secondary-900 text-base uppercase">{jw.toPartyName || "—"}</p>
                                    <p className="text-xs text-secondary-500 font-medium mt-1">Authorized Job Work Partner</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Process Details</span>
                                <div className="p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                                    <p className="font-bold text-secondary-900 uppercase">Process: {jw.description || "As Specified"}</p>
                                    {jw.remarks && <p className="text-xs text-secondary-600 mt-1 italic">{jw.remarks}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="border border-secondary-200 rounded-xl overflow-hidden mb-10 shadow-sm">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-secondary-50 border-b border-secondary-200 font-bold text-secondary-600">
                                        <th className="py-3 px-4 text-center w-12 border-r border-secondary-200">SR</th>
                                        <th className="py-3 px-4 text-left">Item Description</th>
                                        <th className="py-3 px-4 text-center w-32 border-l border-secondary-200">Drawing / Rev</th>
                                        <th className="py-3 px-4 text-right w-28 border-l border-secondary-200">Rate (₹)</th>
                                        <th className="py-3 px-4 text-right w-32 border-l border-secondary-200">Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100 font-medium text-secondary-800">
                                    {jw.items?.map((item, idx) => {
                                        const r = item.rate ?? 0;
                                        const g = item.gstPercent ?? 0;
                                        const t = r + (r * g / 100);
                                        return (
                                            <tr key={idx} className="print:break-inside-avoid last:border-b-0">
                                                <td className="py-3 px-4 text-center border-r border-secondary-100 text-secondary-400">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900">{item.itemName}</span>
                                                        <span className="text-[10px] text-secondary-500 uppercase">{item.mainPartName} • {item.materialName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center border-l border-secondary-100">
                                                    <p className="font-bold">{item.drawingNo || "N/A"}</p>
                                                    <p className="text-[9px] text-secondary-500">Rev: {item.revisionNo || "0"}</p>
                                                </td>
                                                <td className="py-3 px-4 text-right border-l border-secondary-100">{r.toLocaleString()}</td>
                                                <td className="py-3 px-4 text-right border-l border-secondary-100 font-bold text-secondary-900">{t.toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-secondary-50 border-t border-secondary-200 font-bold">
                                    <tr>
                                        <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-widest text-[9px] text-secondary-500">Subtotal Value</td>
                                        <td className="py-3 px-4 text-right text-sm text-secondary-900 border-l border-secondary-200 tabular-nums">
                                            ₹{jw.items?.reduce((s, i) => s + (i.rate ?? 0) + ((i.rate ?? 0) * (i.gstPercent ?? 0) / 100), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-20 mt-16 px-4">
                            <div className="border-t border-secondary-300 pt-4">
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-12">Authorized Signatory</p>
                                <p className="text-sm font-bold text-secondary-900 uppercase leading-none">{currentCompany?.name}</p>
                            </div>
                            <div className="border-t border-secondary-300 pt-4 text-right">
                                <p className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mb-12">Receiver&apos;s Signature</p>
                                <p className="text-[10px] font-bold text-secondary-400 italic">(Seal & Sign)</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-secondary-500 font-medium">Document not found.</div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body * { visibility: hidden !important; }
                  #jw-document, #jw-document * { visibility: visible !important; }
                  #jw-document { position: absolute !important; left: 0; top: 0; width: 100% !important; border: none !important; margin: 0 !important; }
                  .fixed, .print-hide { display: none !important; }
                }
              `}} />
        </div>
    );

    if (typeof document !== "undefined") {
        return createPortal(content, document.body);
    }

    return content;
}
