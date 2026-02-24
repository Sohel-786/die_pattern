"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, FileText, CheckCircle, Clock,
    XCircle, Filter, ChevronRight, User, Calendar,
    MoreVertical, Eye, Ban, Minus, ChevronDown, ChevronUp,
    CheckSquare, Square, ShoppingCart, Edit2, Send, Printer, FileCheck
} from "lucide-react";
import api from "@/lib/api";
import { PurchaseIndent, PurchaseIndentStatus, PurchaseIndentItem, PurchaseIndentType } from "@/types";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PurchaseIndentDialog } from "@/components/purchase-indents/purchase-indent-dialog";
import { PurchaseIndentPreviewModal } from "@/components/purchase-indents/purchase-indent-preview-modal";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types";
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
import { useState, Fragment } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { useCurrentUserPermissions } from "@/hooks/use-settings";

export default function PurchaseIndentsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedIndent, setSelectedIndent] = useState<PurchaseIndent | undefined>();
    const [expandedPIId, setExpandedPIId] = useState<number | null>(null);
    const [selectedPIIds, setSelectedPIIds] = useState<number[]>([]);
    const [inactiveTarget, setInactiveTarget] = useState<PurchaseIndent | null>(null);
    const [approvalTarget, setApprovalTarget] = useState<{ pi: PurchaseIndent, action: 'approve' | 'reject' } | null>(null);
    const [submitTarget, setSubmitTarget] = useState<PurchaseIndent | null>(null);
    const [previewPIId, setPreviewPIId] = useState<number | null>(null);
    const [poDialogOpen, setPoDialogOpen] = useState(false);
    const [preSelectedPiItemIds, setPreSelectedPiItemIds] = useState<number[]>([]);
    const { user } = useAuth();
    const isAdmin = user?.role === Role.ADMIN;
    const router = useRouter();

    if (permissions && !permissions.viewPI) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don't have the required clearance to view purchase indents.</p>
                </div>
            </div>
        );
    }

    const queryClient = useQueryClient();

    const { data: indents = [], isLoading } = useQuery<PurchaseIndent[]>({
        queryKey: ["purchase-indents"],
        queryFn: async () => {
            const res = await api.get("/purchase-indents");
            return res.data.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            toast.success("Indent approved successfully");
            setApprovalTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed")
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/reject`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            toast.success("Indent rejected successfully");
            setApprovalTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Rejection failed")
    });

    const submitMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-indents/${id}/submit`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            toast.success("Indent submitted for approval");
            setSubmitTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Submit failed")
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (id: number) => api.put(`/purchase-indents/${id}/toggle-status`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
            toast.success("Status updated successfully");
            setInactiveTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Toggle failed")
    });

    const getStatusBadge = (status: PurchaseIndentStatus) => {
        switch (status) {
            case PurchaseIndentStatus.Draft:
                return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">Draft</span>;
            case PurchaseIndentStatus.Approved:
                return <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200">Approved</span>;
            case PurchaseIndentStatus.Rejected:
                return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200">Rejected</span>;
            case PurchaseIndentStatus.Pending:
            default:
                return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">Pending</span>;
        }
    };

    const filteredIndents = indents.filter(pi => {
        const matchesSearch = pi.piNo.toLowerCase().includes(search.toLowerCase()) ||
            pi.creatorName?.toLowerCase().includes(search.toLowerCase());

        let matchesStatus = true;
        if (statusFilter !== "All") {
            const statusMap: Record<string, PurchaseIndentStatus> = {
                "Draft": PurchaseIndentStatus.Draft,
                "Pending": PurchaseIndentStatus.Pending,
                "Approved": PurchaseIndentStatus.Approved,
                "Rejected": PurchaseIndentStatus.Rejected
            };
            matchesStatus = pi.status === statusMap[statusFilter];
        }

        return matchesSearch && matchesStatus;
    });

    const handleCreatePO = () => {
        if (selectedPIIds.length === 0) return;
        const piItemIds = indents
            .filter((pi) => selectedPIIds.includes(pi.id) && pi.status === PurchaseIndentStatus.Approved)
            .flatMap((pi) => pi.items.filter((i) => !i.isInPO).map((i) => i.id));
        setPreSelectedPiItemIds(piItemIds);
        setPoDialogOpen(true);
    };

    const toggleSelection = (id: number, status: PurchaseIndentStatus) => {
        if (status !== PurchaseIndentStatus.Approved) {
            toast.error("Only approved indents can be selected for PO");
            return;
        }
        setSelectedPIIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    return (
        <div className="p-4 space-y-4 bg-secondary-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-2">
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

            <Card className="border-secondary-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Indent No or Creator..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-secondary-100 p-1 rounded-xl gap-1 flex-wrap">
                        {["All", "Draft", "Pending", "Approved", "Rejected"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                                    ? "bg-white text-primary-600 shadow-sm"
                                    : "text-secondary-500 hover:text-secondary-700"
                                    }`}
                            >
                                {status === "All" ? "All Indents" : status}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary-500 hover:text-primary-600 font-bold text-xs uppercase tracking-wider"
                        onClick={() => { setSearch(""); setStatusFilter("All"); }}
                    >
                        Clear Filters
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]">
                                    <input
                                        type="checkbox"
                                        className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                        checked={selectedPIIds.length === filteredIndents.filter(pi => pi.status === PurchaseIndentStatus.Approved).length && filteredIndents.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPIIds(filteredIndents.filter(pi => pi.status === PurchaseIndentStatus.Approved).map(pi => pi.id));
                                            } else {
                                                setSelectedPIIds([]);
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead className="w-16 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">PI No</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Created Date</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Created By</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center">Approval Status</TableHead>
                                {isAdmin && (
                                    <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center">Active Status</TableHead>
                                )}
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={6} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredIndents.length > 0 ? (
                                filteredIndents.map((pi, idx) => (
                                    <Fragment key={pi.id}>
                                        <TableRow
                                            key={pi.id}
                                            className={`border-b border-secondary-100 hover:bg-secondary-50 transition-all group font-sans whitespace-nowrap ${!pi.isActive ? 'opacity-60 bg-secondary-50/30' : ''}`}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setExpandedPIId(expandedPIId === pi.id ? null : pi.id)}
                                                    className="h-6 w-6 p-0 text-secondary-500"
                                                >
                                                    {expandedPIId === pi.id ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                </Button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    disabled={pi.status !== PurchaseIndentStatus.Approved || !pi.isActive}
                                                    checked={selectedPIIds.includes(pi.id)}
                                                    onChange={() => toggleSelection(pi.id, pi.status)}
                                                    className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500 disabled:opacity-30"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-secondary-900 uppercase tracking-tight">{pi.piNo}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-secondary-700 text-xs">{format(new Date(pi.createdAt), 'dd/MM/yyyy')}</div>
                                                <div className="text-[10px] text-secondary-400 font-medium uppercase">{format(new Date(pi.createdAt), 'HH:mm')}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-secondary-700 text-xs">{pi.creatorName}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {pi.status === PurchaseIndentStatus.Pending && permissions?.approvePI ? (
                                                        <div className="flex items-center gap-2">
                                                            {getStatusBadge(pi.status)}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-full transition-all"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-32">
                                                                    <DropdownMenuItem onClick={() => setApprovalTarget({ pi, action: 'approve' })} className="text-green-600 font-bold text-xs uppercase cursor-pointer flex items-center">
                                                                        <CheckCircle className="w-3.5 h-3.5 mr-2" /> Approve
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setApprovalTarget({ pi, action: 'reject' })} className="text-rose-600 font-bold text-xs uppercase cursor-pointer flex items-center">
                                                                        <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    ) : (
                                                        getStatusBadge(pi.status)
                                                    )}
                                                </div>
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
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPreviewPIId(pi.id)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                        title="Preview"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {(pi.status === PurchaseIndentStatus.Draft || pi.status === PurchaseIndentStatus.Pending) && permissions?.editPI && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedIndent(pi);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                            title="Edit Indent"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {pi.status === PurchaseIndentStatus.Draft && permissions?.createPI && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSubmitTarget(pi)}
                                                            className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                            title="Submit for Approval"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {pi.status === PurchaseIndentStatus.Approved && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setPreviewPIId(pi.id)}
                                                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white rounded-lg transition-all"
                                                            title="Preview / Print"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    )}

                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setInactiveTarget(pi)}
                                                            className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${pi.isActive
                                                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                                                : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                                                }`}
                                                            title={pi.isActive ? "Deactivate" : "Activate"}
                                                        >
                                                            {pi.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </TableRow>

                                        <AnimatePresence>
                                            {expandedPIId === pi.id && (
                                                <TableRow key={`expand-${pi.id}`} className="bg-secondary-50/50">
                                                    <td colSpan={isAdmin ? 9 : 8} className="p-0">
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="px-12 py-4 bg-secondary-50/50 border-x border-secondary-100 shadow-inner">
                                                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                                                                <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 tracking-widest">Name</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 tracking-widest">Type</TableHead>
                                                                                <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 tracking-widest text-right">PO No</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {pi.items.map((item: any) => (
                                                                                <TableRow key={item.id} className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30 transition-colors">
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-[11px] font-bold text-secondary-900 uppercase">{item.currentName}</span>
                                                                                            <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-tighter">{item.mainPartName}</span>
                                                                                        </div>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2">
                                                                                        <span className="text-[10px] font-bold text-primary-600 uppercase bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">{item.itemTypeName}</span>
                                                                                    </TableCell>
                                                                                    <TableCell className="px-4 py-2 text-right">
                                                                                        <span className={`text-[11px] font-black uppercase ${item.poNo !== '-' ? 'text-indigo-600 tracking-tighter' : 'text-secondary-300'}`}>
                                                                                            {item.poNo}
                                                                                        </span>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                </div>
                                                                {pi.remarks && (
                                                                    <div className="mt-4 p-3 bg-secondary-50 rounded-xl border border-secondary-100 italic text-[11px] text-secondary-500">
                                                                        <span className="font-bold not-italic uppercase text-[10px] text-secondary-400 block mb-1">Remarks:</span>
                                                                        {pi.remarks}
                                                                    </div>
                                                                )}
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
                                    <td colSpan={6} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No indents found matching parameters.
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <PurchaseIndentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                indent={selectedIndent}
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

            {/* Submit for Approval Confirmation */}
            <Dialog
                isOpen={!!submitTarget}
                onClose={() => setSubmitTarget(null)}
                title="Submit for Approval"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Submit indent <span className="font-bold text-secondary-900">{submitTarget?.piNo}</span> for approval? It will move to Pending status and become eligible for approval.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setSubmitTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                            onClick={() => submitTarget && submitMutation.mutate(submitTarget.id)}
                            disabled={submitMutation.isPending}
                        >
                            {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Approve / Reject Confirmation */}
            <Dialog
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                title={approvalTarget?.action === 'approve' ? "Approve Purchase Indent" : "Reject Purchase Indent"}
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Are you sure you want to <span className={approvalTarget?.action === 'approve' ? 'text-green-600 font-bold uppercase' : 'text-rose-600 font-bold uppercase'}>
                            {approvalTarget?.action}
                        </span> indent <span className="font-bold text-secondary-900">{approvalTarget?.pi?.piNo}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setApprovalTarget(null)}
                            className="flex-1 font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            className={`flex-1 text-white font-bold ${approvalTarget?.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                            onClick={() => {
                                if (!approvalTarget) return;
                                if (approvalTarget.action === 'approve') {
                                    approveMutation.mutate(approvalTarget.pi.id);
                                } else {
                                    rejectMutation.mutate(approvalTarget.pi.id);
                                }
                            }}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                            {(approveMutation.isPending || rejectMutation.isPending) ? "Processing..." : approvalTarget?.action === 'approve' ? "Confirm Approve" : "Confirm Reject"}
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


