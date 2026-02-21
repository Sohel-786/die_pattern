"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ClipboardCheck, Search, ShieldCheck, ShieldAlert,
    History, Eye, CheckCircle2, XCircle, MoreVertical,
    ArrowDownLeft, RotateCcw, Package, Clock, User,
    CheckCircle, MessageSquare, Info
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
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function QualityControlPage() {
    const [search, setSearch] = useState("");
    const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
    const [isInspectionOpen, setIsInspectionOpen] = useState(false);
    const [remarks, setRemarks] = useState("");
    const queryClient = useQueryClient();

    const { data: pending = [], isLoading } = useQuery<Movement[]>({
        queryKey: ["quality-control", "pending"],
        queryFn: async () => {
            const res = await api.get("/quality-control/pending");
            return res.data.data;
        },
    });

    const performMutation = useMutation({
        mutationFn: (data: { movementId: number; isApproved: boolean; remarks: string }) =>
            api.post("/quality-control/perform", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quality-control", "pending"] });
            queryClient.invalidateQueries({ queryKey: ["movements"] });
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Inspection recorded successfully");
            setIsInspectionOpen(false);
            setSelectedMovement(null);
            setRemarks("");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Execution failed")
    });

    const handleInspect = (m: Movement) => {
        setSelectedMovement(m);
        setIsInspectionOpen(true);
    };

    const filteredPending = pending.filter(m =>
        m.itemName?.toLowerCase().includes(search.toLowerCase()) ||
        m.toName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <ClipboardCheck className="w-10 h-10 text-primary-600" />
                        Quality Certification
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold text-lg">Verify material integrity for incoming components</p>
                </motion.div>

                <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <div className="px-6 py-3 bg-primary-50 rounded-xl flex items-center gap-3 border border-primary-100">
                        <Clock className="w-5 h-5 text-primary-600" />
                        <span className="text-sm font-black text-primary-700">{pending.length} ITEMS WAITING</span>
                    </div>
                </div>
            </div>

            <div className="relative max-w-2xl bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                    placeholder="Search by component or target zone..."
                    className="pl-16 h-16 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold placeholder:text-gray-300"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-primary-50 border-t-primary-600 shadow-sm"></div>
                    <p className="font-black text-gray-400 uppercase text-xs tracking-[0.2em]">Inspecting Registry...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
                    <Table>
                        <TableHeader className="bg-secondary-50/80">
                            <TableRow className="border-none">
                                <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-wider text-xs">Origin Entry</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Component Unit</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Quarantine Zone</TableHead>
                                <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Arrival Log</TableHead>
                                <TableHead className="w-[200px] pr-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence>
                                {filteredPending.map((m, idx) => (
                                    <motion.tr
                                        key={m.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                                        className="group border-b border-gray-50 hover:bg-amber-50/20 transition-colors"
                                    >
                                        <TableCell className="py-8 pl-10">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${m.type === MovementType.Inward ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} border border-current opacity-30`}>
                                                    {m.type === MovementType.Inward ? <ArrowDownLeft className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                                                </div>
                                                <p className="font-black text-gray-700 tracking-tight">{m.type.toUpperCase()}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shadow-inner">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-base leading-tight">{m.itemName}</p>
                                                    <p className="text-[10px] font-black text-gray-300 uppercase mt-1 tracking-widest">UNIT-ID: {m.itemId}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm font-black text-gray-700">
                                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                                {m.toName}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-gray-700">{format(new Date(m.createdAt), 'dd MMM yyyy')}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{format(new Date(m.createdAt), 'hh:mm a')}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-10 text-right">
                                            <Button
                                                onClick={() => handleInspect(m)}
                                                className="h-12 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <ShieldCheck className="w-4 h-4" /> Perform QC
                                            </Button>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                    {filteredPending.length === 0 && (
                        <div className="p-32 text-center space-y-4">
                            <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100">
                                <CheckCircle2 className="w-12 h-12" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Quarantine Vault Empty</h3>
                                <p className="text-gray-500 font-semibold uppercase text-[10px] tracking-widest">All incoming items have been certified</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* QC Inspection Dialog */}
            <Dialog isOpen={isInspectionOpen} onClose={() => setIsInspectionOpen(false)} title="QC Inspection" size="xl" hideHeader>
                <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-8">
                        <div className="flex items-center gap-4 text-white">
                            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tighter">Material Certification</h2>
                                <p className="text-amber-100/80 font-bold text-sm">Inspecting: {selectedMovement?.itemName}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-10 space-y-8">
                        <div className="bg-secondary-50/50 rounded-3xl p-6 border border-gray-100 flex items-start gap-4">
                            <div className="h-10 w-10 shrink-0 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm text-amber-500">
                                <Info className="w-5 h-5" />
                            </div>
                            <p className="text-xs font-bold text-gray-500 leading-relaxed uppercase tracking-wide pt-1">
                                Please verify visual integrity, dimensional accuracy, and documentation before releasing this unit from quarantine.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-black text-gray-700 ml-1 uppercase tracking-tight flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-primary-500" /> Inspection Findings
                            </label>
                            <Textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="rounded-[2rem] min-h-[120px] bg-secondary-50/50 border-gray-200 focus:bg-white transition-all font-bold p-6 leading-relaxed"
                                placeholder="Enter detailed inspection notes..."
                            />
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={() => performMutation.mutate({ movementId: selectedMovement!.id, isApproved: false, remarks })}
                                disabled={performMutation.isPending}
                                variant="outline"
                                className="flex-1 h-14 rounded-2xl border-2 border-rose-100 text-rose-500 font-extrabold hover:bg-rose-50 transition-all flex items-center gap-2"
                            >
                                <XCircle className="w-5 h-5" /> REJECT
                            </Button>
                            <Button
                                onClick={() => performMutation.mutate({ movementId: selectedMovement!.id, isApproved: true, remarks })}
                                disabled={performMutation.isPending}
                                className="flex-[1.5] h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2"
                            >
                                {performMutation.isPending ? "PROCESSING..." : <><CheckCircle className="w-5 h-5" /> APPROVE & RELEASE</>}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
