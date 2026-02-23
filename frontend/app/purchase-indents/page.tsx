"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, FileText, CheckCircle, Clock,
    XCircle, Filter, ChevronRight, User, Calendar,
    MoreVertical, Eye
} from "lucide-react";
import api from "@/lib/api";
import { PurchaseIndent, PurchaseIndentStatus, PurchaseIndentItem, PurchaseIndentType } from "@/types";
import { Button } from "@/components/ui/button";
import { PurchaseIndentDialog } from "@/components/purchase-indents/purchase-indent-dialog";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
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
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed")
    });

    const getStatusBadge = (status: PurchaseIndentStatus) => {
        switch (status) {
            case PurchaseIndentStatus.Approved:
                return <span className="px-2.5 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-200">Approved</span>;
            case PurchaseIndentStatus.Rejected:
                return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200">Rejected</span>;
            default:
                return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-200">Pending</span>;
        }
    };

    const filteredIndents = indents.filter(pi => {
        const matchesSearch = pi.piNo.toLowerCase().includes(search.toLowerCase()) ||
            pi.creatorName?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "All" || pi.status.toString() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 space-y-4 bg-secondary-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Purchase Indents</h1>
                    <p className="text-secondary-500 text-sm">Manage die and pattern procurement requests</p>
                </div>
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
                    <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-bold text-secondary-500 uppercase tracking-wider">Status</Label>
                        <select
                            className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/10 w-40"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
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
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Indent Details</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Requested Items</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Creator Info</TableHead>
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
                            ) : filteredIndents.length > 0 ? (
                                filteredIndents.map((pi, idx) => (
                                    <TableRow
                                        key={pi.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans whitespace-nowrap"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{pi.piNo}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{format(new Date(pi.createdAt), 'dd MMM yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1 max-w-md">
                                                {pi.items.slice(0, 3).map((item: any, i: number) => (
                                                    <span key={i} className="px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded text-[10px] font-bold uppercase">
                                                        {item.currentName}
                                                    </span>
                                                ))}
                                                {pi.items.length > 3 && (
                                                    <span className="text-[10px] font-bold text-primary-600 px-1">+{pi.items.length - 3} more</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-[10px] font-bold uppercase">
                                                    {pi.creatorName?.charAt(0)}
                                                </div>
                                                <span className="text-[11px] font-bold text-secondary-700 uppercase">{pi.creatorName}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(pi.status)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedIndent(pi);
                                                        setDialogOpen(true);
                                                    }}
                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                {pi.status === PurchaseIndentStatus.Pending && permissions?.approvePI && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => approveMutation.mutate(pi.id)}
                                                        className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 border border-transparent hover:border-green-100 rounded-lg transition-all"
                                                        title="Approve Indent"
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
        </div>
    );
}


