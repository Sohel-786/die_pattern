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
import { MapPin, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Location, Company } from "@/types";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export default function LocationsPage() {
    const { query, createMutation, updateMutation, deleteMutation } = useMasters("/locations", "locations");
    const { data: companies } = useQuery<Company[]>({
        queryKey: ["companies"],
        queryFn: async () => (await api.get("/companies")).data
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const locations = (query.data || []) as Location[];
    const filteredLocations = locations.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const companyId = parseInt(formData.get("companyId") as string);

        if (selectedLocation) {
            updateMutation.mutate({
                id: selectedLocation.id,
                data: { ...selectedLocation, name, companyId }
            }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        } else {
            createMutation.mutate({ name, companyId, isActive: true }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        }
    };

    const openAdd = () => {
        setSelectedLocation(null);
        setIsDialogOpen(true);
    };

    const openEdit = (loc: Location) => {
        setSelectedLocation(loc);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">Location Master</h2>
                    <p className="text-secondary-500 mt-1">Manage physical locations under each company.</p>
                </div>
                <Button onClick={openAdd} className="bg-primary hover:bg-primary-600 rounded-2xl h-12 px-6">
                    <Plus className="w-5 h-5 mr-2" /> Add Location
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-secondary-100 flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-xl">Locations List</CardTitle>
                        <CardDescription>View and manage all company-specific locations</CardDescription>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search locations..."
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
                                <TableHead>Location Name</TableHead>
                                <TableHead>Parent Company</TableHead>
                                <TableHead>Status</TableHead>
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
                            ) : filteredLocations.length > 0 ? (
                                filteredLocations.map((loc) => (
                                    <TableRow key={loc.id} className="group">
                                        <TableCell className="pl-8 font-medium text-secondary-500">#{loc.id}</TableCell>
                                        <TableCell className="font-bold text-secondary-900">{loc.name}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold">
                                                    {loc.company?.name[0]}
                                                </div>
                                                <span className="text-secondary-600 font-medium">{loc.company?.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                loc.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {loc.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                                                    <Pencil className="w-4 h-4 text-secondary-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(loc.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-40 text-center text-secondary-400 italic">
                                        No locations found.
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
                        <DialogTitle>{selectedLocation ? "Edit Location" : "Add New Location"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyId">Parent Company</Label>
                            <select
                                id="companyId"
                                name="companyId"
                                defaultValue={selectedLocation?.companyId}
                                className="flex h-11 w-full rounded-xl border border-secondary-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                                required
                            >
                                <option value="">Select Company</option>
                                {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Location Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={selectedLocation?.name}
                                placeholder="e.g. Unit 1 - Main Floor"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Location"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { cn } from "@/lib/utils";
