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
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/ui/access-denied";
import { cn, formatDateTime } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { InwardDialog } from "@/components/inwards/inward-dialog";
import { InwardFilters } from "@/components/filters/inward-filters";
import { initialInwardFilters, InwardFiltersState, buildInwardFilterParams } from "@/lib/inward-filters";
import { toast } from "react-hot-toast";
import { useDebounce } from "@/hooks/use-debounce";
import { TablePagination } from "@/components/ui/table-pagination";

export default function InwardsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<InwardFiltersState>(initialInwardFilters);
    const [expandedInwardId, setExpandedInwardId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingInwardId, setEditingInwardId] = useState<number | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<Inward | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);
    const debouncedSourceNo = useDebounce(filters.sourceNo, 500);

    const queryParams = useMemo(() =>
        buildInwardFilterParams({ ...filters, search: debouncedSearch, sourceNo: debouncedSourceNo }),
        [filters, debouncedSearch, debouncedSourceNo]
    );

    const { data: inwardData, isLoading } = useQuery<{ list: Inward[]; totalCount: number }>({
        queryKey: ["inwards", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/inwards?" + queryParams.toString());
            return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
        },
        enabled: !!permissions?.viewInward
    });
    const inwards = inwardData?.list ?? [];
    const totalCount = inwardData?.totalCount ?? 0;

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
        setFilters((prev) => ({ ...initialInwardFilters, pageSize: prev.pageSize, page: 1 }));
    }, []);

    if (permissions && !permissions.viewInward) {
        return <AccessDenied actionLabel="Go to Inwards" actionHref="/inwards" />;
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden text-sans">
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
                partyOptions={partyOptions}
                creatorOptions={creatorOptions}
                onClear={resetFilters}
                isAdmin={isAdmin}
                className="shrink-0 mb-6"
            />

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900 hover:bg-primary-100">
                                <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-11 px-0 text-center"></TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-primary-900 tracking-wider text-center w-12">SR.NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">INWARD NO</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">INWARD DATE</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">PARTY NAME</TableHead>
                                <TableHead className="h-11 px-4 text-[10px] font-black uppercase text-secondary-700 tracking-wider">INWARD FROM</TableHead>
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
                            ) : inwards.length > 0 ? (
                                inwards.map((i, idx) => (
                                    <Fragment key={i.id}><TableRow
                                             className={cn(
                                                 "border-b border-secondary-100 transition-all font-sans whitespace-nowrap group cursor-pointer",
                                                 expandedInwardId === i.id ? "bg-primary-50/60" : "hover:bg-primary-50/30",
                                                 !i.isActive && "bg-secondary-50/50 opacity-75"
                                             )}
                                             onClick={() => setExpandedInwardId(expandedInwardId === i.id ? null : i.id)}
                                         >
                                             <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                                 <div className="flex items-center justify-center">
                                                     <motion.div
                                                         animate={{ rotate: expandedInwardId === i.id ? 90 : 0 }}
                                                         transition={{ duration: 0.2, ease: "easeInOut" }}
                                                         style={{ originX: "50%", originY: "50%" }}
                                                         className={cn(
                                                             "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                                             expandedInwardId === i.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                                                         )}
                                                     >
                                                         <ChevronRight className="w-5 h-5" />
                                                     </motion.div>
                                                 </div>
                                             </TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-400 font-bold text-center text-xs">
                                                {String(inwards.length - idx).padStart(2, '0')}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-bold text-secondary-900 text-sm">{i.inwardNo}</TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-700 text-sm">
                                                {formatDateTime(i.createdAt || i.inwardDate)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-medium text-secondary-800 text-sm">
                                                {i.vendorName ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-secondary-500 font-medium text-xs">
                                                {i.inwardFrom || "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                                    i.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                )}>
                                                    {i.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right text-secondary-600 text-sm whitespace-nowrap">
                                                {i.creatorName ?? "System"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
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
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (i.isActive) setInactiveTarget(i);
                                                                else toggleActiveMutation.mutate({ id: i.id!, active: true });
                                                            }}
                                                            disabled={i.isActive && i.hasActiveQC}
                                                            className={cn(
                                                                "h-8 w-8 p-0 border border-transparent rounded-lg transition-all",
                                                                i.isActive ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50",
                                                                i.isActive && i.hasActiveQC && "opacity-30 cursor-not-allowed grayscale"
                                                            )}
                                                            title={i.isActive ? (i.hasActiveQC ? "Cannot deactivate - active QC entry exists" : "Deactivate") : "Activate"}
                                                        >
                                                            {i.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedInwardId === i.id && (
                                                <TableRow key={`expand-${i.id}`} className="hover:bg-transparent border-b border-secondary-100">
                                                    <td colSpan={9} className="p-0 border-none max-w-0">
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
                                                                            Inward Items
                                                                        </p>
                                                                        <span className="text-[10px] font-medium text-secondary-400">
                                                                            Total: {i.lines?.length || 0} item(s)
                                                                        </span>
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="bg-white border-b border-secondary-100 hover:bg-white text-nowrap">
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider w-14 text-center">SR.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">
                                                                                        {i.inwardFrom?.includes("Purchase Order") ? "PO NO."
                                                                                            : i.inwardFrom?.includes("Job Work") ? "JOBWORK NO."
                                                                                                : i.inwardFrom?.includes("Outward") ? "OUTWARD NO."
                                                                                                    : "SOURCE NO."}
                                                                                    </TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">
                                                                                        {i.inwardFrom?.includes("Purchase Order") ? "PO DATE"
                                                                                            : i.inwardFrom?.includes("Job Work") ? "JW DATE"
                                                                                                : "DATE"}
                                                                                    </TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">ITEM DESCRIPTION</TableHead>
                                                                                    {i.inwardFrom?.includes("Purchase Order") ? (
                                                                                        <>
                                                                                            <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">PO REF RATE</TableHead>
                                                                                            <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">INW RATE</TableHead>
                                                                                            <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">GST%</TableHead>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">JW RATE</TableHead>
                                                                                            <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center">JW GST%</TableHead>
                                                                                        </>
                                                                                    )}
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-right">TOTAL AMOUNT</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">TYPE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider w-40">DRAWING NO / REV</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">MATERIAL</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">LINE REMARKS</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">QC NO.</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider">QC DATE</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider text-center w-24 pr-6">QC STATUS</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                        <TableBody>
                                                                            {i.lines?.map((line, lidx) => (
                                                                                <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 text-nowrap">
                                                                                    <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-primary-700 font-bold text-[13px]">{line.sourceRefDisplay || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-500 font-medium text-[11px]">
                                                                                        {line.sourceDate ? formatDateTime(line.sourceDate) : "—"}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-bold text-secondary-900 text-[13px] tracking-tight">{line.itemName ?? "—"}</span>
                                                                                            {line.newDisplayNameFromJobWork ? (
                                                                                                <span className="text-[11px] text-primary-600 font-medium mt-0.5">→ New after QC: {line.newDisplayNameFromJobWork}</span>
                                                                                            ) : null}
                                                                                            <span className="text-[11px] text-secondary-500 font-medium">{line.mainPartName ?? "—"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    {i.inwardFrom?.includes("Purchase Order") ? (
                                                                                        <>
                                                                                            <TableCell className="px-4 py-2 text-secondary-400 text-[10px] text-right font-medium">
                                                                                                {line.sourceType === InwardSourceType.PO ? `₹${line.sourceRate?.toLocaleString() ?? "0"} @ ${line.sourceGstPercent ?? "0"}%` : "—"}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-900 font-bold text-[13px] text-right">
                                                                                                {line.rate ? `₹${line.rate.toLocaleString()}` : "—"}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-700 text-[12px] text-center font-medium">
                                                                                                {line.gstPercent ? `${line.gstPercent}%` : "—"}
                                                                                            </TableCell>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <TableCell className="px-4 py-2 text-secondary-900 font-bold text-[13px] text-right">
                                                                                                {line.rate ? `₹${line.rate.toLocaleString()}` : "—"}
                                                                                            </TableCell>
                                                                                            <TableCell className="px-4 py-2 text-secondary-700 text-[12px] text-center font-medium">
                                                                                                {line.gstPercent ? `${line.gstPercent}%` : "—"}
                                                                                            </TableCell>
                                                                                        </>
                                                                                    )}
                                                                                    <TableCell className="px-4 py-2 text-secondary-900 font-black text-[13px] text-right">
                                                                                        ₹{((line.rate || 0) + ((line.rate || 0) * (line.gstPercent || 0) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px] uppercase">
                                                                                            {line.itemTypeName || "—"}
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col items-center min-w-0">
                                                                                            <span className="font-medium text-secondary-800 text-[13px]">{line.drawingNo || "N/A"}</span>
                                                                                            <span className="text-[10px] text-secondary-400 font-medium">REV: {line.revisionNo ?? "0"}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-600 text-[12px]">{line.materialName ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-[12px] text-secondary-500 italic max-w-xs truncate">{line.remarks ?? "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-indigo-700 font-bold text-[12px]">{line.qcNo || "—"}</TableCell>
                                                                                    <TableCell className="px-4 py-2 text-secondary-500 text-[11px]">
                                                                                        {line.qcDate ? formatDateTime(line.qcDate) : "—"}
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-center pr-6">
                                                                                        {line.qcNo ? (
                                                                                            line.isQCApproved ? (
                                                                                                <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-200">Approved</span>
                                                                                            ) : line.isQCPending ? (
                                                                                                <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                                                                                            ) : (
                                                                                                <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm bg-rose-50 text-rose-700 border-rose-200">Rejected</span>
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="text-secondary-300">—</span>
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
                <TablePagination page={filters.page} pageSize={filters.pageSize} totalCount={totalCount} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
            </Card>

            <InwardDialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingInwardId(null);
                }}
                inwardId={editingInwardId}
                readOnly={!!editingInwardId && !permissions?.editInward}
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
