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

export default function PurchaseIndentsPage() {
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedIndent, setSelectedIndent] = useState<PurchaseIndent | undefined>();
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
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case PurchaseIndentStatus.Rejected:
                return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100 flex items-center gap-1.5 w-fit"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100 flex items-center gap-1.5 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    const filteredIndents = indents.filter(pi =>
        pi.piNo.toLowerCase().includes(search.toLowerCase()) ||
        pi.creatorName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
                        Purchase Indents
                    </h1>
                    <p className="text-secondary-600 font-medium">Material and repair procurement requests</p>
                </motion.div>

                <Button
                    onClick={() => {
                        setSelectedIndent(undefined);
                        setDialogOpen(true);
                    }}
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New PI
                </Button>
            </div>

            <Card className="shadow-sm">
                <div className="p-4 flex flex-col xl:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Indent No or Creator..."
                            className="pl-10 h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <Label htmlFor="status-filter" className="text-xs font-bold text-secondary-500 uppercase tracking-wider whitespace-nowrap">Status</Label>
                        <select
                            id="status-filter"
                            className="flex h-10 w-full xl:w-48 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <option>All Statuses</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-40"><div className="animate-spin rounded-[2rem] h-16 w-16 border-[6px] border-primary-100 border-t-primary-600"></div></div>
            ) : (
                <Card className="shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-secondary-100">
                        <h3 className="text-xl font-semibold leading-none tracking-tight text-secondary-900">
                            Indent Ledger ({filteredIndents.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-primary-50">
                                <TableRow className="border-secondary-200">
                                    <TableHead className="font-bold text-primary-900 py-4 pl-6 uppercase tracking-wider text-[11px]">Indent Details</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Items Requested</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Workflow Details</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px] text-center">Status</TableHead>
                                    <TableHead className="w-[80px] pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredIndents.map((pi, idx) => (
                                        <motion.tr
                                            key={pi.id}
                                            initial={{ opacity: 0, y: 0 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.02, duration: 0.2 }}
                                            className="group border-b border-gray-50 hover:bg-primary-50/30 transition-all cursor-default"
                                        >
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900 text-sm">{pi.piNo}</p>
                                                        <p className="text-[11px] text-secondary-500 font-medium uppercase tracking-wider">{format(new Date(pi.createdAt), 'dd MMM yyyy')}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {pi.items.slice(0, 2).map((item: PurchaseIndentItem, i: number) => (
                                                        <p key={i} className="text-xs font-bold text-secondary-700 flex items-center gap-1.5">
                                                            <div className="h-1 w-1 rounded-full bg-primary-400"></div>
                                                            {item.currentName}
                                                        </p>
                                                    ))}
                                                    {pi.items.length > 2 && (
                                                        <p className="text-[10px] font-black text-primary-600 uppercase pl-2.5">+ {pi.items.length - 2} more items</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-700">
                                                        <User className="w-3.5 h-3.5 text-secondary-400" />
                                                        {pi.creatorName}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {getStatusBadge(pi.status)}
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-secondary-100"><MoreVertical className="w-4 h-4 text-secondary-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-secondary-200 shadow-xl p-1 w-56">
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedIndent(pi);
                                                                setDialogOpen(true);
                                                            }}
                                                            className="rounded-lg gap-2 cursor-pointer py-2 font-medium text-secondary-700"
                                                        >
                                                            <Eye className="w-4 h-4" /> Edit / View
                                                        </DropdownMenuItem>
                                                        {pi.status === PurchaseIndentStatus.Pending && (
                                                            <DropdownMenuItem
                                                                onClick={() => approveMutation.mutate(pi.id)}
                                                                className="rounded-lg gap-2 cursor-pointer py-2 font-bold text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 mt-1"
                                                            >
                                                                <CheckCircle className="w-4 h-4" /> Approve Indent
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            <PurchaseIndentDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                indent={selectedIndent}
            />
        </div>
    );
}
