"use client";

import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeftRight, Search, MapPin, Users,
    ArrowUpRight, ArrowDownLeft, RotateCcw,
    Clock, CheckCircle, AlertCircle, Filter,
    MoreVertical, Calendar, Package, Plus
} from "lucide-react";
import api from "@/lib/api";
import { Movement, MovementType } from "@/types";
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
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";

export default function MovementsPage() {
    const [search, setSearch] = useState("");

    const { data: movements = [], isLoading } = useQuery<Movement[]>({
        queryKey: ["movements"],
        queryFn: async () => {
            const res = await api.get("/movements");
            return res.data.data;
        },
    });

    const getMovementIcon = (type: MovementType) => {
        switch (type) {
            case MovementType.Outward:
                return <ArrowUpRight className="w-5 h-5 text-rose-500" />;
            case MovementType.Inward:
                return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
            case MovementType.SystemReturn:
                return <RotateCcw className="w-5 h-5 text-amber-500" />;
        }
    };

    const getStatusBadge = (m: Movement) => {
        if (m.isQCPending) return <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 flex items-center gap-1.5 w-fit"><Clock className="w-3 h-3" /> QC Pending</span>;
        if (m.isQCApproved) return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle className="w-3 h-3" /> QC Passed</span>;
        if (m.type === MovementType.Outward) return <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1.5 w-fit font-mono">COMPLETE</span>;
        return <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1.5 w-fit"><AlertCircle className="w-3 h-3" /> Failed</span>;
    };

    const filteredMovements = movements.filter(m =>
        m.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        m.fromName?.toLowerCase().includes(search.toLowerCase()) ||
        m.toName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <ArrowLeftRight className="w-10 h-10 text-primary-600" />
                        Transaction Ledger
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold text-lg">Detailed history of pattern and die movements</p>
                </motion.div>

                <div className="flex flex-wrap gap-4">
                    <Link href="/movements/outward">
                        <Button variant="outline" className="rounded-2xl h-14 px-6 border-2 border-rose-100 text-rose-600 font-black hover:bg-rose-50 transition-all shadow-sm">
                            <ArrowUpRight className="w-5 h-5 mr-3" /> Outward
                        </Button>
                    </Link>
                    <Link href="/movements/inward">
                        <Button variant="outline" className="rounded-2xl h-14 px-6 border-2 border-emerald-100 text-emerald-600 font-black hover:bg-emerald-50 transition-all shadow-sm">
                            <ArrowDownLeft className="w-5 h-5 mr-3" /> Inward
                        </Button>
                    </Link>
                    <Link href="/movements/system-return">
                        <Button className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-2xl shadow-primary/25 transition-all active:scale-[0.98]">
                            <Plus className="w-6 h-6 mr-2" />
                            New Entry
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100 flex flex-col xl:flex-row gap-6 items-stretch justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <Input
                        placeholder="Search by part, vendor, or location..."
                        className="pl-16 h-16 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold placeholder:text-gray-300"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <Button variant="ghost" className="h-16 w-16 rounded-2xl bg-secondary-50/50 border border-gray-100 hover:bg-white transition-all">
                        <Filter className="w-6 h-6 text-gray-400" />
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-primary-100 border-t-primary-600 shadow-inner"></div>
                    <p className="font-black text-gray-400 uppercase text-xs tracking-[0.2em]">Syncing Ledger...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
                    <Table>
                        <TableHeader className="bg-secondary-50/80 backdrop-blur-md">
                            <TableRow className="border-none">
                                <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-wider text-xs">Date & Time</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Component Identification</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Transfer Logic</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Protocol</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Status</TableHead>
                                <TableHead className="w-[80px] pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {filteredMovements.map((m, idx) => (
                                    <motion.tr
                                        key={m.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group border-b border-gray-50 hover:bg-primary-50/20 transition-all cursor-default"
                                    >
                                        <TableCell className="py-8 pl-10">
                                            <div className="space-y-1">
                                                <p className="font-black text-gray-900 text-sm">{format(new Date(m.createdAt), 'dd MMM yyyy')}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5"><Clock className="w-3 h-3" /> {format(new Date(m.createdAt), 'hh:mm a')}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-inner border ${m.type === MovementType.Outward ? 'bg-rose-50 border-rose-100' :
                                                    m.type === MovementType.Inward ? 'bg-emerald-50 border-emerald-100' :
                                                        'bg-amber-50 border-amber-100'
                                                    }`}>
                                                    {getMovementIcon(m.type)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 leading-tight mb-1">{m.itemName}</p>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ID: {m.itemId.toString().padStart(4, '0')}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">From</p>
                                                    <p className="text-xs font-black text-gray-800">{m.fromName}</p>
                                                </div>
                                                <div className="h-0.5 w-8 bg-gray-100 rounded-full relative">
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gray-200"></div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">To</p>
                                                    <p className="text-xs font-black text-gray-800">{m.toName}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-black">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border ${m.type === MovementType.Inward ? 'bg-secondary-50 text-indigo-600 border-indigo-100' :
                                                m.type === MovementType.Outward ? 'bg-secondary-50 text-rose-600 border-rose-100' :
                                                    'bg-secondary-50 text-amber-600 border-amber-100'
                                                }`}>
                                                {m.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(m)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-10 text-right">
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:scale-110 active:scale-90 transition-all"><MoreVertical className="w-5 h-5 text-gray-400" /></Button>
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
