"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, History, Hammer, MapPin,
    Package, MoreVertical, Download,
    Edit, Database, ShieldCheck
} from "lucide-react";
import api from "@/lib/api";
import { Item } from "@/types";
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
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { ItemDialog } from "@/components/masters/item-dialog";
import { ItemChangeDialog } from "@/components/masters/item-change-dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function ItemsPage() {
    const [search, setSearch] = useState("");
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isChangeOpen, setIsChangeOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery<Item[]>({
        queryKey: ["items"],
        queryFn: async () => {
            const res = await api.get("/items");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/items", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Item registered successfully");
            setIsEntryOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to register")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/items/${selectedItem?.id}`, { ...data, id: selectedItem?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Information updated");
            setIsEntryOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const changeProcessMutation = useMutation({
        mutationFn: (data: any) => api.post("/items/change-process", { ...data, itemId: selectedItem?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Change process recorded");
            setIsChangeOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Process failed")
    });

    const importMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.post("/items/import-opening", formData);
        },
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ["items"] });
            toast.success("Import process complete. Check validation summary.");
        }
    });

    const handleEdit = (item: Item) => {
        setSelectedItem(item);
        setIsEntryOpen(true);
    };

    const handleChangeProcess = (item: Item) => {
        setSelectedItem(item);
        setIsChangeOpen(true);
    };

    const handleAdd = () => {
        setSelectedItem(null);
        setIsEntryOpen(true);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) importMutation.mutate(file);
    };

    const filteredItems = items.filter(i =>
        i.mainPartName.toLowerCase().includes(search.toLowerCase()) ||
        i.currentName.toLowerCase().includes(search.toLowerCase()) ||
        i.drawingNo?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Pattern Inventory</h1>
                    <p className="text-secondary-500 font-medium">Central digital repository for engineering patterns and dies</p>
                </motion.div>

                <div className="flex flex-wrap gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
                    <Button
                        variant="ghost"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                        className="text-secondary-600 hover:text-primary-600 hover:bg-white border-transparent hover:border-primary-100 border font-bold h-11 px-5 transition-all"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {importMutation.isPending ? "Importing..." : "Import Bulk Opening"}
                    </Button>
                    <Button
                        onClick={handleAdd}
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 font-bold h-11 px-6 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Register New Die
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm border-secondary-200/60 bg-white">
                <div className="p-5 flex flex-col xl:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by part identification, current nomenclature, or engineering drawing..."
                            className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card className="shadow-xl shadow-secondary-200/20 border-secondary-200/60 overflow-hidden bg-white">
                <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-gradient-to-r from-white to-secondary-50/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Active Asset Ledger</h3>
                            <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredItems.length} Registered Patterns</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-secondary-50/50">
                            <TableRow className="border-secondary-100">
                                <TableHead className="py-5 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Reference / Model</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Specifications</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Engineering DNA</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Custody / Zone</TableHead>
                                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Lifecycle State</TableHead>
                                <TableHead className="w-[80px] pr-6"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {isLoading ? (
                                    [1, 2, 3, 4, 5].map((i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            {Array(6).fill(0).map((_, j) => (
                                                <TableCell key={j}><div className="h-6 bg-secondary-100 rounded-lg w-full" /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : filteredItems.length > 0 ? (
                                    filteredItems.map((item, idx) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                                        >
                                            <TableCell className="py-5 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-11 w-11 rounded-1.5xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 ${item.itemTypeName?.toLowerCase().includes('die') ? 'bg-secondary-900 text-white' : 'bg-primary-600 text-white'}`}>
                                                        {item.itemTypeName?.toLowerCase().includes('die') ? <Hammer className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors uppercase tracking-tight leading-none mb-1">{item.currentName}</span>
                                                        <span className="text-[10px] text-secondary-400 font-bold uppercase tracking-wider">{item.mainPartName}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-secondary-700 text-xs uppercase">{item.itemTypeName}</span>
                                                    <span className="text-[10px] text-secondary-500 font-bold mt-0.5">{item.materialName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-mono text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 w-fit">{item.drawingNo || 'UNCLASSIFIED'}</span>
                                                    <span className="text-[10px] text-secondary-400 font-bold ml-1">REVISION {item.revisionNo || '00'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold uppercase text-secondary-400 leading-none">{item.currentHolderType}</span>
                                                    <span className="text-xs font-bold text-secondary-800 flex items-center gap-1.5 min-w-[120px]">
                                                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                                        {item.currentLocationName || item.currentPartyName || 'IN TRANSIT'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${item.statusName?.toLowerCase().includes('avail')
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${item.statusName?.toLowerCase().includes('avail') ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                                    {item.statusName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-5 pr-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-white border hover:border-secondary-200 transition-all opacity-40 group-hover:opacity-100 shadow-sm"><MoreVertical className="w-4 h-4 text-secondary-500" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl border-secondary-200 shadow-2xl p-1.5 w-60 overflow-hidden bg-white/95 backdrop-blur-md">
                                                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-xs text-secondary-700 hover:text-primary-600 hover:bg-primary-50/50 transition-colors">
                                                            <div className="h-8 w-8 rounded-lg bg-secondary-50 flex items-center justify-center group-hover:bg-primary-100">
                                                                <Edit className="w-4 h-4" />
                                                            </div>
                                                            Review Details
                                                        </DropdownMenuItem>
                                                        <div className="h-px bg-secondary-100 mx-2 my-1" />
                                                        <DropdownMenuItem onClick={() => handleChangeProcess(item)} className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-xs text-amber-700 hover:bg-amber-50/80 transition-colors">
                                                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                                                <Hammer className="w-4 h-4" />
                                                            </div>
                                                            Change Process
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-xs text-secondary-700 hover:text-primary-600 hover:bg-primary-50/50 transition-colors">
                                                            <div className="h-8 w-8 rounded-lg bg-secondary-50 flex items-center justify-center">
                                                                <History className="w-4 h-4" />
                                                            </div>
                                                            View Asset Timeline
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-24 text-center bg-secondary-50/20">
                                            <div className="flex flex-col items-center justify-center space-y-4">
                                                <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-secondary-200/50 flex items-center justify-center text-secondary-300">
                                                    <Database className="w-8 h-8" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-secondary-900 font-bold text-lg">No Inventory Matches</p>
                                                    <p className="text-secondary-400 text-sm font-medium">We couldn't locate any items matching your current filters.</p>
                                                </div>
                                                <Button variant="outline" onClick={() => setSearch("")} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Reset Field Filter</Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <ItemDialog
                isOpen={isEntryOpen}
                onClose={() => setIsEntryOpen(false)}
                item={selectedItem}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <ItemChangeDialog
                isOpen={isChangeOpen}
                onClose={() => setIsChangeOpen(false)}
                item={selectedItem}
                onSubmit={(data) => changeProcessMutation.mutate(data)}
                isLoading={changeProcessMutation.isPending}
            />
        </div>
    );
}
