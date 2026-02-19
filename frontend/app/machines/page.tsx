"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Machine, Contractor } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Search, Ban, CheckCircle, Download, Upload, Edit2, Monitor } from "lucide-react";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { MachineDialog } from "@/components/masters/machine-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActiveFilter = "all" | "active" | "inactive";

export default function MachinesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Machine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: permissions } = useCurrentUserPermissions();
  const canAddMaster = permissions?.manageMaster ?? false;
  const canEditMaster = permissions?.manageMaster ?? false;

  const {
    handleExport,
    handleImport,
    exportLoading,
    importLoading,
    validationData,
    isPreviewOpen,
    confirmImport,
    closePreview,
  } = useMasterExportImport("machines", ["machines"]);

  const { data: machines = [], isLoading } = useQuery<Machine[]>({
    queryKey: ["machines"],
    queryFn: async () => {
      const res = await api.get("/machines");
      return res.data?.data ?? [];
    },
  });

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["contractors", "active"],
    queryFn: async () => {
      const res = await api.get("/contractors/active");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/machines", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsFormOpen(false);
      toast.success("Machine registered successfully");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create machine")
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/machines/${editingMachine!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsFormOpen(false);
      setEditingMachine(null);
      toast.success("Machine updated successfully");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update machine")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/machines/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Machine operational" : "Machine off-line");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update status")
  });

  const filteredMachines = useMemo(() => {
    let list = machines;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.contractor?.name.toLowerCase().includes(q),
      );
    }
    if (activeFilter === "active") list = list.filter((m) => m.isActive);
    if (activeFilter === "inactive") list = list.filter((m) => !m.isActive);
    return list;
  }, [machines, searchTerm, activeFilter]);

  const handleDialogSubmit = (data: any) => {
    const isDuplicate = machines.some(
      (m) =>
        m.name.trim().toLowerCase() === data.name.trim().toLowerCase() &&
        m.contractorId === Number(data.contractorId) &&
        m.id !== editingMachine?.id
    );

    if (isDuplicate) {
      toast.error("Duplicate asset name detected for this contractor");
      return;
    }

    if (editingMachine) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Machine Master</h1>
          <p className="text-secondary-500 font-medium">Coordinate mechanical assets and contractor assignments</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport()}
            disabled={exportLoading || machines.length === 0}
            className="h-11 border-secondary-300 text-secondary-700 font-bold px-5 bg-white shadow-sm active:scale-95 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <input
            type="file"
            ref={importFileRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleImport(f as any);
                e.target.value = "";
              }
            }}
            className="hidden"
            accept=".xlsx,.xls,.csv"
          />
          <Button
            variant="outline"
            onClick={() => importFileRef.current?.click()}
            disabled={importLoading}
            className="h-11 border-secondary-300 text-secondary-700 font-bold px-5 bg-white shadow-sm active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          {canAddMaster && (
            <Button
              onClick={() => { setEditingMachine(null); setIsFormOpen(true); }}
              className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg font-bold h-11 px-6 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Machine
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200/60 bg-white">
        <div className="p-5 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search by asset name or contractor..."
              className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-secondary-100/80 p-1.5 rounded-2xl h-12">
            {(["all", "active", "inactive"] as ActiveFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${activeFilter === f ? 'bg-white text-primary-600 shadow-md translate-y-[0px]' : 'text-secondary-500 hover:text-secondary-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="shadow-xl shadow-secondary-200/20 border-secondary-200/60 overflow-hidden bg-white">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-gradient-to-r from-white to-secondary-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Asset Infrastructure</h3>
              <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredMachines.length} Active Records</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary-50/50">
              <TableRow className="border-secondary-100">
                <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Machine Description</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Contractor Hub</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Lifecycle</TableHead>
                <TableHead className="w-[120px] pr-6 text-right font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="animate-pulse">
                      {Array(5).fill(0).map((_, j) => (
                        <TableCell key={j}><div className="h-5 bg-secondary-100 rounded-lg w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredMachines.length > 0 ? (
                  filteredMachines.map((m, idx) => (
                    <motion.tr
                      key={m.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                    >
                      <TableCell className="pl-6 py-5 font-bold text-secondary-400 text-xs">{String(idx + 1).padStart(2, '0')}</TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors">{m.name}</span>
                          <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">Heavy Machinery Unit</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 font-bold text-secondary-600 text-sm">{m.contractor?.name || `ID: ${m.contractorId}`}</TableCell>
                      <TableCell className="py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${m.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${m.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {m.isActive ? 'Operational' : 'Shut Down'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingMachine(m); setIsFormOpen(true); }}
                            className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
                            title="Edit machine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {canEditMaster && (
                            m.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInactiveTarget(m)}
                                className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-white border hover:border-amber-100 rounded-xl transition-all shadow-sm"
                                title="Mark off-line"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleActiveMutation.mutate({ id: m.id, isActive: true })}
                                className="h-9 w-9 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-white border hover:border-emerald-100 rounded-xl transition-all shadow-sm"
                                title="Resume operations"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center bg-secondary-50/20">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-secondary-200/50 flex items-center justify-center text-secondary-300">
                          <Monitor className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-secondary-900 font-bold text-lg">No Assets Detected</p>
                          <p className="text-secondary-400 text-sm font-medium">We couldn't find any machine records matching your search criteria.</p>
                        </div>
                        <Button variant="outline" onClick={() => { setSearchTerm(""); setActiveFilter("all"); }} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Refresh Asset Ledger</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

      <MachineDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        item={editingMachine}
        contractors={contractors}
        onSubmit={handleDialogSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Stop Machine Operations"
        size="sm"
      >
        <div className="space-y-8 py-2">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <Ban className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-secondary-900">Confirm Decommission</h4>
              <p className="text-sm font-medium text-secondary-500 mt-1">
                Are you sure you want to take <span className="text-secondary-900 font-bold">{inactiveTarget?.name}</span> off-line? This will mark the asset as non-operational.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInactiveTarget(null)}
              className="h-12 border-secondary-300 font-bold rounded-xl"
            >
              Keep Running
            </Button>
            <Button
              type="button"
              className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-200 active:scale-95 transition-all"
              onClick={() => toggleActiveMutation.mutate({ id: inactiveTarget!.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Updating..." : "Confirm stop"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ImportPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        data={validationData}
        onConfirm={confirmImport}
        isLoading={importLoading}
        title="Import Machines Preview"
      />
    </div>
  );
}
