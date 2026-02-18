"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Loader2, ArrowLeftRight, MapPin, Truck, History as HistoryIcon, Boxes, ArrowRight, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MovementPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: movements, isLoading } = useQuery<any[]>({
        queryKey: ["movements"],
        queryFn: async () => (await api.get("/Movements")).data
    });

    const filtered = movements?.filter(m =>
        m.patternDie?.mainPartName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.movementNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                        <ArrowLeftRight className="w-8 h-8 text-indigo-600" /> Pattern Movements
                    </h1>
                    <p className="text-secondary-500">Trace and track the lifecycle of every asset in real-time.</p>
                </div>
                <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                    <Input
                        placeholder="Search by Mov No or Item Name..."
                        className="h-11 pl-10 rounded-2xl border-secondary-100 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-none shadow-2xl shadow-indigo-200/20 rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary-50/50 hover:bg-secondary-50/50">
                                <TableHead className="pl-10 py-6 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Movement Ref</TableHead>
                                <TableHead className="py-6 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Item Description</TableHead>
                                <TableHead className="py-6 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Type & Routing</TableHead>
                                <TableHead className="py-6 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Reason / Notes</TableHead>
                                <TableHead className="pr-10 py-6 text-right font-black text-[10px] uppercase text-secondary-400 tracking-widest">Performed By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-[400px] text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500" /></TableCell></TableRow>
                            ) : filtered?.map((m) => (
                                <TableRow key={m.id} className="group hover:bg-indigo-50/20 transition-all border-b last:border-0 border-secondary-50">
                                    <TableCell className="pl-10 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-secondary-900 tracking-tight">{m.movementNo}</span>
                                            <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">{new Date(m.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-white border border-secondary-100 flex items-center justify-center text-secondary-600 shadow-sm">
                                                <Boxes className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-800 text-sm">{m.patternDie?.currentName}</span>
                                                <span className="text-[10px] text-indigo-600 font-black uppercase tracking-tighter">{m.patternDie?.mainPartName}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-2">
                                            <span className={cn(
                                                "inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                                                m.type === 'ISSUE_TO_VENDOR' ? "bg-amber-100 text-amber-700" :
                                                    m.type === 'RECEIVE_FROM_VENDOR' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {m.type?.replace(/_/g, ' ')}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs font-bold text-secondary-500">
                                                <span className="max-w-[80px] truncate">{m.fromLocation?.name || m.fromVendor?.name || "System"}</span>
                                                <ArrowRight className="w-3 h-3 text-secondary-300" />
                                                <span className="max-w-[80px] truncate">{m.toLocation?.name || m.toVendor?.name || "Target"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-[11px] text-secondary-500 font-medium italic italic max-w-[200px] line-clamp-2">
                                            {m.reason || "Automatic system log."}
                                        </p>
                                    </TableCell>
                                    <TableCell className="pr-10 text-right">
                                        <div className="flex items-center justify-end gap-2 group-hover:translate-x-[-4px] transition-transform">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-secondary-700 tracking-tight">{m.creator?.firstName}</span>
                                                <span className="text-[9px] text-secondary-300 font-bold uppercase">{new Date(m.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-[10px] font-black text-secondary-500 border-2 border-white ring-1 ring-secondary-50">
                                                {m.creator?.firstName?.[0]}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
