"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Plus, Briefcase, ChevronRight, Minus, Edit2,
    MoreVertical, Eye, Printer, FileText, Package
} from "lucide-react";
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
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { JobWorkDialog } from "@/components/job-works/job-work-dialog";
import { JobWorkFilters } from "@/components/filters/job-work-filters";
import { initialJobWorkFilters, JobWorkFiltersState } from "@/lib/job-work-filters";

const STATUS_LABELS: Record<JobWorkStatus, string> = {
    [JobWorkStatus.Pending]: "Pending",
    [JobWorkStatus.InTransit]: "In Transit",
    [JobWorkStatus.Completed]: "Completed",
};

export default function JobWorksPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [filters, setFilters] = useState<JobWorkFiltersState>(initialJobWorkFilters);
    const [expandedJWId, setExpandedJWId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedJobWork, setSelectedJobWork] = useState<JobWork | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);

    const { data: jobWorks = [], isLoading } = useQuery<JobWork[]>({
        queryKey: ["job-works", { ...filters, search: debouncedSearch }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (filters.status !== "") params.set("status", String(filters.status));
            if (filters.dateFrom) params.set("startDate", filters.dateFrom);
            if (filters.dateTo) params.set("endDate", filters.dateTo);
            filters.partyIds.forEach(id => params.append("partyIds", String(id)));
            if (filters.isActive !== null) params.set("isActive", String(filters.isActive));

            const res = await api.get("/job-works?" + params.toString());
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

    const resetFilters = useCallback(() => {
        setFilters(initialJobWorkFilters);
    }, []);

    const openViewDialog = (jw: JobWork) => {
        setSelectedJobWork(jw);
        setDialogOpen(true);
    };

    if (permissions && !permissions.viewMovement) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase tracking-tighter">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium tracking-tight">You don&apos;t have permission to view Job Work entries.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-secondary-900 tracking-tight uppercase tracking-tighter">Job Work Entries</h1>
                    <p className="text-secondary-500 text-sm tracking-tight font-medium">Manage Send Process of Items</p>
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
                        Create Job Work
                    </Button>
                )}
            </div>

            {/* Filter Area */}
            <JobWorkFilters
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
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">JOBWORK NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">PARTY NAME</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">ITEM SUMMARY</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">STATUS</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right whitespace-nowrap">CREATED BY</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={8} className="h-16 px-6 text-center">
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
                                                expandedJWId === jw.id && "bg-primary-50/40"
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
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{idx + 1}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-sm">{jw.jobWorkNo}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">{jw.createdAt ? format(new Date(jw.createdAt), "dd MMM yyyy") : "—"}</td>
                                            <td className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                <div className="flex flex-col">
                                                    <span>{jw.toPartyName ?? "—"}</span>
                                                    {jw.description && (
                                                        <span className="text-[10px] text-secondary-400 font-medium uppercase truncate max-w-[200px]">{jw.description}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">
                                                {jw.items?.length > 0 ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-secondary-900 truncate max-w-[150px]">{jw.items[0].itemName}</span>
                                                        {jw.items.length > 1 && (
                                                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-secondary-100 text-secondary-600 font-bold">+{jw.items.length - 1} MORE</span>
                                                        )}
                                                    </div>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                                    jw.status === JobWorkStatus.Pending ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                        jw.status === JobWorkStatus.InTransit ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                            "bg-green-50 text-green-700 border-green-200"
                                                )}>
                                                    {STATUS_LABELS[jw.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm">
                                                {jw.creatorName || "System"}
                                            </td>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openViewDialog(jw)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toast.success("Generating Print View for " + jw.jobWorkNo)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                        title="Print"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedJWId === jw.id && (
                                                <TableRow key={`expand-${jw.id}`} className="bg-secondary-50/10 border-b border-secondary-100 border-t-0 p-0 hover:bg-secondary-50/10">
                                                    <td colSpan={8} className="p-0 border-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-xs font-bold text-secondary-600 uppercase tracking-widest px-4 py-2 border-b border-secondary-100">
                                                                        Job Work Items Breakdown
                                                                    </p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-12 text-center">SR.NO</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM DESCRIPTION</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">TYPE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">DRAWING NO. / REV</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">MATERIAL</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-right">RATE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap text-center">GST%</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">REMARKS</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {jw.items?.map((item, iIdx) => (
                                                                                <TableRow key={item.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30">
                                                                                    <TableCell className="px-4 py-2.5 text-secondary-500 font-medium text-sm text-center">{iIdx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2.5">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-bold text-secondary-900 text-sm tracking-tight">{item.itemName ?? "—"}</span>
                                                                                            <span className="text-xs text-secondary-400 font-medium">{item.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2.5 text-secondary-700 text-sm font-semibold">{item.itemTypeName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2.5">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-bold text-secondary-800 text-sm truncate">{item.drawingNo ?? "N/A"}</span>
                                                                                            <span className="text-xs text-secondary-400 font-bold">R{item.revisionNo ?? "0"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2.5 text-secondary-700 text-sm">{item.materialName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2.5 text-secondary-900 font-bold text-sm text-right">
                                                                                        ₹{(item.rate ?? 0).toLocaleString()}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2.5 text-secondary-700 text-sm font-bold text-center">
                                                                                        {item.gstPercent ?? 0}%
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2.5 text-sm text-secondary-500 italic max-w-xs truncate">
                                                                                        {item.remarks ?? "—"}
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
                                    <td colSpan={8} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-secondary-50 rounded-2xl flex items-center justify-center text-secondary-200">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <p className="text-secondary-400 font-bold text-sm uppercase tracking-widest tracking-tighter">No job work entries found</p>
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
        </div>
    );
}
