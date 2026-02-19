"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Search, Filter, History, Hammer, MapPin,
    Users, Package, MoreVertical, Download,
    Edit, Trash2, ShieldCheck, AlertTriangle, Database
} from "lucide-react";
import api from "@/lib/api";
import { PatternDie, HolderType } from "@/types";
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
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { PatternDieDialog } from "@/components/masters/pattern-die-dialog";
import { PatternChangeDialog } from "@/components/masters/pattern-change-dialog";
import { motion, AnimatePresence } from "framer-motion";

export default function PatternDiesPage() {
    const [search, setSearch] = useState("");
    const [isEntryOpen, setIsEntryOpen] = useState(false);
    const [isChangeOpen, setIsChangeOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PatternDie | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery<PatternDie[]>({
        queryKey: ["pattern-dies"],
        queryFn: async () => {
            const res = await api.get("/pattern-dies");
            return res.data.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post("/pattern-dies", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pattern-dies"] });
            toast.success("Pattern registered successfully");
            setIsEntryOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to register")
    });

    const updateMutation = useMutation({
        mutationFn: (data: any) => api.put(`/pattern-dies/${selectedItem?.id}`, { ...data, id: selectedItem?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pattern-dies"] });
            toast.success("Information updated");
            setIsEntryOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
    });

    const changeProcessMutation = useMutation({
        mutationFn: (data: any) => api.post("/pattern-dies/change-process", { ...data, patternDieId: selectedItem?.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["pattern-dies"] });
            toast.success("Change process recorded");
            setIsChangeOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Process failed")
    });

    const importMutation = useMutation({
        mutationFn: (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return api.post("/pattern-dies/import-opening", formData);
        },
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ["pattern-dies"] });
            //   toast.success(`${res.data.data.valid.length} patterns imported`);
            toast.success("Import process complete. Check validation summary.");
        }
    });

    const handleEdit = (item: PatternDie) => {
        setSelectedItem(item);
        setIsEntryOpen(true);
    };

    const handleChangeProcess = (item: PatternDie) => {
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
                        Pattern / Die Inventory
                    </h1>
                    <p className="text-secondary-600 font-medium">Central repository for all engineering patterns and dies</p>
                </motion.div>

                <div className="flex flex-wrap gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                        className="shadow-sm border-secondary-300"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {importMutation.isPending ? "Importing..." : "Import Opening"}
                    </Button>
                    <Button
                        onClick={handleAdd}
                        size="sm"
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Register New Entry
                    </Button>
                </div>
            </div>

            <Card className="shadow-sm">
                <div className="p-4 flex flex-col xl:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by part name, current name, or drawing number..."
                            className="pl-10 h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                        <Label htmlFor="status-filter" className="text-xs font-bold text-secondary-500 uppercase tracking-wider whitespace-nowrap">Status</Label>
                        <select
                            id="status-filter"
                            className="flex h-10 w-full xl:w-48 rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            <option>All Statuses</option>
                            <option>Available</option>
                            <option>Under Repair</option>
                            <option>In Modification</option>
                        </select>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
                </div>
            ) : (
                <Card className="shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-secondary-100">
                        <h3 className="text-xl font-semibold leading-none tracking-tight text-secondary-900">
                            Inventory Ledger ({filteredItems.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-primary-50">
                                <TableRow className="border-secondary-200">
                                    <TableHead className="font-bold text-primary-900 py-4 pl-6 uppercase tracking-wider text-[11px]">Part Identification</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Type / Specs</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Engineering Ref</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Ownership</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px]">Location Tracking</TableHead>
                                    <TableHead className="font-bold text-primary-900 uppercase tracking-wider text-[11px] text-center">Status</TableHead>
                                    <TableHead className="w-[80px] pr-6"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredItems.map((item, idx) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.03 }}
                                            className="group border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                                        >
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${item.patternTypeName?.toLowerCase().includes('die') ? 'bg-secondary-600 text-white' : 'bg-primary-600 text-white'}`}>
                                                        {item.patternTypeName?.toLowerCase().includes('die') ? <Hammer className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-secondary-900 text-sm">{item.currentName}</p>
                                                        <p className="text-[11px] text-secondary-500 font-medium">{item.mainPartName}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-bold text-secondary-700 text-xs">{item.patternTypeName}</p>
                                                <p className="text-[10px] text-secondary-400 font-medium mt-0.5">{item.materialName}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100 w-fit">{item.drawingNo || 'UNREF'}</p>
                                                <p className="text-[10px] text-secondary-400 font-bold mt-1 ml-0.5">Rev: {item.revisionNo || '0'}</p>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-medium text-secondary-700">{item.ownerTypeName}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-bold uppercase text-secondary-400">{item.currentHolderType}</span>
                                                    <span className="text-xs font-bold text-secondary-800 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-primary-500" />
                                                        {item.currentLocationName || item.currentPartyName || 'TRANSFER PENDING'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${item.statusName?.toLowerCase().includes('avail')
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {item.statusName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-secondary-100"><MoreVertical className="w-4 h-4 text-secondary-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl border-secondary-200 shadow-xl p-1 w-56">
                                                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-lg gap-2 cursor-pointer py-2 font-medium text-secondary-700">
                                                            <Edit className="w-4 h-4" /> Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleChangeProcess(item)} className="rounded-lg gap-2 cursor-pointer py-2 font-bold text-amber-600 bg-amber-50/50 hover:bg-amber-100 mt-1">
                                                            <Hammer className="w-4 h-4" /> Change Process
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer py-2 font-medium text-secondary-700 hover:bg-secondary-50">
                                                            <History className="w-4 h-4 text-primary-400" /> View History
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            <PatternDieDialog
                isOpen={isEntryOpen}
                onClose={() => setIsEntryOpen(false)}
                item={selectedItem}
                onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
                isLoading={createMutation.isPending || updateMutation.isPending}
            />

            <PatternChangeDialog
                isOpen={isChangeOpen}
                onClose={() => setIsChangeOpen(false)}
                item={selectedItem}
                onSubmit={(data) => changeProcessMutation.mutate(data)}
                isLoading={changeProcessMutation.isPending}
            />
        </div>
    );
}
