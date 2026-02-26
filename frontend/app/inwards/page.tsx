"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Plus, Search, Package, MapPin, Eye, FileText, Truck, Briefcase,
    ChevronRight, Minus, X, Building2, Edit2
} from "lucide-react";
import api from "@/lib/api";
import { Inward, InwardSourceType, InwardStatus, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import Link from "next/link";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { InwardDialog } from "@/components/inwards/inward-dialog";

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "PO",
    [InwardSourceType.OutwardReturn]: "Outward Return",
    [InwardSourceType.JobWork]: "Job Work",
};

const STATUS_LABELS: Record<InwardStatus, string> = {
    [InwardStatus.Draft]: "Draft",
    [InwardStatus.Submitted]: "Submitted",
};

export default function InwardsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState<InwardSourceType | "">("");
    const [statusFilter, setStatusFilter] = useState<InwardStatus | "">("");
    const [expandedInwardId, setExpandedInwardId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInwardId, setEditingInwardId] = useState<number | null>(null);

    const { data: inwards = [], isLoading } = useQuery<Inward[]>({
        queryKey: ["inwards", sourceFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (sourceFilter !== "") params.set("sourceType", String(sourceFilter));
            if (statusFilter !== "") params.set("status", String(statusFilter));
            const res = await api.get("/inwards" + (params.toString() ? "?" + params.toString() : ""));
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewInward
    });

    const resetFilters = useCallback(() => {
        setSearch("");
        setSourceFilter("");
        setStatusFilter("");
    }, []);

    if (permissions && !permissions.viewInward) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don&apos;t have permission to view inward entries.</p>
                </div>
            </div>
        );
    }

    const filtered = inwards.filter(i =>
        (i.inwardNo || "").toLowerCase().includes(search.toLowerCase()) ||
        i.lines?.some(l => (l.sourceRefDisplay || "").toLowerCase().includes(search.toLowerCase())) ||
        (i.vendorName || "").toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: InwardStatus) => {
        switch (status) {
            case InwardStatus.Submitted:
                return (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
                        Submitted
                    </span>
                );
            case InwardStatus.Draft:
            default:
                return (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
                        Draft
                    </span>
                );
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Inward Entries</h1>
                    <p className="text-secondary-500 text-sm">Receipts from PO, Outward Return & Job Work</p>
                </div>
                {permissions?.createInward && (
                    <Button
                        onClick={() => {
                            setEditingInwardId(null);
                            setDialogOpen(true);
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Inward Receipt
                    </Button>
                )}
            </div>

            {/* Filter Area */}
            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center shrink-0">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Inward No, Vendor, Ref..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                    >
                        <option value="">All Sources</option>
                        {(Object.keys(SOURCE_LABELS) as unknown as InwardSourceType[]).map((k) => (
                            <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                    >
                        <option value="">All Statuses</option>
                        {(Object.keys(STATUS_LABELS) as unknown as InwardStatus[]).map((k) => (
                            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                        ))}
                    </select>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary-500 hover:text-primary-600 font-bold text-xs uppercase tracking-wider"
                        onClick={resetFilters}
                    >
                        Clear
                    </Button>
                </div>

                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">Sr.No</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">Inward No / Date</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">Vendor / Party</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap text-center">Lines</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">Status</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={7} className="h-16 px-6">
                                            <div className="h-4 bg-secondary-100 rounded-full w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((i, idx) => (
                                    <Fragment key={i.id}>
                                        <TableRow
                                            className={cn(
                                                "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                                                expandedInwardId === i.id && "bg-primary-50/30"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedInwardId(expandedInwardId === i.id ? null : i.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500"
                                                >
                                                    {expandedInwardId === i.id ? <Minus className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-secondary-900 text-sm">{i.inwardNo}</span>
                                                    <span className="text-xs text-secondary-400">{format(new Date(i.inwardDate), "dd MMM yyyy")}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-secondary-700 text-sm flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-secondary-400" />
                                                        {i.vendorName ?? "—"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm font-bold text-secondary-600 italic">
                                                {i.lines?.length ?? 0} Item(s)
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(i.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                                {i.status === InwardStatus.Draft && permissions?.createInward && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingInwardId(i.id);
                                                            setDialogOpen(true);
                                                        }}
                                                        className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 rounded-lg transition-all"
                                                        title="Edit Draft"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                <Link href={`/inwards/${i.id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedInwardId === i.id && (
                                                <TableRow key={`expand-${i.id}`} className="bg-secondary-50/30 border-b border-secondary-100">
                                                    <td colSpan={7} className="p-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest px-4 py-2 border-b border-secondary-50 bg-secondary-50/50">
                                                                        Received Items Details
                                                                    </p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50/30 border-b border-secondary-100/50">
                                                                                <TableHead className="h-9 px-4 text-[9px] font-black uppercase text-secondary-500 tracking-wider text-center w-12">Sr</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[9px] font-black uppercase text-secondary-500 tracking-wider">Source Context</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[9px] font-black uppercase text-secondary-500 tracking-wider">Line Item</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[9px] font-black uppercase text-secondary-500 tracking-wider text-center w-24">Qty</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[9px] font-black uppercase text-secondary-500 tracking-wider">Remarks</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {i.lines?.map((line, lidx) => (
                                                                                <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20">
                                                                                    <TableCell className="px-4 py-2 text-secondary-400 font-bold text-[11px] text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[9px] font-black text-primary-500 uppercase leading-none mb-0.5">{SOURCE_LABELS[line.sourceType]}</span>
                                                                                            <span className="font-bold text-secondary-900 text-xs tracking-tight">{line.sourceRefDisplay}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-bold text-secondary-800 text-xs">{line.itemName ?? "—"}</span>
                                                                                            <span className="text-[10px] font-medium text-secondary-400">{line.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-center">
                                                                                        <span className="inline-flex h-6 px-2 items-center justify-center bg-secondary-50 border border-secondary-100 rounded font-black text-secondary-700 text-xs">{line.quantity}</span>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-[11px] text-secondary-500 italic max-w-md truncate">
                                                                                        {line.remarks ?? "—"}
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
                                    <td colSpan={7} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-secondary-50 rounded-2xl flex items-center justify-center text-secondary-200">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <p className="text-secondary-400 font-bold text-sm uppercase tracking-widest">No inward entries found</p>
                                        </div>
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <InwardDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                inwardId={editingInwardId}
            />
        </div>
    );
}
