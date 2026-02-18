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
        <div className="p-8 space-y-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Package className="w-10 h-10 text-primary-600" />
                        Pattern / Die Inventory
                    </h1>
                    <p className="text-gray-500 mt-2 font-semibold text-lg">Central repository for all engineering patterns and dies</p>
                </motion.div>

                <div className="flex flex-wrap gap-4">
                    <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".xlsx,.xls" />
                    <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importMutation.isPending}
                        className="rounded-2xl h-14 px-6 border-2 border-gray-100 font-bold hover:bg-secondary-50 transition-all shadow-sm"
                    >
                        <Download className="w-5 h-5 mr-3 text-primary-600" />
                        {importMutation.isPending ? "Importing..." : "Import Opening"}
                    </Button>
                    <Button
                        onClick={handleAdd}
                        className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-2xl shadow-primary/25 transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-6 h-6 mr-2" />
                        Register New Entry
                    </Button>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 items-stretch justify-between bg-white p-6 rounded-[2.5rem] shadow-xl shadow-black/5 border border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <Input
                        placeholder="Search by part name, current name, or drawing number..."
                        className="pl-14 h-14 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold placeholder:text-gray-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-5 py-3.5 bg-secondary-50/50 rounded-2xl border border-gray-100 h-14 min-w-[200px]">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Filter By Status</span>
                        <select className="bg-transparent border-none text-sm font-black text-gray-800 focus:ring-0 cursor-pointer w-full">
                            <option>All Statuses</option>
                            <option>Available</option>
                            <option>Under Repair</option>
                            <option>In Modification</option>
                        </select>
                    </div>
                    <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-secondary-50/50 border border-gray-100 hover:bg-white transition-all">
                        <Filter className="w-6 h-6 text-gray-500" />
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-[6px] border-primary-100 border-t-primary-600"></div>
                    <p className="font-black text-primary-900 tracking-widest uppercase text-xs">Accessing Vault...</p>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-100">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-secondary-50/80 backdrop-blur-sm">
                                <TableRow className="border-none">
                                    <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-wider text-xs">Part Identification</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Type / Tech Specs</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Engineering Ref</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Ownership</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs">Location Tracking</TableHead>
                                    <TableHead className="font-black text-gray-900 uppercase tracking-wider text-xs text-center">Status</TableHead>
                                    <TableHead className="w-[80px] pr-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredItems.map((item, idx) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group border-b border-gray-50 hover:bg-primary-50/30 transition-all cursor-default"
                                        >
                                            <TableCell className="py-7 pl-10 whitespace-nowrap">
                                                <div className="flex items-center gap-5">
                                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${item.patternTypeName?.toLowerCase().includes('die') ? 'bg-indigo-600 text-white' : 'bg-primary-600 text-white'}`}>
                                                        {item.patternTypeName?.toLowerCase().includes('die') ? <Hammer className="w-7 h-7" /> : <Package className="w-7 h-7" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-lg leading-tight mb-1">{item.currentName}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded-md">MAIN</span>
                                                            <p className="text-xs text-gray-500 font-bold">{item.mainPartName}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <p className="font-black text-gray-800 text-sm">{item.patternTypeName}</p>
                                                <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5 mt-1">
                                                    <Database className="w-3 h-3" /> {item.materialName}
                                                </p>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="space-y-1.5">
                                                    <p className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl w-fit">{item.drawingNo || 'UNREF'}</p>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter ml-1">Revision: {item.revisionNo || '0'}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                                                    <span className="text-sm font-bold text-gray-700 tracking-tight">{item.ownerTypeName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <div className={`flex flex-col gap-1.5 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm group-hover:shadow-md transition-shadow`}>
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                                                        {item.currentHolderType === HolderType.Location ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                                        {item.currentHolderType}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-black text-gray-800">
                                                        {item.currentHolderType === HolderType.Location ? <MapPin className="w-4 h-4 text-primary-600" /> : <Users className="w-4 h-4 text-amber-600" />}
                                                        {item.currentLocationName || item.currentPartyName || 'TRANSFER PENDING'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center whitespace-nowrap px-6">
                                                <span className={`px-5 py-2 rounded-2xl text-[10px] uppercase font-black tracking-widest border-2 ${item.statusName?.toLowerCase().includes('avail') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                    {item.statusName}
                                                </span>
                                            </TableCell>
                                            <TableCell className="pr-10 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100"><MoreVertical className="w-6 h-6 text-gray-400" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-[2rem] border-gray-100 shadow-2xl p-3 w-64 mt-2">
                                                        <div className="px-4 py-3 border-b border-gray-50 mb-2">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Options</p>
                                                        </div>
                                                        <DropdownMenuItem onClick={() => handleEdit(item)} className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                                                            <Edit className="w-5 h-5" /> Detailed Modification
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleChangeProcess(item)} className="rounded-xl gap-3 cursor-pointer py-3 font-black text-amber-600 bg-amber-50/50 hover:bg-amber-100 mb-2 mt-1">
                                                            <Hammer className="w-5 h-5" /> Change Process
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-gray-700 hover:bg-secondary-50">
                                                            <History className="w-5 h-5 text-indigo-400" /> Engineering Ledger
                                                        </DropdownMenuItem>
                                                        <div className="h-px bg-gray-100 my-2"></div>
                                                        <DropdownMenuItem className="rounded-xl gap-3 cursor-pointer py-3 font-bold text-rose-600 hover:bg-rose-50">
                                                            <Trash2 className="w-5 h-5" /> Decommission Record
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
                    {filteredItems.length === 0 && (
                        <div className="p-20 text-center space-y-4">
                            <div className="h-24 w-24 bg-secondary-100 rounded-full flex items-center justify-center mx-auto">
                                <Search className="w-10 h-10 text-gray-300" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">No blueprints found</h3>
                                <p className="text-gray-500 font-medium">Try adjusting your filters or register a new record</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Dialogs */}
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
