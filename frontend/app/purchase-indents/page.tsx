"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
    Plus, FileText, CheckCircle, XCircle, Eye, Ban, Minus, ChevronRight, MoreVertical,
    ShoppingCart, Edit2, RotateCcw
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { PurchaseIndent, PurchaseIndentStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { PurchaseIndentDialog } from "@/components/purchase-indents/purchase-indent-dialog";
import { PurchaseIndentPreviewModal } from "@/components/purchase-indents/purchase-indent-preview-modal";
import { PurchaseOrderPreviewModal } from "@/components/purchase-orders/purchase-order-preview-modal";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/ui/access-denied";
import { Role } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { PIFilters } from "@/components/filters/pi-filters";
import { defaultPIFilters, buildPIFilterParams, type PIFiltersState } from "@/lib/pi-filters";
import { cn, formatDateTime } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { TablePagination } from "@/components/ui/table-pagination";

export default function PurchaseIndentsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [filters, setFilters] = useState<PIFiltersState>(defaultPIFilters);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedIndent, setSelectedIndent] = useState<PurchaseIndent | undefined>();
    const [expandedPIId, setExpandedPIId] = useState<number | null>(null);
    const [selectedPIIds, setSelectedPIIds] = useState<number[]>([]);
    const [inactiveTarget, setInactiveTarget] = useState<PurchaseIndent | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<{ pi: PurchaseIndent; action: "approve" | "reject" } | null>(null);
    const [revertTarget, setRevertTarget] = useState<PurchaseIndent | null>(null);
    const [previewPIId, setPreviewPIId] = useState<number | null>(null);
    const [previewPOId, setPreviewPOId] = useState<number | null>(null);
    const [poDialogOpen, setPoDialogOpen] = useState(false);
    const [preSelectedPiItemIds, setPreSelectedPiItemIds] = useState<number[]>([]);
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const queryClient = useQueryClient();
    const router = useRouter();

    const debouncedSearch = useDebouncedValue(filters.search, 400);
    const filterParams = useMemo(
        () => buildPIFilterParams({ ...filters, search: debouncedSearch }),
        [filters, debouncedSearch]
    );
    const queryKey = useMemo(() => ["purchase-indents", filterParams.toString()], [filterParams]);

    const { data: piData, isLoading } = useQuery<{ list: PurchaseIndent[]; totalCount: number }>({
        queryKey,
        queryFn: async () => {
            const res = await api.get("/purchase-indents?" + filterParams.toString());
            return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
        },
    });
    const indents = piData?.list ?? [];
    const totalCount = piData?.totalCount ?? 0;



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

    const approveMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Indent approved successfully");
            setApprovalTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed")
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Indent rejected successfully");
            setApprovalTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed")
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (id: number) => api.put(`/purchase-indents/${id}/toggle-status`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Status updated successfully");
            setInactiveTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Toggle failed")
    });

    const revertToPendingMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/revert-to-pending`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Indent reverted to Pending");
            setRevertTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Revert failed")
    });

    const getStatusBadge = (status: PurchaseIndentStatus) => {
        switch (status) {
            case PurchaseIndentStatus.Approved:
                return <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200">Approved</span>;
            case PurchaseIndentStatus.Rejected:
                return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200">Rejected</span>;
            case PurchaseIndentStatus.Pending:
            default:
                return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">Approval Pending</span>;
        }
    };

    const resetFilters = useCallback(() => {
        setFilters((prev) => ({ ...defaultPIFilters, pageSize: prev.pageSize, page: 1 }));
    }, []);

    const handleCreatePO = () => {
        if (selectedPIIds.length === 0) return;
        const piItemIds = indents
            .filter((pi) => selectedPIIds.includes(pi.id) && pi.status === PurchaseIndentStatus.Approved)
            .flatMap((pi) => (pi.items || []).filter((i) => !i.isInPO).map((i) => i.id));
        setPreSelectedPiItemIds(piItemIds);
        setPoDialogOpen(true);
    };

    const canRevertToPending = (pi: PurchaseIndent) =>
        pi.status === PurchaseIndentStatus.Approved &&
        permissions?.approvePI &&
        (pi.items || []).every((i) => !i.isInPO);

    /** Cannot deactivate PI if any of its items are in an active PO. */
    const canDeactivate = (pi: PurchaseIndent) => !(pi.items || []).some((i) => i.isInPO);

    /** PI can be selected for Create PO only while at least one of its items is not yet in any PO. */
    const canSelectPIForPO = (pi: PurchaseIndent) =>
        pi.status === PurchaseIndentStatus.Approved &&
        !!pi.isActive &&
        (pi.items?.length ?? 0) > 0 &&
        (pi.items ?? []).some((i: { isInPO?: boolean }) => !i.isInPO);

    const toggleSelection = (id: number, pi: PurchaseIndent) => {
        if (!canSelectPIForPO(pi)) {
            if (pi.status !== PurchaseIndentStatus.Approved || !pi.isActive)
                toast.error("Only approved indents can be selected for PO");
            else
                toast.error("All items in this indent are already in a PO");
            return;
        }
        setSelectedPIIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    if (permissions && !permissions.viewPI) {
        return <AccessDenied actionLabel="Go to Purchase Indents" actionHref="/purchase-indents" />;
    }

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Purchase Indents</h1>
                    <p className="text-secondary-500 text-sm">Manage die and pattern procurement requests</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectedPIIds.length > 0 && (
                        <Button
                            onClick={handleCreatePO}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all animate-pulse"
                        >
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Create PO ({selectedPIIds.length})
                        </Button>
                    )}
                    {permissions?.createPI && (
                        <Button
                            onClick={() => {
                                setSelectedIndent(undefined);
                                setDialogOpen(true);
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Indent
                        </Button>
                    )}
                </div>
            </div>

            <PIFilters
                filters={filters}
                onFiltersChange={setFilters}
                creatorOptions={creatorOptions}
                onClear={resetFilters}
                isAdmin={isAdmin}
                className="shadow-sm mb-6"
            />

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-11 px-0 text-center"></TableHead>
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]">
                                    <input
                                        type="checkbox"
                                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                        checked={indents.filter(pi => canSelectPIForPO(pi)).length > 0 && selectedPIIds.length === indents.filter(pi => canSelectPIForPO(pi)).length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPIIds(indents.filter(pi => canSelectPIForPO(pi)).map(pi => pi.id));
                                            } else {
                                                setSelectedPIIds([]);
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead className="w-16 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">PI NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">CREATED DATE</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center">APPROVAL STATUS</TableHead>
                                {isAdmin && (
                                    <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center">ACTIVE</TableHead>
                                )}
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right whitespace-nowrap">CREATED BY</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap">ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={isAdmin ? 9 : 8} className="h-16 px-6">
                                            <div className="h-4 bg-secondary-100 rounded-full w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : indents.length > 0 ? (
                                indents.map((pi, idx) => (
                                    <Fragment key={pi.id}><TableRow
                                            key={pi.id}
                                            className={cn(
                                                "border-b border-secondary-100 transition-all font-sans whitespace-nowrap group cursor-pointer",
                                                !pi.isActive && "opacity-60 bg-secondary-50/30",
                                                expandedPIId === pi.id ? "bg-primary-50/60" : "hover:bg-primary-50/30"
                                            )}
                                            onClick={() => setExpandedPIId(expandedPIId === pi.id ? null : pi.id)}
                                        >
                                            <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                                                <div className="flex items-center justify-center">
                                                    <motion.div
                                                        animate={{ rotate: expandedPIId === pi.id ? 90 : 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        style={{ originX: "50%", originY: "50%" }}
                                                        className={cn(
                                                            "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                                                            expandedPIId === pi.id ? "bg-primary-100/50 text-primary-600" : "text-secondary-400 group-hover:bg-primary-100 group-hover:text-primary-600"
                                                        )}
                                                    >
                                                        <ChevronRight className="w-5 h-5" />
                                                    </motion.div>
                                                </div>
                                            </TableCell>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    disabled={!canSelectPIForPO(pi)}
                                                    checked={selectedPIIds.includes(pi.id)}
                                                    onChange={() => toggleSelection(pi.id, pi)}
                                                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500 disabled:opacity-30"
                                                    title={!canSelectPIForPO(pi) && (pi.items ?? []).every((i: { isInPO?: boolean }) => i.isInPO) ? "All items already in a PO" : undefined}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center">{indents.length - idx}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-secondary-900 uppercase tracking-tight">{pi.piNo}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-secondary-700 text-sm">
                                                    {formatDateTime(pi.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(pi.status)}
                                            </td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 text-center text-[10px] font-bold">
                                                    {pi.isActive ? (
                                                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-200 uppercase tracking-widest">Active</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200 uppercase tracking-widest">Inactive</span>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right text-secondary-600 text-sm whitespace-nowrap">
                                                {pi.creatorName}
                                            </td>
                                            <td className="px-4 py-3 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    {permissions?.approvePI && pi.isActive && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-all"
                                                                    title="Approvals"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="min-w-[12rem] py-1">
                                                                {pi.status === PurchaseIndentStatus.Pending ? (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                requestAnimationFrame(() => setApprovalTarget({ pi, action: "approve" }));
                                                                            }}
                                                                            className="flex items-center gap-2 cursor-pointer py-2"
                                                                        >
                                                                            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                                                            <span>Approve</span>
                                                                        </DropdownMenuItem>
                                                                        <div className="my-1 border-t border-secondary-100" role="separator" />
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                requestAnimationFrame(() => setApprovalTarget({ pi, action: "reject" }));
                                                                            }}
                                                                            className="flex items-center gap-2 cursor-pointer py-2"
                                                                        >
                                                                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                                                            <span>Reject</span>
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                ) : pi.status === PurchaseIndentStatus.Approved && canRevertToPending(pi) ? (
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            requestAnimationFrame(() => setRevertTarget(pi));
                                                                        }}
                                                                        className="flex items-center gap-2 cursor-pointer py-2 text-amber-700"
                                                                    >
                                                                        <RotateCcw className="w-4 h-4 shrink-0" />
                                                                        <span>Revert to Pending</span>
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <div className="px-3 py-2 text-xs text-secondary-500 italic">
                                                                        No approval actions available
                                                                    </div>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                    {pi.isActive && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setPreviewPIId(pi.id)}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Preview"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {(pi.status === PurchaseIndentStatus.Pending || pi.status === PurchaseIndentStatus.Approved) && pi.isActive && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedIndent(pi);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Edit PI"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            disabled={pi.isActive && (pi.items ?? []).some((i: any) => i.isInPO)}
                                                            onClick={() => setInactiveTarget(pi)}
                                                            className={cn(
                                                                "h-8 w-8 p-0 border border-transparent rounded-lg transition-all",
                                                                pi.isActive && (pi.items ?? []).some((i: any) => i.isInPO) ? "opacity-30 cursor-not-allowed" : "",
                                                                pi.isActive ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100' : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                                            )}
                                                            title={pi.isActive && (pi.items ?? []).some((i: any) => i.isInPO) ? "Cannot deactivate because some items are in active POs" : pi.isActive ? "Deactivate" : "Activate"}
                                                        >
                                                            {pi.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedPIId === pi.id && (
                                                <TableRow key={`expand-${pi.id}`} className="hover:bg-transparent border-b border-secondary-100">
                                                    <td colSpan={isAdmin ? 9 : 8} className="p-0 border-none max-w-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                            className="overflow-hidden bg-secondary-50/10 w-full"
                                                        >
                                                            <div className="px-4 pb-4 pt-4">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm w-full">
                                                                    <div className="bg-secondary-50/50 px-4 py-2 border-b border-secondary-100 flex items-center justify-between">
                                                                        <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">
                                                                            Indent Items
                                                                        </p>
                                                                        <span className="text-[10px] font-medium text-secondary-400">
                                                                            Total Items: {pi.items?.length || 0}
                                                                        </span>
                                                                    </div>
                                                                    <div className="overflow-x-auto">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow className="bg-white border-b border-secondary-100 hover:bg-white">
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap w-12 text-center">SR.NO</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">Item Description</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap">Type</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">PO No</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">PO Date</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">Inward No</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">Inward Date</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">QC No</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-center">QC Date</TableHead>
                                                                                    <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-400 tracking-wider whitespace-nowrap text-right pr-6">Action</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {(pi.items || []).map((item, iidx) => (
                                                                                    <TableRow key={item.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/20 transition-colors whitespace-nowrap">
                                                                                        <TableCell className="px-4 py-2 text-secondary-400 font-medium text-[13px] text-center">
                                                                                            {iidx + 1}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2">
                                                                                            <div className="flex flex-col min-w-0">
                                                                                                <span className="font-bold text-secondary-900 text-[13px] tracking-tight truncate">
                                                                                                    {item.currentName}
                                                                                                </span>
                                                                                                <span className="text-[11px] text-secondary-500 font-medium tracking-tight truncate">
                                                                                                    {item.mainPartName}
                                                                                                </span>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2">
                                                                                            <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px] uppercase">
                                                                                                {item.itemTypeName}
                                                                                            </span>
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-center">
                                                                                            {item.poNo && item.poNo !== "-" ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[11px]">
                                                                                                    {item.poNo}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-secondary-400 text-[11px] italic font-medium">Pending PO</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] text-center">
                                                                                            {item.poId && item.poDate ? formatDateTime(item.poDate) : "—"}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-center">
                                                                                            {item.inwardNo ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold text-[11px]">
                                                                                                    {item.inwardNo}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-secondary-400 text-[11px] italic font-medium">Not Inwarded</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] text-center">
                                                                                            {item.inwardNo && item.inwardDate ? formatDateTime(item.inwardDate) : "—"}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-center">
                                                                                            {item.qcNo ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100 font-bold text-[11px]">
                                                                                                    {item.qcNo}
                                                                                                </span>
                                                                                            ) : item.inwardNo ? (
                                                                                                <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[11px]">
                                                                                                    Pending QC
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className="text-secondary-300 text-[11px]">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-secondary-600 font-medium text-[13px] text-center">
                                                                                            {item.qcNo && item.qcDate ? formatDateTime(item.qcDate) : "—"}
                                                                                        </TableCell>
                                                                                        <TableCell className="px-4 py-2 text-right pr-6">
                                                                                            {item.poId ? (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="h-7 px-3 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-all"
                                                                                                    onClick={() => {
                                                                                                        if (item.poId) setPreviewPOId(item.poId);
                                                                                                    }}
                                                                                                >
                                                                                                    Open PO
                                                                                                </Button>
                                                                                            ) : (
                                                                                                <span className="text-[11px] text-secondary-300 font-medium">—</span>
                                                                                            )}
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                </div>
                                                                {pi.remarks && (
                                                                    <div className="mt-3 p-3 bg-secondary-50/50 rounded-xl border border-secondary-200/50 italic text-[12px] text-secondary-500 shadow-sm">
                                                                        <span className="font-black not-italic uppercase text-[10px] text-secondary-400 block mb-1 tracking-widest">Indent Remarks</span>
                                                                        {pi.remarks}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    </td>
                                                </TableRow>
                                            )}
                                        </AnimatePresence></Fragment>
                                ))
                            ) : (
                                <TableRow key="empty">
                                    <td colSpan={isAdmin ? 9 : 8} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No indents found matching parameters.
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <TablePagination page={filters.page} pageSize={filters.pageSize} totalCount={totalCount} onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} />
            </Card>

            <PurchaseIndentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                indent={selectedIndent}
                onOpenPreview={(id) => setPreviewPIId(id)}
                readOnly={
                    !!selectedIndent &&
                    (
                        permissions?.editPI !== true ||
                        selectedIndent.isActive === false ||
                        selectedIndent.status !== PurchaseIndentStatus.Pending
                    )
                }
            />

            {/* Inactivate Confirmation */}
            <Dialog
                isOpen={!!inactiveTarget}
                onClose={() => setInactiveTarget(null)}
                title={inactiveTarget?.isActive ? "Confirm Deactivation" : "Confirm Activation"}
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to {inactiveTarget?.isActive ? 'deactivate' : 'activate'} <span className="font-bold text-secondary-900">{inactiveTarget?.piNo}</span>?
                        {inactiveTarget?.isActive && " This indent will be hidden from non-admin users and excluded from PO creation."}
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
                            className={`flex-1 text-white font-bold ${inactiveTarget?.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}
                            onClick={() => inactiveTarget && toggleActiveMutation.mutate(inactiveTarget.id)}
                            disabled={toggleActiveMutation.isPending}
                        >
                            {toggleActiveMutation.isPending ? "Processing..." : inactiveTarget?.isActive ? "Deactivate" : "Activate"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Approve / Reject Confirmation */}
            <Dialog
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                title={approvalTarget?.action === "approve" ? "Approve Purchase Indent" : "Reject Purchase Indent"}
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to <span className={approvalTarget?.action === "approve" ? "text-green-600 font-bold uppercase" : "text-rose-600 font-bold uppercase"}>
                            {approvalTarget?.action}
                        </span> indent <span className="font-bold text-secondary-900">{approvalTarget?.pi?.piNo}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setApprovalTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className={`flex-1 text-white font-bold ${approvalTarget?.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-rose-600 hover:bg-rose-700"}`}
                            onClick={() => {
                                if (!approvalTarget) return;
                                if (approvalTarget.action === "approve") approveMutation.mutate(approvalTarget.pi.id);
                                else rejectMutation.mutate(approvalTarget.pi.id);
                            }}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                            {approveMutation.isPending || rejectMutation.isPending ? "Processing..." : approvalTarget?.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Revert to Pending Confirmation */}
            <Dialog
                isOpen={!!revertTarget}
                onClose={() => setRevertTarget(null)}
                title="Revert to Pending"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Revert indent <span className="font-bold text-secondary-900">{revertTarget?.piNo}</span> back to Pending? No PO has been created from this indent. This action cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setRevertTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={() => revertTarget && revertToPendingMutation.mutate(revertTarget.id)}
                            disabled={revertToPendingMutation.isPending}
                        >
                            {revertToPendingMutation.isPending ? "Reverting..." : "Revert to Pending"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* PI Preview (full-screen document viewer + print) */}
            {previewPIId != null && (
                <PurchaseIndentPreviewModal
                    piId={previewPIId}
                    onClose={() => setPreviewPIId(null)}
                />
            )}

            {previewPOId != null && (
                <PurchaseOrderPreviewModal
                    poId={previewPOId}
                    onClose={() => setPreviewPOId(null)}
                />
            )}

            {/* PO Create from selected PIs */}
            {poDialogOpen && (
                <PurchaseOrderDialog
                    open={poDialogOpen}
                    onOpenChange={(open) => {
                        setPoDialogOpen(open);
                        if (!open) setPreSelectedPiItemIds([]);
                    }}
                    preSelectedPiItemIds={preSelectedPiItemIds}
                />
            )}
        </div>
    );
}


