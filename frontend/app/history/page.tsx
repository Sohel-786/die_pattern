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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, History, RotateCcw, User, Calendar, FileJson } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const { data: history, isLoading } = useQuery<any[]>({
        queryKey: ["change-history"],
        queryFn: async () => (await api.get("/PatternDies/history")).data
    });

    const filtered = history?.filter(h =>
        h.patternDie?.mainPartName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.newName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 flex items-center gap-3">
                        <History className="w-8 h-8 text-primary" /> Audit Trail
                    </h1>
                    <p className="text-secondary-500">Comprehensive log of every change made to die and pattern masters.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Find by item or name..."
                            className="h-11 pl-10 rounded-2xl border-secondary-100 shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-2xl shadow-secondary-200/50 rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary-50/50 hover:bg-secondary-50/50">
                                <TableHead className="pl-8 py-5 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Modified Item</TableHead>
                                <TableHead className="py-5 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Modification Summary</TableHead>
                                <TableHead className="py-5 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Change Context</TableHead>
                                <TableHead className="py-5 font-black text-[10px] uppercase text-secondary-400 tracking-widest text-right pr-8">Audit Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={4} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : filtered?.map((h) => (
                                <TableRow key={h.id} className="group hover:bg-primary/5 transition-all border-b last:border-0 border-secondary-50">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-secondary-100 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <FileJson className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900">{h.patternDie?.mainPartName}</span>
                                                <span className="text-[10px] text-secondary-400 font-black uppercase tracking-widest">{h.patternDie?.drawingNo || "NODRAWING"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-secondary-400 line-through text-[10px] font-medium">{h.previousName}</span>
                                                <span className="text-secondary-400">→</span>
                                                <span className="text-primary font-bold text-xs">{h.newName}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">Rev</span>
                                                <span className="bg-secondary-100 px-2 py-0.5 rounded text-[10px] font-bold">{h.previousRevision}</span>
                                                <span className="text-secondary-300">→</span>
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">{h.newRevision}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-[11px] text-secondary-500 font-medium italic italic">"{h.remarks || "No reason specified"}"</p>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-secondary-600">{h.changer?.firstName}</span>
                                                <User className="w-3.5 h-3.5 text-secondary-400" />
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <span className="text-[10px] font-bold text-secondary-400">{new Date(h.changedAt).toLocaleString()}</span>
                                                <Calendar className="w-3 h-3 text-secondary-300" />
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
