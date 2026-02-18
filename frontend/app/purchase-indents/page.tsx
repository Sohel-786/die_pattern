"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, FileText, CheckCircle, Clock,
    XCircle, Filter, ChevronRight, User, Calendar,
    MoreVertical, Eye
} from "lucide-react";
import api from "@/lib/api";
import { PI, PiStatus } from "@/types";
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

export default function PurchaseIndentsPage() {
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();

    const { data: indents = [], isLoading } = useQuery<PI[]>({
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

    const getStatusBadge = (status: PiStatus) => {
        switch (status) {
            case PiStatus.Approved:
                return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case PiStatus.Rejected:
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
        <div className="p-8 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <FileText className="w-10 h-10 text-primary-600" />
                        Purchase Indents
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold">Material and repair procurement requests</p>
                </motion.div>

                <Link href="/purchase-indents/create">
                    <Button className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-2xl shadow-primary/25 transition-all active:scale-[0.98]">
                        <Plus className="w-6 h-6 mr-2" />
                        Create New Indent
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-stretch justify-between bg-white p-6 rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <Input
                        placeholder="Search by Indent No or Creator..."
                        className="pl-14 h-14 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-secondary-50/50 border border-gray-100 hover:bg-white transition-all">
                    <Filter className="w-6 h-6 text-gray-500" />
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-40"><div className="animate-spin rounded-[2rem] h-16 w-16 border-[6px] border-primary-100 border-t-primary-600"></div></div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
                    <Table>
                        <TableHeader className="bg-secondary-50/80">
                            <TableRow className="border-none">
                                <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-wider text-xs">Indent Details</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Type</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Items Requested</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Created By</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Workflow Status</TableHead>
                                <TableHead className="w-[80px] pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {filteredIndents.map((pi, idx) => (
                                    <motion.tr
                                        key={pi.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group border-b border-gray-50 hover:bg-primary-50/30 transition-all cursor-default"
                                    >
                                        <TableCell className="py-7 pl-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-black text-sm border border-primary-100">
                                                    PI
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-lg leading-tight">{pi.piNo}</p>
                                                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase flex items-center gap-1.5">
                                                        <Calendar className="w-3 h-3" /> {format(new Date(pi.createdAt), 'dd MMM yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border ${pi.type === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    pi.type === 'Repair' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-purple-50 text-purple-600 border-purple-100'
                                                }`}>
                                                {pi.type.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {pi.items.slice(0, 2).map((item, i) => (
                                                    <p key={i} className="text-sm font-bold text-gray-700 truncate max-w-[200px] flex items-center gap-2">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300"></div>
                                                        {item.currentName}
                                                    </p>
                                                ))}
                                                {pi.items.length > 2 && (
                                                    <p className="text-[10px] font-black text-primary-500 uppercase px-3.5">+ {pi.items.length - 2} more items</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                                <User className="w-4 h-4 text-gray-400" />
                                                {pi.creatorName}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(pi.status)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-10 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-lg"><MoreVertical className="w-5 h-5 text-gray-400" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-[2rem] border-gray-100 shadow-2xl p-3 w-56">
                                                    <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-gray-700 hover:bg-primary-50">
                                                        <Eye className="w-5 h-5 text-gray-400" /> View Details
                                                    </DropdownMenuItem>
                                                    {pi.status === PiStatus.Pending && (
                                                        <DropdownMenuItem
                                                            onClick={() => approveMutation.mutate(pi.id)}
                                                            className="rounded-xl gap-3 cursor-pointer py-3 font-black text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100 mt-1"
                                                        >
                                                            <CheckCircle className="w-5 h-5" /> Approve Indent
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
            )}
        </div>
    );
}
