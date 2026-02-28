"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Package, ChevronRight, Minus, Building2, Edit2,
    MoreVertical, CheckCircle2, XCircle, Ban
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import api from "@/lib/api";
import { Inward, InwardSourceType, Role, Party } from "@/types";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { InwardDialog } from "@/components/inwards/inward-dialog";
import { InwardFilters } from "@/components/filters/inward-filters";
import { initialInwardFilters, InwardFiltersState } from "@/lib/inward-filters";
import { toast } from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";

export default function InwardsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<InwardFiltersState>(initialInwardFilters);
    const [expandedInwardId, setExpandedInwardId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInwardId, setEditingInwardId] = useState<number | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<Inward | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);
    const debouncedSourceNo = useDebounce(filters.sourceNo, 500);

    const { data: inwards = [], isLoading } = useQuery<Inward[]>({
        queryKey: ["inwards", { ...filters, search: debouncedSearch, sourceNo: debouncedSourceNo }],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (filters.sourceType !== "") params.set("sourceType", String(filters.sourceType));
            if (debouncedSourceNo) params.set("sourceNo", debouncedSourceNo);
            if (filters.isActive !== null) params.set("isActive", String(filters.isActive));
            if (filters.dateFrom) params.set("startDate", filters.dateFrom);
            if (filters.dateTo) params.set("endDate", filters.dateTo);
            filters.vendorIds.forEach(id => params.append("vendorIds", String(id)));

            const res = await api.get("/inwards?" + params.toString());
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewInward
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

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
            await api.patch(`/inwards/${id}/active?active=${active}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["inward-sources"] });
            toast.success("Inward status updated");
        },
        onError: () => toast.error("Failed to update status")
    });

    const resetFilters = useCallback(() => {
        setFilters(initialInwardFilters);
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

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Inward Entries</h1>
                    <p className="text-secondary-500 text-sm tracking-tight font-medium">Manage receipts from PO, Outward Return & Job Work</p>
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
            <InwardFilters
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
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">INWARD NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">INWARD DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">PARTY NAME</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">INWARD FROM</TableHead>
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
                            ) : inwards.length > 0 ? (
                                inwards.map((i, idx) => (
                                    <Fragment key={i.id}>
                                        <TableRow
                                            className={cn(
                                                "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                                                expandedInwardId === i.id && "bg-primary-50/30",
                                                !i.isActive && "bg-secondary-50/50 opacity-75"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedInwardId(expandedInwardId === i.id ? null : i.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500 hover:bg-white border border-transparent hover:border-secondary-200 rounded"
                                                >
                                                    {expandedInwardId === i.id ? <Minus className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{idx + 1}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-sm">{i.inwardNo}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">{format(new Date(i.inwardDate), "dd MMM yyyy")}</td>
                                            <td className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                {i.vendorName ?? "—"}
                                            </td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">
                                                {i.inwardFrom || "—"}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                                                    i.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                )}>
                                                    {i.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm">
                                                {i.creatorName ?? "System"}
                                            </td>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {permissions?.editInward && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingInwardId(i.id!);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Edit Inward"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (i.isActive) setInactiveTarget(i);
                                                            else toggleActiveMutation.mutate({ id: i.id!, active: true });
                                                        }}
                                                        className={cn(
                                                            "h-8 w-8 p-0 border border-transparent rounded-lg transition-all",
                                                            i.isActive ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                        )}
                                                        title={i.isActive ? "Deactivate" : "Activate"}
                                                    >
                                                        {i.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedInwardId === i.id && (
                                                <TableRow key={`expand-${i.id}`} className="bg-secondary-50/10 border-b border-secondary-100 border-t-0 p-0 hover:bg-secondary-50/10">
                                                    <td colSpan={9} className="p-0 border-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider px-4 py-2 border-b border-secondary-100">
                                                                        Items
                                                                    </p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-12 text-center">SR.NO</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">
                                                                                    {i.inwardFrom?.includes("Purchase Order") ? "PO NO."
                                                                                        : i.inwardFrom?.includes("Job Work") ? "JOBWORK NO."
                                                                                            : i.inwardFrom?.includes("Outward") ? "OUTWARD NO."
                                                                                                : "SOURCE NO."}
                                                                                </TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM DESCRIPTION</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">TYPE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">DRAWING NO. / REV</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">MATERIAL</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">LINE REMARKS</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">QC NO.</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center w-24">QC STATUS</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {i.lines?.map((line, lidx) => (
                                                                                <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30">
                                                                                    <TableCell className="px-4 py-2 text-secondary-500 font-medium text-sm text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm whitespace-nowrap">{line.sourceRefDisplay || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-semibold text-secondary-900 text-sm">{line.itemName ?? "—"}</span>
                                                                                            <span className="text-xs text-secondary-500">{line.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 text-sm">{line.itemTypeName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-medium text-secondary-800 text-sm truncate">{line.drawingNo ?? "N/A"}</span>
                                                                                            <span className="text-xs text-secondary-500">R{line.revisionNo ?? "0"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 text-sm">{line.materialName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-sm text-secondary-600 max-w-xs truncate">{line.remarks ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm">{line.qcNo || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-center whitespace-nowrap">
                                                                                        {line.isQCApproved ? (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">Approved</span>
                                                                                        ) : line.isQCPending || !line.movementId ? (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">Pending QC</span>
                                                                                        ) : (
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">Rejected</span>
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
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingInwardId(null);
                }}
                inwardId={editingInwardId}
            />

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title="Confirm Inactivation"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600 font-medium">
                        Are you sure you want to deactivate inward entry <span className="font-bold text-secondary-900">{inactiveTarget?.inwardNo}</span>?
                        This will mark the inward entry as inactive.
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
