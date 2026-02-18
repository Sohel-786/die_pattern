"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PurchaseIndent, PatternDie, PIItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Loader2, CheckCircle2, XCircle, ShoppingCart } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function IndentPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDies, setSelectedDies] = useState<number[]>([]);
    const [piType, setPiType] = useState("New");
    const [description, setDescription] = useState("");

    const { data: indents, isLoading } = useQuery<PurchaseIndent[]>({
        queryKey: ["indents"],
        queryFn: async () => (await api.get("/PurchaseIndents")).data
    });

    const { data: patterns } = useQuery<PatternDie[]>({
        queryKey: ["patterns"],
        queryFn: async () => (await api.get("/PatternDies")).data
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => (await api.post("/PurchaseIndents", data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["indents"] });
            setIsDialogOpen(false);
            setSelectedDies([]);
            setDescription("");
            toast.success("Purchase Indent created successfully");
        },
        onError: (err: any) => toast.error(err.response?.data || "Failed to create PI")
    });

    const approveMutation = useMutation({
        mutationFn: async (id: number) => (await api.post(`/PurchaseIndents/${id}/approve`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["indents"] });
            toast.success("PI Approved");
        }
    });

    const rejectMutation = useMutation({
        mutationFn: async (id: number) => (await api.post(`/PurchaseIndents/${id}/reject`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["indents"] });
            toast.success("PI Rejected");
        }
    });

    const handleCreate = () => {
        if (selectedDies.length === 0) return toast.error("Please select at least one item");
        const items = selectedDies.map(id => ({ patternDieId: id }));
        createMutation.mutate({ type: piType, description, items });
    };

    const toggleDie = (id: number) => {
        setSelectedDies(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900">Purchase Indent</h2>
                    <p className="text-secondary-500">Raise requests for new patterns or repairs.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary-600 shadow-lg shadow-primary/20 transition-all active:scale-95">
                    <Plus className="w-5 h-5 mr-2" /> Raise Indent
                </Button>
            </div>

            <Card className="border-none shadow-xl shadow-secondary-100/50 bg-white/80 backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-secondary-50/50 border-b">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search PI No..."
                            className="pl-10 h-10 bg-white border-secondary-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary-50/30 hover:bg-secondary-50/30 border-b">
                                <TableHead className="pl-8 py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs">PI Details</TableHead>
                                <TableHead className="py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs">Type</TableHead>
                                <TableHead className="py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs">Items Count</TableHead>
                                <TableHead className="py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs">Status</TableHead>
                                <TableHead className="py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs">Creator</TableHead>
                                <TableHead className="pr-8 py-4 font-bold text-secondary-900 uppercase tracking-wider text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : indents?.map((pi) => (
                                <TableRow key={pi.id} className="group hover:bg-primary/5 transition-colors border-b last:border-0">
                                    <TableCell className="pl-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-secondary-900">{pi.piNo}</span>
                                            <span className="text-[10px] text-secondary-400 font-medium">{new Date(pi.piDate).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium text-secondary-700">{pi.type}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-700 text-xs font-bold">
                                            {pi.items.length} Items
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            pi.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                                pi.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {pi.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {pi.creator?.firstName[0]}
                                            </div>
                                            <span className="text-sm font-medium text-secondary-700">{pi.creator?.firstName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        {pi.status === "PENDING" && (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 border-green-200" onClick={() => approveMutation.mutate(pi.id)}>
                                                    Approve
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 border-red-200" onClick={() => rejectMutation.mutate(pi.id)}>
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
                    <DialogHeader className="p-8 bg-primary text-white">
                        <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                            <ShoppingCart className="w-8 h-8" /> Raise New Indent
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-secondary-700 uppercase tracking-wider">Indent Type</Label>
                                <select
                                    className="w-full h-12 rounded-2xl border-secondary-200 bg-secondary-50/50 px-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    value={piType}
                                    onChange={(e) => setPiType(e.target.value)}
                                >
                                    <option value="New">New Purchase</option>
                                    <option value="Repair">Repair Request</option>
                                    <option value="Correction">Correction Work</option>
                                    <option value="Modification">Modification</option>
                                </select>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-bold text-secondary-700 uppercase tracking-wider">Overall Remarks</Label>
                                <Input
                                    className="h-12 rounded-2xl border-secondary-200 bg-secondary-50/50"
                                    placeholder="Optional description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-secondary-700 uppercase tracking-wider flex justify-between items-center">
                                Select Pattern/Dies
                                <span className="text-xs font-normal text-secondary-400 capitalize">{selectedDies.length} items selected</span>
                            </Label>
                            <div className="border border-secondary-100 rounded-2xl overflow-hidden shadow-inner bg-secondary-50/30">
                                <div className="max-h-80 overflow-y-auto">
                                    <Table>
                                        <TableBody>
                                            {patterns?.map((p) => (
                                                <TableRow
                                                    key={p.id}
                                                    className={cn(
                                                        "cursor-pointer transition-colors",
                                                        selectedDies.includes(p.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-white"
                                                    )}
                                                    onClick={() => toggleDie(p.id)}
                                                >
                                                    <TableCell className="w-12 text-center">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center",
                                                            selectedDies.includes(p.id) ? "bg-primary border-primary" : "bg-white border-secondary-300"
                                                        )}>
                                                            {selectedDies.includes(p.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-secondary-900">{p.currentName}</span>
                                                            <span className="text-[10px] text-secondary-400 font-bold uppercase">{p.mainPartName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-secondary-500 font-medium">
                                                        {p.type?.name}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-secondary-500 font-medium font-mono">
                                                        {p.drawingNo || "N/A"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-secondary-50 border-t flex items-center justify-between sm:justify-between">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl h-12 px-8 font-bold border-secondary-300">Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createMutation.isPending}
                            className="rounded-2xl h-12 px-10 font-bold bg-primary hover:bg-primary-600 shadow-xl shadow-primary/20"
                        >
                            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Raise PI"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
