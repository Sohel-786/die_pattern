"use client";

import { useState, useCallback, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, ChevronRight, Minus, Edit2,
    Package, Ban, CheckCircle2, Eye, LayoutGrid, X, Search, Printer, Truck, ArrowRight
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import api from "@/lib/api";
import { Transfer, Party, Role } from "@/types";
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
import { useDebounce } from "@/hooks/use-debounce";
import { AccessDenied } from "@/components/ui/access-denied";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { TransferFilters } from "@/components/filters/transfer-filters";
import { initialTransferFilters, TransferFiltersState, buildTransferFilterParams } from "@/lib/transfer-filters";
import { toast } from "react-hot-toast";
import { TransferDialog } from "@/components/transfers/transfer-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function TransfersPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const { user: currentUser } = useCurrentUser();
    const queryClient = useQueryClient();

    const [filters, setFilters] = useState<TransferFiltersState>(initialTransferFilters);
    const [expandedTransferId, setExpandedTransferId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
    const [inactiveTarget, setInactiveTarget] = useState<Transfer | null>(null);

    const debouncedSearch = useDebounce(filters.search, 500);

    const queryParams = useMemo(() =>
        buildTransferFilterParams({ ...filters, search: debouncedSearch }),
        [filters, debouncedSearch]
    );

    const { data: transfers = [], isLoading } = useQuery<Transfer[]>({
        queryKey: ["transfers", queryParams.toString()],
        queryFn: async () => {
            const res = await api.get("/transfers?" + queryParams.toString());
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewTransfer
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
            api.patch(`/transfers/${id}/active`, null, { params: { active } }),
        onSuccess: () => {
            toast.success("Transfer status updated");
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
        },
        onError: (err: any) => toast.error(err.response?.data?.message ?? "Failed to update Transfer status")
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

    const { data: allItems = [] } = useQuery<any[]>({
        queryKey: ["items-minimal"],
        queryFn: async () => {
            const res = await api.get("/items");
            return res.data.data ?? [];
        }
    });

    const itemOptions = useMemo(() =>
        allItems.map(i => ({ label: [i.currentName, i.mainPartName].filter(Boolean).join(" – ") || `Item ${i.id}`, value: i.id })),
        [allItems]);

    const isAdmin = currentUser?.role === Role.ADMIN;

    const resetFilters = useCallback(() => {
        setFilters(initialTransferFilters);
    }, []);

    if (permissions && !permissions.viewTransfer) {
        return <AccessDenied actionLabel="Go to Transfers" actionHref="/transfers" />;
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden font-sans">
            {/* Header Area */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Transfer Entries</h1>
                    <p className="text-secondary-500 text-sm tracking-tight font-medium">Manage item transfers between parties and locations</p>
                </div>
                {permissions?.createTransfer && (
                    <Button
                        onClick={() => {
                            setSelectedTransfer(null);
                            setDialogOpen(true);
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all shadow-primary-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Transfer
                    </Button>
                )}
            </div>

            {/* Filter Area */}
            <TransferFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClear={resetFilters}
                partyOptions={partyOptions}
                creatorOptions={creatorOptions}
                itemOptions={itemOptions}
                isAdmin={isAdmin}
                className="shrink-0 mb-6"
            />

            {/* Main Table Container */}
            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col bg-white">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900 hover:bg-primary-100">
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">TRANSFER NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">FROM SOURCE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">TO DESTINATION</TableHead>
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
                            ) : transfers.length > 0 ? (
                                transfers.map((tr, idx) => (
                                    <Fragment key={tr.id}>
                                        <TableRow
                                            className={cn(
                                                "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                                                expandedTransferId === tr.id && "bg-primary-50/30",
                                                !tr.isActive && "bg-secondary-50/50 opacity-75"
                                            )}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedTransferId(expandedTransferId === tr.id ? null : tr.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500 hover:bg-white border border-transparent hover:border-secondary-200 rounded"
                                                >
                                                    {expandedTransferId === tr.id ? <Minus className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{transfers.length - idx}</td>
                                            <td className="px-4 py-3 font-bold text-secondary-900 text-sm">{tr.transferNo}</td>
                                            <td className="px-4 py-3 text-secondary-700 text-sm">
                                                {format(new Date(tr.transferDate), "dd MMM yyyy")}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={cn(
                                                    "inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-tight",
                                                    tr.fromPartyId ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-primary-50 text-primary-700 border border-primary-100"
                                                )}>
                                                    {tr.fromPartyName || "Our Location"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3 text-secondary-400" />
                                                <span className={cn(
                                                    "inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-tight",
                                                    tr.toPartyId ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-primary-50 text-primary-700 border border-primary-100"
                                                )}>
                                                    {tr.toPartyName || "Our Location"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border",
                                                    tr.isActive !== false ? "bg-green-50 text-green-700 border-green-200" : "bg-secondary-100 text-secondary-600 border-secondary-200"
                                                )}>
                                                    {tr.isActive !== false ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm">
                                                {tr.creatorName ?? "System"}
                                            </td>
                                            <td className="px-4 py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {permissions?.editTransfer && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedTransfer(tr);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Edit Transfer"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                    {permissions?.editTransfer && currentUser?.role === Role.ADMIN && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                if (tr.isActive) setInactiveTarget(tr);
                                                                else toggleActiveMutation.mutate({ id: tr.id, active: true });
                                                            }}
                                                            disabled={toggleActiveMutation.isPending}
                                                            className={cn(
                                                                "h-8 w-8 p-0 border border-transparent rounded-lg transition-all",
                                                                tr.isActive ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50" : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                                                            )}
                                                            title={tr.isActive ? "Deactivate" : "Activate"}
                                                        >
                                                            {tr.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedTransferId === tr.id && (
                                                <TableRow key={`expand-${tr.id}`} className="bg-secondary-50/10 border-b border-secondary-100 border-t-0 p-0 hover:bg-secondary-50/10">
                                                    <td colSpan={9} className="p-0 border-0 max-w-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider px-4 py-2 border-b border-secondary-100">
                                                                        Transferred Items
                                                                    </p>
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-12 text-center">SR.NO</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">ITEM DESCRIPTION</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">TYPE</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">MATERIAL</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">DRAWING NO. / REV</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">REMARKS</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {tr.items?.map((item, lidx) => (
                                                                                <TableRow key={lidx} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30">
                                                                                    <TableCell className="px-4 py-2 text-secondary-500 font-medium text-sm text-center">{lidx + 1}</TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col min-w-0">
                                                                                            <span className="font-semibold text-secondary-900 text-sm">{item.currentName ?? "—"}</span>
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
                                                                                    <TableCell className="px-4 py-2 text-secondary-600 text-sm italic">{item.remarks || "—"}</TableCell>
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
                                                <LayoutGrid className="w-6 h-6" />
                                            </div>
                                            <p className="text-secondary-400 font-bold text-sm uppercase tracking-widest">No transfer entries found</p>
                                        </div>
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <TransferDialog
                open={dialogOpen}
                onOpenChange={(open: boolean) => {
                    setDialogOpen(open);
                    if (!open) setSelectedTransfer(null);
                }}
                transfer={selectedTransfer}
            />

            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title="Confirm Inactivation"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600 font-medium">
                        Are you sure you want to deactivate transfer entry <span className="font-bold text-secondary-900">{inactiveTarget?.transferNo}</span>?
                        This will mark the entry as inactive and return items to their source state.
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
