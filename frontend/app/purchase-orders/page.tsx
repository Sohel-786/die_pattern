"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, ShoppingCart, CheckCircle,
    Eye, Building2, IndianRupee, Printer, Send, Edit2
} from "lucide-react";
import api from "@/lib/api";
import { PO, PoStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { PurchaseOrderPreviewModal } from "@/components/purchase-orders/purchase-order-preview-modal";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { Dialog } from "@/components/ui/dialog";

export default function PurchaseOrdersPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [previewPOId, setPreviewPOId] = useState<number | null>(null);
    const [approveTarget, setApproveTarget] = useState<PO | null>(null);
    const [submitTarget, setSubmitTarget] = useState<PO | null>(null);
    const [poDialogOpen, setPoDialogOpen] = useState(false);
    const [editPO, setEditPO] = useState<PO | null>(null);

    if (permissions && !permissions.viewPO) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShoppingCart className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don't have the required clearance to view purchase orders.</p>
                </div>
            </div>
        );
    }
    const queryClient = useQueryClient();

    const { data: orders = [], isLoading } = useQuery<PO[]>({
        queryKey: ["purchase-orders"],
        queryFn: async () => {
            const res = await api.get("/purchase-orders");
            return res.data.data;
        },
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-orders/${id}/approve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            toast.success("Order approved successfully");
            setApproveTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed")
    });

    const submitMutation = useMutation({
        mutationFn: (id: number) => api.post(`/purchase-orders/${id}/submit`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
            toast.success("PO submitted for approval");
            setSubmitTarget(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Submit failed")
    });

    const getStatusBadge = (status: PoStatus) => {
        switch (status) {
            case PoStatus.Draft:
                return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">Draft</span>;
            case PoStatus.Approved:
                return <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200">Approved</span>;
            case PoStatus.Rejected:
                return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200">Rejected</span>;
            case PoStatus.Pending:
            default:
                return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">Pending</span>;
        }
    };

    const filteredOrders = orders.filter(po => {
        const matchesSearch = po.poNo.toLowerCase().includes(search.toLowerCase()) ||
            po.vendorName?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || (typeof po.status === "string" ? po.status === statusFilter : String(po.status) === statusFilter);
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 space-y-4 bg-secondary-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Purchase Orders</h1>
                    <p className="text-secondary-500 text-sm">Official procurement and repair work orders</p>
                </div>
                {permissions?.createPO && (
                    <Button
                        onClick={() => { setEditPO(null); setPoDialogOpen(true); }}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Issue New PO
                    </Button>
                )}
            </div>

            <Card className="border-secondary-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by PO No or Vendor..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Status</Label>
                        <select
                            className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/10 w-40"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                        </select>
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
                            <TableRow className="bg-primary-50 border-secondary-100 divide-x divide-secondary-100">
                                <TableHead className="w-16 h-11 text-center font-bold text-primary-900 uppercase tracking-tight text-[11px]">Sr.No</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Order Details</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Vendor / Items</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Valuation</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px] text-center">Status</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px] text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={6} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map((po, idx) => (
                                    <TableRow
                                        key={po.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans whitespace-nowrap"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{po.poNo}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{format(new Date(po.createdAt), 'dd MMM yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 font-bold text-secondary-700 text-[11px] uppercase">
                                                    <Building2 className="w-3.5 h-3.5 text-secondary-400" />
                                                    {po.vendorName}
                                                </div>
                                                <span className="text-[10px] font-bold text-primary-600 uppercase italic">
                                                    {po.items.length} Line Items
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-secondary-900 flex items-center">
                                                    <IndianRupee className="w-3 h-3 mr-0.5" />
                                                    {(po.totalAmount ?? po.subtotal ?? 0).toLocaleString()}
                                                </span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">
                                                    {po.deliveryDate ? `Due: ${format(new Date(po.deliveryDate), 'dd MMM')}` : 'TBD'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(po.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPreviewPOId(po.id)}
                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {po.status === PoStatus.Approved && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setPreviewPOId(po.id)}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 rounded-lg transition-all"
                                                        title="Print"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {(po.status === PoStatus.Draft || po.status === PoStatus.Pending) && permissions?.editPO && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setEditPO(po); setPoDialogOpen(true); }}
                                                        className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 rounded-lg transition-all"
                                                        title="Edit PO"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {po.status === PoStatus.Draft && permissions?.createPO && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSubmitTarget(po)}
                                                        className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Submit for Approval"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {po.status === PoStatus.Pending && permissions?.approvePO && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setApproveTarget(po)}
                                                        className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-lg transition-all"
                                                        title="Approve Order"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <td colSpan={6} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No purchase orders found matching parameters.
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {previewPOId != null && (
                <PurchaseOrderPreviewModal poId={previewPOId} onClose={() => setPreviewPOId(null)} />
            )}

            {poDialogOpen && (
                <PurchaseOrderDialog
                    open={poDialogOpen}
                    onOpenChange={setPoDialogOpen}
                    po={editPO ?? undefined}
                    onPreviewRequest={(poId) => setPreviewPOId(poId)}
                />
            )}

            <Dialog isOpen={!!submitTarget} onClose={() => setSubmitTarget(null)} title="Submit for Approval" size="sm">
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Submit PO <span className="font-bold text-secondary-900">{submitTarget?.poNo}</span> for approval? It will move to Pending status.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setSubmitTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => submitTarget && submitMutation.mutate(submitTarget.id)} disabled={submitMutation.isPending}>
                            {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
                        </Button>
                    </div>
                </div>
            </Dialog>

            <Dialog
                isOpen={!!approveTarget}
                onClose={() => setApproveTarget(null)}
                title="Approve Purchase Order"
                size="sm"
            >
                <div className="space-y-4 font-sans">
                    <p className="text-secondary-600">
                        Approve PO <span className="font-bold text-secondary-900">{approveTarget?.poNo}</span>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setApproveTarget(null)} className="flex-1 font-bold">Cancel</Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                            onClick={() => approveTarget && approveMutation.mutate(approveTarget.id)}
                            disabled={approveMutation.isPending}
                        >
                            {approveMutation.isPending ? "Processing..." : "Confirm Approve"}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}

