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
    DialogFooter
} from "@/components/ui/dialog-legacy";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Party } from "@/types";
import { cn } from "@/lib/utils";

export default function PartiesPage() {
    const { query, createMutation, updateMutation, deleteMutation } = useMasters("/parties", "parties");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<Party | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const parties = (query.data || []) as Party[];
    const filteredParties = parties.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        if (selectedParty) {
            updateMutation.mutate({
                id: selectedParty.id,
                data: { ...selectedParty, ...data }
            }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        } else {
            createMutation.mutate({ ...data, isActive: true }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">Party Master</h2>
                    <p className="text-secondary-500 mt-1">Manage Vendors, Contractors and Partners.</p>
                </div>
                <Button onClick={() => { setSelectedParty(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary-600 rounded-2xl h-12 px-6">
                    <Plus className="w-5 h-5 mr-2" /> Add Party
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-secondary-100 flex-row items-center justify-between space-y-0">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search parties..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-10"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20 pl-8">ID</TableHead>
                                <TableHead>Party Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone / Email</TableHead>
                                <TableHead className="text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {query.isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredParties.length > 0 ? (
                                filteredParties.map((p) => (
                                    <TableRow key={p.id} className="group">
                                        <TableCell className="pl-8 font-medium text-secondary-500">#{p.id}</TableCell>
                                        <TableCell className="font-bold text-secondary-900">{p.name}</TableCell>
                                        <TableCell>{p.contactPerson || "—"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium">{p.phone || "—"}</span>
                                                <span className="text-[10px] text-secondary-400">{p.email || "—"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedParty(p); setIsDialogOpen(true); }}>
                                                    <Pencil className="w-4 h-4 text-secondary-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-secondary-400 italic">
                                        No parties found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedParty ? "Edit Party" : "Add New Party"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 pt-4">
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="name">Party / Vendor Name</Label>
                            <Input id="name" name="name" defaultValue={selectedParty?.name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input id="contactPerson" name="contactPerson" defaultValue={selectedParty?.contactPerson} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone No</Label>
                            <Input id="phone" name="phone" defaultValue={selectedParty?.phone} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" name="email" type="email" defaultValue={selectedParty?.email} />
                        </div>
                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="address">Full Address</Label>
                            <Input id="address" name="address" defaultValue={selectedParty?.address} />
                        </div>
                        <div className="col-span-2">
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit">Save Party</Button>
                            </DialogFooter>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
