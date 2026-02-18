"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { QCInspection, InwardItem, Location } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog-legacy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Loader2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, MapPin, ClipboardCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function QCPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [selectedInwardItem, setSelectedInwardItem] = useState<InwardItem | null>(null);
    const [status, setStatus] = useState<"APPROVED" | "REJECTED" | "REWORK">("APPROVED");
    const [notes, setNotes] = useState("");
    const [parameters, setParameters] = useState("");
    const [targetLocation, setTargetLocation] = useState<number | "">("");

    const { data: inspections, isLoading } = useQuery<QCInspection[]>({
        queryKey: ["inspections"],
        queryFn: async () => (await api.get("/QCInspections")).data
    });

    const { data: pendingQCItems } = useQuery<InwardItem[]>({
        queryKey: ["pending-qc-items"],
        queryFn: async () => (await api.get("/Inwards/pending-qc")).data
    });

    const { data: locations } = useQuery<Location[]>({
        queryKey: ["locations"],
        queryFn: async () => (await api.get("/locations")).data
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => (await api.post("/QCInspections", data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inspections"] });
            queryClient.invalidateQueries({ queryKey: ["pending-qc-items"] });
            queryClient.invalidateQueries({ queryKey: ["patterns"] });
            setIsDialogOpen(false);
            setSelectedInwardItem(null);
            setNotes("");
            setParameters("");
            setTargetLocation("");
            toast.success("QC Inspection record saved successfully");
        },
        onError: (err: any) => toast.error(err.response?.data || "Failed to save QC record")
    });

    const handleInspect = (item: InwardItem) => {
        setSelectedInwardItem(item);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!selectedInwardItem) return;
        if (status === "APPROVED" && !targetLocation) return toast.error("Please select a target location for storage");

        createMutation.mutate({
            inwardItemId: selectedInwardItem.id,
            status,
            inspectionNotes: notes,
            parametersChecked: parameters,
            targetLocationId: targetLocation || null
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-primary" /> Quality Control (QC)
                    </h1>
                    <p className="text-secondary-500">Verify incoming patterns and approve for production use.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pending List */}
                <Card className="lg:col-span-2 border-none shadow-xl shadow-secondary-100/50 rounded-3xl overflow-hidden h-[75vh] flex flex-col bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-secondary-50/50 py-6">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-black text-secondary-800 uppercase tracking-widest">Pending Inspections</CardTitle>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                                {pendingQCItems?.length || 0} Awaiting
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-secondary-50/20">
                                    <TableHead className="pl-8 py-4 font-black text-[10px] uppercase text-secondary-400">Inward Ref</TableHead>
                                    <TableHead className="py-4 font-black text-[10px] uppercase text-secondary-400">Item Details</TableHead>
                                    <TableHead className="py-4 font-black text-[10px] uppercase text-secondary-400">Source PO</TableHead>
                                    <TableHead className="pr-8 py-4 text-right font-black text-[10px] uppercase text-secondary-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingQCItems?.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-primary/5 transition-all border-b last:border-0">
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900">{item.inwardEntry?.inwardNo}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold">{new Date(item.inwardEntry?.inwardDate || "").toLocaleDateString()}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-secondary-700">{item.poItem?.piItem?.patternDie?.currentName}</span>
                                                <span className="text-[10px] text-primary font-bold">{item.poItem?.piItem?.patternDie?.mainPartName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-bold text-indigo-600">{item.inwardEntry?.purchaseOrder?.poNo}</span>
                                        </TableCell>
                                        <TableCell className="pr-8 text-right">
                                            <Button size="sm" onClick={() => handleInspect(item)} className="bg-primary hover:bg-primary-600 rounded-xl h-10 px-4 font-bold shadow-lg shadow-primary/20">
                                                Inspect Now
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!pendingQCItems || pendingQCItems.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <ClipboardCheck className="w-12 h-12" />
                                                <span className="text-sm font-medium italic underline decoration-wavy underline-offset-4">Everything is clear! No items pending QC.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent History */}
                <Card className="border-none shadow-xl shadow-secondary-100/50 rounded-3xl overflow-hidden h-[75vh] flex flex-col">
                    <CardHeader className="py-6 border-b">
                        <CardTitle className="text-xl font-black text-secondary-800 uppercase tracking-widest">Inspection History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="p-4 space-y-4">
                            {inspections?.map((q) => (
                                <div key={q.id} className="p-4 rounded-2xl bg-secondary-50/50 border border-secondary-100 group transition-all hover:bg-white hover:shadow-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black tracking-widest text-primary uppercase">{q.qcNo}</span>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                            q.status === 'APPROVED' ? "bg-green-100 text-green-700" :
                                                q.status === 'REJECTED' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                        )}>
                                            {q.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-secondary-900 text-sm mb-1">{q.inwardItem?.poItem?.piItem?.patternDie?.currentName}</h4>
                                    <p className="text-[10px] text-secondary-400 line-clamp-2 italic mb-3">"{q.inspectionNotes || "No notes recorded"}"</p>
                                    <div className="flex items-center justify-between border-t border-secondary-100 pt-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-secondary-200 border-2 border-white flex items-center justify-center text-[10px] font-black text-secondary-600 uppercase">
                                                {q.inspector?.firstName?.[0]}
                                            </div>
                                            <span className="text-[10px] font-bold text-secondary-500 uppercase">{q.inspector?.firstName}</span>
                                        </div>
                                        <span className="text-[9px] font-medium text-secondary-300">{new Date(q.inspectedAt).toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
                    <div className="grid grid-cols-5 h-[80vh]">
                        {/* Summary Column */}
                        <div className="col-span-2 bg-gradient-to-br from-secondary-900 to-black text-white p-12 flex flex-col justify-between relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary rounded-full blur-[100px]" />
                                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full blur-[100px]" />
                            </div>

                            <div className="relative z-10 space-y-8">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
                                    <ShieldCheck className="w-8 h-8 text-primary shadow-2xl" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black leading-tight">Inspection <br /><span className="text-secondary-400">Protocol</span></h2>
                                    <div className="h-1 w-20 bg-primary rounded-full" />
                                </div>

                                <div className="space-y-6 pt-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary-500 mb-2">Die / Pattern Ref</p>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                            <span className="block font-black text-xl text-white">{selectedInwardItem?.poItem?.piItem?.patternDie?.currentName}</span>
                                            <span className="block text-[10px] font-bold text-primary tracking-widest mt-1">{selectedInwardItem?.poItem?.piItem?.patternDie?.mainPartName}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[9px] font-black uppercase text-secondary-500 mb-1">Inward Ref</p>
                                            <p className="text-xs font-bold">{selectedInwardItem?.inwardEntry?.inwardNo}</p>
                                        </div>
                                        <div className="flex-1 p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[9px] font-black uppercase text-secondary-500 mb-1">PO Source</p>
                                            <p className="text-xs font-bold">{selectedInwardItem?.inwardEntry?.purchaseOrder?.poNo}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] font-medium text-secondary-500 italic relative z-10">Verification of technical dimensions and surface quality is mandatory before system induction.</p>
                        </div>

                        {/* Form Column */}
                        <div className="col-span-3 bg-white p-12 overflow-y-auto flex flex-col">
                            <div className="flex-1 space-y-10">
                                <div className="space-y-4">
                                    <Label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1">Inspection Result</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'APPROVED', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                                            { id: 'REJECTED', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                                            { id: 'REWORK', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setStatus(opt.id as any)}
                                                className={cn(
                                                    "p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95",
                                                    status === opt.id ? `${opt.bg} ${opt.border} ring-4 ring-${opt.id.toLowerCase()}-500/10` : "bg-white border-secondary-50 grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                                                )}
                                            >
                                                <opt.icon className={cn("w-6 h-6", opt.color)} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-wider", opt.color)}>{opt.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1">Technical Parameters Checked</Label>
                                    <Input
                                        placeholder="e.g. Dimensions, Hardness, Surface, Casting Quality"
                                        className="h-14 rounded-2xl border-secondary-100 bg-secondary-50/10 font-bold px-6"
                                        value={parameters}
                                        onChange={(e) => setParameters(e.target.value)}
                                    />
                                </div>

                                {status === "APPROVED" && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <Label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <MapPin className="w-3 h-3 text-primary" /> storage Assignment
                                        </Label>
                                        <select
                                            className="w-full h-14 rounded-2xl border-none bg-secondary-50 px-6 text-sm font-bold shadow-inner outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                            value={targetLocation}
                                            onChange={(e) => setTargetLocation(Number(e.target.value))}
                                        >
                                            <option value="">Select where to store this unit</option>
                                            {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <Label className="text-xs font-black text-secondary-400 uppercase tracking-widest ml-1">Observational Notes</Label>
                                    <Textarea
                                        placeholder="Detailed findings or reasons for rejection..."
                                        className="rounded-2xl border-secondary-100 bg-secondary-50/10 font-medium px-6 py-4 min-h-[120px] resize-none"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="mt-12 flex justify-between items-center sm:justify-between border-t pt-8">
                                <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 font-black uppercase tracking-widest text-secondary-400 text-[10px] hover:bg-secondary-50 rounded-2xl px-8">Discard</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={createMutation.isPending}
                                    className="h-14 px-12 rounded-2xl font-black bg-primary hover:bg-primary-600 shadow-2xl shadow-primary/20 uppercase tracking-widest text-[11px] transition-all hover:scale-105 active:scale-95"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Commit"}
                                </Button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
