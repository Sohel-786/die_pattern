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
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Master } from "@/types";

interface LookupMasterProps {
    title: string;
    description: string;
    endpoint: string;
    queryKey: string;
}

export function LookupMaster({ title, description, endpoint, queryKey }: LookupMasterProps) {
    const { query, createMutation, updateMutation, deleteMutation } = useMasters(endpoint, queryKey);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Master | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const items = (query.data || []) as Master[];
    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;

        if (selectedItem) {
            updateMutation.mutate({
                id: selectedItem.id,
                data: { ...selectedItem, name }
            }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        } else {
            createMutation.mutate({ name, isActive: true }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">{title}</h2>
                    <p className="text-secondary-500 mt-1">{description}</p>
                </div>
                <Button onClick={() => { setSelectedItem(null); setIsDialogOpen(true); }} className="bg-primary hover:bg-primary-600 rounded-2xl h-12 px-6">
                    <Plus className="w-5 h-5 mr-2" /> Add New
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-secondary-100 flex-row items-center justify-between space-y-0">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search..."
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
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {query.isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredItems.length > 0 ? (
                                filteredItems.map((item) => (
                                    <TableRow key={item.id} className="group">
                                        <TableCell className="pl-8 font-medium text-secondary-500">#{item.id}</TableCell>
                                        <TableCell className="font-bold text-secondary-900">{item.name}</TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setIsDialogOpen(true); }}>
                                                    <Pencil className="w-4 h-4 text-secondary-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(item.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-40 text-center text-secondary-400 italic">
                                        No records found.
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
                        <DialogTitle>{selectedItem ? "Edit Entry" : "Add New Entry"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={selectedItem?.name} required />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Entry</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
