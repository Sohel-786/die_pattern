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
import { Building2, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { Company } from "@/types";

export default function CompaniesPage() {
    const { query, createMutation, updateMutation, deleteMutation } = useMasters("/companies", "companies");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const companies = (query.data || []) as Company[];
    const filteredCompanies = companies.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;

        if (selectedCompany) {
            updateMutation.mutate({
                id: selectedCompany.id,
                data: { ...selectedCompany, name }
            }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        } else {
            createMutation.mutate({ name, isActive: true }, {
                onSuccess: () => setIsDialogOpen(false)
            });
        }
    };

    const openAdd = () => {
        setSelectedCompany(null);
        setIsDialogOpen(true);
    };

    const openEdit = (company: Company) => {
        setSelectedCompany(company);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">Company Master</h2>
                    <p className="text-secondary-500 mt-1">Manage parent companies in the system.</p>
                </div>
                <Button onClick={openAdd} className="bg-primary hover:bg-primary-600 rounded-2xl h-12 px-6">
                    <Plus className="w-5 h-5 mr-2" /> Add Company
                </Button>
            </div>

            <Card>
                <CardHeader className="border-b border-secondary-100 flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-xl">Companies List</CardTitle>
                        <CardDescription>View and manage all registered companies</CardDescription>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search companies..."
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
                                <TableHead>Company Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {query.isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCompanies.length > 0 ? (
                                filteredCompanies.map((company) => (
                                    <TableRow key={company.id} className="group">
                                        <TableCell className="pl-8 font-medium text-secondary-500">#{company.id}</TableCell>
                                        <TableCell className="font-bold text-secondary-900">{company.name}</TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                company.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                            )}>
                                                {company.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(company)}>
                                                    <Pencil className="w-4 h-4 text-secondary-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(company.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-40 text-center text-secondary-400 italic">
                                        No companies found.
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
                        <DialogTitle>{selectedCompany ? "Edit Company" : "Add New Company"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={selectedCompany?.name}
                                placeholder="e.g. Aira Euro Automation"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Company"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { cn } from "@/lib/utils";
