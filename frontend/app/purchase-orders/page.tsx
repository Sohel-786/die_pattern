"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, ShoppingCart, CheckCircle, Clock,
    XCircle, Filter, User, Calendar, MoreVertical,
    Eye, Building2, IndianRupee, FileDown
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
import Link from "next/link";

export default function PurchaseOrdersPage() {
    const [search, setSearch] = useState("");
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
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Approval failed")
    });

    const getStatusBadge = (status: PoStatus) => {
        switch (status) {
            case PoStatus.Approved:
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case PoStatus.Rejected:
                return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-rose-100 flex items-center gap-1.5 w-fit"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100 flex items-center gap-1.5 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    const filteredOrders = orders.filter(po =>
        po.poNo.toLowerCase().includes(search.toLowerCase()) ||
        po.vendorName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <ShoppingCart className="w-10 h-10 text-primary-600" />
                        Purchase Orders
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold text-lg">Official procurement and repair work orders</p>
                </motion.div>

                <Link href="/purchase-orders/create">
                    <Button className="rounded-[2rem] h-16 px-10 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-2xl shadow-primary/25 transition-all active:scale-[0.98]">
                        <Plus className="w-6 h-6 mr-3" />
                        Issue New PO
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-stretch justify-between bg-white p-6 rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <Input
                        placeholder="Search by PO Number or Vendor name..."
                        className="pl-16 h-16 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold placeholder:text-gray-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="h-16 px-6 rounded-2xl border-2 border-gray-100 font-bold hover:bg-secondary-50">
                        <Filter className="w-5 h-5 mr-3 text-primary-600" /> Filter
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-primary-100 border-t-primary-600"></div>
                    <p className="font-black text-gray-400 uppercase text-xs tracking-widest">Compiling Orders...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-secondary-50/80">
                                <TableRow className="border-none">
                                    <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-wider text-xs">Order Identity</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Vendor Allocation</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Procurement Value</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Delivery Deadline</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Status</TableHead>
                                    <TableHead className="w-[80px] pr-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredOrders.map((po, idx) => (
                                        <motion.tr
                                            key={po.id}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group border-b border-gray-50 hover:bg-primary-50/30 transition-all cursor-default"
                                        >
                                            <TableCell className="py-8 pl-10">
                                                <div className="flex items-center gap-5">
                                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 relative overflow-hidden group-hover:border-indigo-400 transition-colors">
                                                        <ShoppingCart className="w-7 h-7" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-xl tracking-tight leading-none mb-1.5">{po.poNo}</p>
                                                        <p className="text-[10px] text-gray-400 font-extrabold uppercase flex items-center gap-1.5">
                                                            <Calendar className="w-3.5 h-3.5" /> ISSUED: {format(new Date(po.createdAt), 'dd MMM yyyy')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                                                        <Building2 className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 leading-tight">{po.vendorName}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">{po.items.length} LINE ITEMS</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-secondary-50 rounded-2xl border border-gray-100 font-black text-gray-700">
                                                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                                                    {po.rate?.toLocaleString() ?? 'NO QUOTE'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {po.deliveryDate ? (
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-gray-700">{format(new Date(po.deliveryDate), 'dd MMM yyyy')}</p>
                                                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary-500 w-1/2"></div>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-xs text-gray-300 font-bold italic tracking-wider uppercase">TBD</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center">
                                                    {getStatusBadge(po.status)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-10 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-white hover:shadow-xl"><MoreVertical className="w-6 h-6 text-gray-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-[2.5rem] border-gray-50 shadow-2xl p-4 w-72 mt-2">
                                                        <div className="px-5 py-4 border-b border-gray-50 mb-3 bg-secondary-50/50 rounded-2xl">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Contextual Actions</p>
                                                            <p className="text-xs font-bold text-gray-900">{po.poNo}</p>
                                                        </div>
                                                        <DropdownMenuItem className="rounded-2xl gap-4 cursor-pointer py-4 px-5 font-black text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                                                            <Eye className="w-6 h-6 text-gray-400" /> View Specification
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-2xl gap-4 cursor-pointer py-4 px-5 font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                                                            <FileDown className="w-6 h-6 text-indigo-400" /> Download PDF
                                                        </DropdownMenuItem>
                                                        {po.status === PoStatus.Pending && (
                                                            <DropdownMenuItem
                                                                onClick={() => approveMutation.mutate(po.id)}
                                                                className="rounded-2xl gap-4 cursor-pointer py-4 px-5 font-black text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 mt-2"
                                                            >
                                                                <CheckCircle className="w-6 h-6" /> Formal Approval
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
                    {filteredOrders.length === 0 && (
                        <div className="p-32 text-center space-y-6">
                            <div className="h-32 w-32 bg-secondary-50 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-inner">
                                <ShoppingCart className="w-12 h-12 text-gray-200" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900">No Orders Generated</h3>
                                <p className="text-gray-500 font-semibold text-lg max-w-sm mx-auto">Active purchase orders will appear here after they are issued to vendors.</p>
                            </div>
                            <Link href="/purchase-orders/create">
                                <Button variant="outline" className="h-14 rounded-2xl px-8 border-2 border-gray-100 font-black hover:bg-secondary-50">Issue First PO</Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
