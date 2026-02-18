"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { InwardEntry, POItem, PurchaseOrder } from "@/types";
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
import { Search, Loader2, Download, FileText, Truck, Boxes, ReceiptText, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function InwardPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [selectedPO, setSelectedPO] = useState<number | "">("");
    const [selectedPOItems, setSelectedPOItems] = useState<number[]>([]);
    const [challanNo, setChallanNo] = useState("");
    const [challanDate, setChallanDate] = useState("");
    const [vehicleNo, setVehicleNo] = useState("");

    const { data: inwards, isLoading } = useQuery<InwardEntry[]>({
        queryKey: ["inwards"],
        queryFn: async () => (await api.get("/Inwards")).data
    });

    const { data: pos } = useQuery<PurchaseOrder[]>({
        queryKey: ["orders"],
        queryFn: async () => (await api.get("/PurchaseOrders")).data
    });

    const { data: pendingPOItems } = useQuery<POItem[]>({
        queryKey: ["pending-po-items"],
        queryFn: async () => (await api.get("/PurchaseOrders/pending-receipt")).data
    });

    const filteredPendingItems = pendingPOItems?.filter(i => !selectedPO || i.poId === selectedPO);

    const createMutation = useMutation({
        mutationFn: async (data: any) => (await api.post("/Inwards", data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["inwards"] });
            queryClient.invalidateQueries({ queryKey: ["pending-po-items"] });
            queryClient.invalidateQueries({ queryKey: ["patterns"] });
            setIsDialogOpen(false);
            setSelectedPOItems([]);
            setChallanNo("");
            toast.success("Inward Entry completed. Movement recorded.");
        },
        onError: (err: any) => toast.error(err.response?.data || "Failed to complete inward")
    });

    const handleCreate = () => {
        if (!selectedPO) return toast.error("Please select a PO");
        if (selectedPOItems.length === 0) return toast.error("Please select at least one item being received");

        createMutation.mutate({
            poId: selectedPO,
            challanNo,
            challanDate,
            vehicleNo,
            items: selectedPOItems.map(poItemId => ({ poItemId }))
        });
    };

    const togglePOItem = (id: number) => {
        setSelectedPOItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight">Inward Process</h1>
                    <p className="text-secondary-500">Record incoming shipments from vendors against POs.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="h-12 px-8 rounded-2xl bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-50 transition-all font-bold">
                    <ReceiptText className="w-5 h-5 mr-2" /> New Inward
                </Button>
            </div>

            <Card className="border-none shadow-2xl shadow-secondary-200/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b py-6">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500" />
                        <Input
                            placeholder="Find by Inward No or Challan No..."
                            className="pl-10 h-11 border-secondary-200 rounded-xl bg-secondary-50/30"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary-50/50 hover:bg-secondary-50/50">
                                <TableHead className="pl-8 py-4 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Inward Ref</TableHead>
                                <TableHead className="py-4 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Source PO</TableHead>
                                <TableHead className="py-4 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Document Details</TableHead>
                                <TableHead className="py-4 font-black text-[10px] uppercase text-secondary-400 tracking-widest">Status</TableHead>
                                <TableHead className="pr-8 py-4 text-right font-black text-[10px] uppercase text-secondary-400 tracking-widest">Received By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-600" /></TableCell></TableRow>
                            ) : inwards?.map((inw) => (
                                <TableRow key={inw.id} className="group hover:bg-teal-50/30 transition-all border-b last:border-0 cursor-default">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                                                <Boxes className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 tracking-tight">{inw.inwardNo}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">{new Date(inw.inwardDate).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-indigo-600">{inw.purchaseOrder?.poNo}</span>
                                            <span className="text-[10px] text-secondary-400 font-medium uppercase">{inw.purchaseOrder?.vendor?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Challan</span>
                                                <span className="text-xs font-bold text-secondary-700">{inw.challanNo || "—"}</span>
                                            </div>
                                            <div className="flex flex-col border-l border-secondary-100 pl-4">
                                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Vehicle</span>
                                                <span className="text-xs font-bold text-secondary-700">{inw.vehicleNo || "—"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-wider">Received</span>
                                            <span className="text-[10px] text-secondary-400 font-bold">{inw.items.length} Units</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-xs font-bold text-secondary-700">{inw.receiver?.firstName}</span>
                                            <div className="w-7 h-7 rounded-full bg-secondary-100 flex items-center justify-center text-[10px] font-black text-secondary-500">
                                                {inw.receiver?.firstName?.[0]}
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
                    <DialogHeader className="p-10 bg-gradient-to-br from-teal-600 to-teal-800 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                        <DialogTitle className="text-4xl font-black flex items-center gap-4 relative z-10">
                            <ReceiptText className="w-10 h-10" /> Record Inward Shipment
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-secondary-50/50">
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <Label className="text-xs font-black text-secondary-400 uppercase tracking-[0.2em] ml-1">Source Order (PO)</Label>
                                <select
                                    className="w-full h-14 rounded-2xl border-none bg-white shadow-sm px-5 text-sm font-bold focus:ring-4 focus:ring-teal-500/10 transition-all outline-none"
                                    value={selectedPO}
                                    onChange={(e) => {
                                        setSelectedPO(Number(e.target.value));
                                        setSelectedPOItems([]);
                                    }}
                                >
                                    <option value="">Select PO to receive against</option>
                                    {pos?.filter(p => p.status === 'APPROVED').map(p => (
                                        <option key={p.id} value={p.id}>{p.poNo} — {p.vendor?.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <Label className="text-xs font-black text-secondary-400 uppercase tracking-[0.2em] ml-1">Challan / Bill No</Label>
                                    <Input className="h-14 border-none bg-white shadow-sm rounded-2xl px-5 font-bold" value={challanNo} onChange={(e) => setChallanNo(e.target.value)} />
                                </div>
                                <div className="space-y-4">
                                    <Label className="text-xs font-black text-secondary-400 uppercase tracking-[0.2em] ml-1">Vehicle No</Label>
                                    <Input className="h-14 border-none bg-white shadow-sm rounded-2xl px-5 font-bold" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <Label className="text-sm font-black text-secondary-800 uppercase tracking-widest flex items-center gap-2">
                                <Boxes className="w-5 h-5 text-teal-500" /> Pending Items in PO
                                {selectedPO && <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">PO-{selectedPO} SELECTED</span>}
                            </Label>

                            <div className="bg-white rounded-[2rem] border border-secondary-100 shadow-xl shadow-secondary-200/20 overflow-hidden min-h-[12rem]">
                                <Table>
                                    <TableHeader className="bg-secondary-50/50">
                                        <TableRow className="border-b">
                                            <TableHead className="w-16 text-center border-r">
                                                <div className="text-[10px] font-black uppercase text-secondary-400">Sel</div>
                                            </TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-secondary-400">Item Description</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-secondary-400">Drawing / Rev</TableHead>
                                            <TableHead className="text-[10px] font-black uppercase text-secondary-400 text-right pr-8">PO Ref</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPendingItems?.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className={cn(
                                                    "cursor-pointer transition-all border-b last:border-0",
                                                    selectedPOItems.includes(item.id) ? "bg-teal-50/40" : "hover:bg-secondary-50/30"
                                                )}
                                                onClick={() => togglePOItem(item.id)}
                                            >
                                                <TableCell className="text-center border-r">
                                                    <div className={cn(
                                                        "w-6 h-6 mx-auto rounded-lg border-2 flex items-center justify-center transition-all shadow-sm",
                                                        selectedPOItems.includes(item.id) ? "bg-teal-500 border-teal-500 scale-110" : "bg-white border-secondary-200"
                                                    )}>
                                                        {selectedPOItems.includes(item.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900 text-sm">{item.piItem?.patternDie?.currentName}</span>
                                                        <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-widest">{item.piItem?.patternDie?.mainPartName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-secondary-600">{item.piItem?.patternDie?.drawingNo || "N/A"}</span>
                                                        <span className="text-[10px] text-teal-600 font-bold tracking-tighter">REV-{item.piItem?.patternDie?.revisionNo || "00"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-8">
                                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                                        {item.purchaseOrder?.poNo}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!filteredPendingItems || filteredPendingItems.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-48 text-center text-sm font-medium text-secondary-300 italic">
                                                    {selectedPO ? "All items against this PO have been received." : "Please select a Purchase Order from above."}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-10 bg-white border-t flex justify-between sm:justify-between items-center">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="h-14 px-10 rounded-2xl font-black text-secondary-400 uppercase tracking-widest hover:bg-secondary-50">Discard</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createMutation.isPending || selectedPOItems.length === 0}
                            className="h-14 px-14 rounded-2xl font-black bg-teal-600 hover:bg-teal-700 shadow-2xl shadow-teal-200 uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                            {createMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Complete Inward Entry"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
