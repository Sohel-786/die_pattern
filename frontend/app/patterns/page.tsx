"use client";

import { useState } from "react";
import { useMasters } from "@/hooks/use-masters";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog-legacy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Boxes,
    Plus,
    Pencil,
    History as HistoryIcon,
    Search,
    Loader2,
    MapPin,
    Truck,
    AlertCircle
} from "lucide-react";
import { PatternDie, Master, Location, Party } from "@/types";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PatternsPage() {
    const { query, createMutation, updateMutation } = useMasters("/patterndies", "patterns");

    // Load dependencies
    const { data: types } = useQuery<Master[]>({ queryKey: ["master-types"], queryFn: async () => (await api.get("/masters/types")).data });
    const { data: materials } = useQuery<Master[]>({ queryKey: ["master-materials"], queryFn: async () => (await api.get("/masters/materials")).data });
    const { data: owners } = useQuery<Master[]>({ queryKey: ["master-owners"], queryFn: async () => (await api.get("/masters/owner-types")).data });
    const { data: statuses } = useQuery<Master[]>({ queryKey: ["master-statuses"], queryFn: async () => (await api.get("/masters/statuses")).data });
    const { data: locations } = useQuery<Location[]>({ queryKey: ["locations"], queryFn: async () => (await api.get("/locations")).data });
    const { data: vendors } = useQuery<Party[]>({ queryKey: ["parties"], queryFn: async () => (await api.get("/parties")).data });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
    const [selectedPattern, setSelectedPattern] = useState<PatternDie | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const patterns = (query.data || []) as PatternDie[];
    const filteredPatterns = patterns.filter(p =>
        p.mainPartName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.currentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.drawingNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openAdd = () => {
        setSelectedPattern(null);
        setIsDialogOpen(true);
    };

    const openEdit = (p: PatternDie) => {
        setSelectedPattern(p);
        setIsDialogOpen(true);
    };

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        if (selectedPattern) {
            updateMutation.mutate({
                id: selectedPattern.id,
                data: { ...selectedPattern, ...data }
            }, { onSuccess: () => setIsDialogOpen(false) });
        } else {
            createMutation.mutate({ ...data, isActive: true }, { onSuccess: () => setIsDialogOpen(false) });
        }
    };

    const handleChangeProcess = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            newName: formData.get("newName"),
            newRevision: formData.get("newRevision"),
            reason: formData.get("reason"),
        };

        api.post(`/patterndies/${selectedPattern?.id}/change`, data)
            .then(() => {
                query.refetch();
                setIsChangeDialogOpen(false);
            });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">Die & Patterns</h2>
                    <p className="text-secondary-500 mt-1">Master database for all dies and patterns.</p>
                </div>
                <Button onClick={openAdd} className="bg-primary hover:bg-primary-600 rounded-2xl h-12 px-6">
                    <Plus className="w-5 h-5 mr-2" /> New Entry
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-secondary-100 flex-row items-center justify-between space-y-0">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by name, part name or drawing no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 rounded-xl"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-8">Part Details</TableHead>
                                <TableHead>Type / Material</TableHead>
                                <TableHead>Drawing / Rev</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Current Holder</TableHead>
                                <TableHead className="text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {query.isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPatterns.length > 0 ? (
                                filteredPatterns.map((p) => (
                                    <TableRow key={p.id} className="group">
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">{p.mainPartName}</span>
                                                <span className="text-sm font-bold text-secondary-900">{p.currentName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-secondary-600">{p.type?.name}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold">{p.material?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-secondary-700">{p.drawingNo || "N/A"}</span>
                                                <span className="text-[10px] text-primary font-bold">R{p.revisionNo || "0"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                p.status?.name === "Running" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                            )}>
                                                {p.status?.name}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {p.isAtVendor ? (
                                                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 w-fit">
                                                    <Truck className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{p.currentVendor?.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 w-fit">
                                                    <MapPin className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{p.currentLocation?.name}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit Details">
                                                    <Pencil className="w-4 h-4 text-secondary-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedPattern(p); setIsChangeDialogOpen(true); }} title="Change Process">
                                                    <HistoryIcon className="w-4 h-4 text-primary" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center text-secondary-400 italic">
                                        No patterns found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Main Entry Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedPattern ? "Edit Details" : "New Die/Pattern Entry"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-6 pt-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="mainPartName">Main Part Name (Permanent)</Label>
                            <Input
                                id="mainPartName"
                                name="mainPartName"
                                defaultValue={selectedPattern?.mainPartName}
                                disabled={!!selectedPattern}
                                placeholder="Unique identifier for this part"
                                required
                            />
                            {selectedPattern && <p className="text-[10px] text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Permanent field, cannot be edited.</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="typeId">Type</Label>
                            <select name="typeId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.typeId}>
                                {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="materialId">Material</Label>
                            <select name="materialId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.materialId}>
                                {materials?.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="drawingNo">Drawing No</Label>
                            <Input name="drawingNo" defaultValue={selectedPattern?.drawingNo} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="revisionNo">Revision No</Label>
                            <Input name="revisionNo" defaultValue={selectedPattern?.revisionNo} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ownerTypeId">Owner Type</Label>
                            <select name="ownerTypeId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.ownerTypeId}>
                                {owners?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="statusId">Initial Status</Label>
                            <select name="statusId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.statusId}>
                                {statuses?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currentLocationId">Initial Location</Label>
                            <select name="currentLocationId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.currentLocationId}>
                                <option value="">Select Location</option>
                                {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currentVendorId">Initial Vendor (Optional)</Label>
                            <select name="currentVendorId" className="flex h-11 w-full rounded-xl border border-secondary-200 px-4 py-2 text-sm" defaultValue={selectedPattern?.currentVendorId}>
                                <option value="">Select Vendor</option>
                                {vendors?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-2 pt-4">
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">save Entry</Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Change Process Dialog */}
            <Dialog open={isChangeDialogOpen} onOpenChange={setIsChangeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pattern Change Process</DialogTitle>
                        <DialogDescription>Modify the current name and revision of <b>{selectedPattern?.mainPartName}</b>. This will maintain history.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleChangeProcess} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="newName">New Current Name</Label>
                            <Input id="newName" name="newName" defaultValue={selectedPattern?.currentName} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newRevision">New Revision No</Label>
                            <Input id="newRevision" name="newRevision" defaultValue={selectedPattern?.revisionNo} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Change</Label>
                            <Input id="reason" name="reason" placeholder="e.g. Repaired, Modified for new drawing" required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsChangeDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Update & Record Change</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

