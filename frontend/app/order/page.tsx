"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { PurchaseOrder, PIItem, Party } from "@/types";
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
import { Plus, Search, Loader2, CheckCircle2, ShoppingCart, Truck, Calendar } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function OrderPage() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form state
    const [selectedVendor, setSelectedVendor] = useState<number | "">("");
    const [selectedPIItems, setSelectedPIItems] = useState<number[]>([]);
    const [orderRates, setOrderRates] = useState<Record<number, number>>({});
    const [deliveryDate, setDeliveryDate] = useState("");
    const [terms, setTerms] = useState("");

    const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
        queryKey: ["orders"],
        queryFn: async () => (await api.get("/PurchaseOrders")).data
    });

    const { data: pendingPIItems } = useQuery<PIItem[]>({
        queryKey: ["pending-pi-items"],
        queryFn: async () => (await api.get("/PurchaseIndents/pending")).data
    });

    const { data: vendors } = useQuery<Party[]>({
        queryKey: ["parties"],
        queryFn: async () => (await api.get("/parties")).data
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => (await api.post("/PurchaseOrders", data)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["pending-pi-items"] });
            setIsDialogOpen(false);
            setSelectedPIItems([]);
            setOrderRates({});
            toast.success("Purchase Order issued successfully");
        },
        onError: (err: any) => toast.error(err.response?.data || "Failed to create PO")
    });

    const approveMutation = useMutation({
        mutationFn: async (id: number) => (await api.post(`/PurchaseOrders/${id}/approve`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            toast.success("PO Approved");
        }
    });

    const handleCreate = () => {
        if (!selectedVendor) return toast.error("Please select a vendor");
        if (selectedPIItems.length === 0) return toast.error("Please select at least one item from Indents");

        const items = selectedPIItems.map(piItemId => ({
            piItemId,
            rate: orderRates[piItemId] || 0
        }));

        const totalAmount = items.reduce((acc, curr) => acc + curr.rate, 0);

        createMutation.mutate({
            vendorId: selectedVendor,
            deliveryDate,
            terms,
            totalAmount,
            items
        });
    };

    const togglePIItem = (id: number) => {
        setSelectedPIItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900">Purchase Order</h2>
                    <p className="text-secondary-500">Official orders issued to vendors against indents.</p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    <Truck className="w-5 h-5 mr-2" /> Release PO
                </Button>
            </div>

            <Card className="border-none shadow-xl shadow-secondary-100/50">
                <CardHeader className="border-b bg-secondary-50/30">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search PO No..."
                            className="pl-10 h-10 border-secondary-200"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary-50/10">
                                <TableHead className="pl-8 py-4 font-bold text-xs uppercase text-secondary-500">PO Details</TableHead>
                                <TableHead className="py-4 font-bold text-xs uppercase text-secondary-500">Vendor</TableHead>
                                <TableHead className="py-4 font-bold text-xs uppercase text-secondary-500">Amount</TableHead>
                                <TableHead className="py-4 font-bold text-xs uppercase text-secondary-500">Status</TableHead>
                                <TableHead className="py-4 font-bold text-xs uppercase text-secondary-500">Delivery By</TableHead>
                                <TableHead className="pr-8 py-4 text-right font-bold text-xs uppercase text-secondary-500">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                            ) : orders?.map((po) => (
                                <TableRow key={po.id} className="group border-b">
                                    <TableCell className="pl-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-secondary-900">{po.poNo}</span>
                                            <span className="text-[10px] text-secondary-400">{new Date(po.poDate).toLocaleDateString()}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-secondary-700">{po.vendor?.name}</span>
                                            <span className="text-[10px] text-secondary-400">{po.vendor?.contactPerson}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-bold text-secondary-900">₹{po.totalAmount?.toLocaleString() || "0"}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                            po.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                                po.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                        )}>
                                            {po.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-secondary-600">
                                            <Calendar className="w-3.5 h-3.5 text-secondary-400" />
                                            {po.deliveryDate ? new Date(po.deliveryDate).toLocaleDateString() : "—"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-8 text-right">
                                        {po.status === "PENDING" && (
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 border-green-200" onClick={() => approveMutation.mutate(po.id)}>
                                                    Approve PO
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
                <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
                    <DialogHeader className="p-8 bg-indigo-600 text-white">
                        <DialogTitle className="text-3xl font-bold flex items-center gap-3">
                            <Truck className="w-8 h-8" /> Release Purchase Order
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-secondary-50/20">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-secondary-500 uppercase">Select Vendor</Label>
                                <select
                                    className="w-full h-11 rounded-xl border-secondary-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                                    value={selectedVendor}
                                    onChange={(e) => setSelectedVendor(Number(e.target.value))}
                                >
                                    <option value="">Select a Vendor</option>
                                    {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-secondary-500 uppercase">Promised Delivery Date</Label>
                                <Input type="date" className="h-11 rounded-xl" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-secondary-500 uppercase">Payment Terms</Label>
                                <Input className="h-11 rounded-xl" placeholder="e.g. 30 Days after QC" value={terms} onChange={(e) => setTerms(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-sm font-bold text-secondary-800 uppercase flex justify-between">
                                Select Items from Approved Indents
                                <span className="text-xs lowercase font-normal italic text-secondary-400">Items from all approved PI pending for order</span>
                            </Label>

                            <div className="bg-white rounded-2xl border border-secondary-100 shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-secondary-50/50">
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead className="text-xs">PI No</TableHead>
                                            <TableHead className="text-xs">Pattern Details</TableHead>
                                            <TableHead className="text-xs">Initial Type</TableHead>
                                            <TableHead className="text-xs w-48">Quoted Rate (₹)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pendingPIItems?.map((item) => (
                                            <TableRow key={item.id} className={cn(selectedPIItems.includes(item.id) ? "bg-indigo-50/30" : "")}>
                                                <TableCell className="text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded accent-indigo-600"
                                                        checked={selectedPIItems.includes(item.id)}
                                                        onChange={() => togglePIItem(item.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium text-secondary-600 text-xs">{item.purchaseIndent?.piNo}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900 text-sm">{item.patternDie?.currentName}</span>
                                                        <span className="text-[10px] text-secondary-400 font-bold uppercase">{item.patternDie?.mainPartName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="px-2 py-0.5 rounded-lg bg-secondary-100 text-[10px] font-bold text-secondary-600 uppercase">
                                                        {item.purchaseIndent?.type}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        className="h-9 text-right text-xs rounded-lg border-secondary-200"
                                                        disabled={!selectedPIItems.includes(item.id)}
                                                        value={orderRates[item.id] || ""}
                                                        onChange={(e) => setOrderRates({ ...orderRates, [item.id]: Number(e.target.value) })}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!pendingPIItems || pendingPIItems.length === 0) && (
                                            <TableRow><TableCell colSpan={5} className="h-32 text-center text-sm text-secondary-400 italic">No pending PI items found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-secondary-50 border-t flex justify-between sm:justify-between items-center">
                        <div className="text-left">
                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Total Order Value</p>
                            <p className="text-2xl font-black text-secondary-900">₹{Object.entries(orderRates).filter(([id]) => selectedPIItems.includes(Number(id))).reduce((acc, [_, r]) => acc + r, 0).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="h-12 px-8 rounded-2xl font-bold border-secondary-300">Cancel</Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending}
                                className="h-12 px-10 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100"
                            >
                                {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Issue PO"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
