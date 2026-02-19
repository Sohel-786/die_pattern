"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Contractor } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Plus, Search, Ban, CheckCircle, Download, Upload, Edit2, Users } from "lucide-react";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { ContractorDialog } from "@/components/masters/contractor-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActiveFilter = "all" | "active" | "inactive";

export default function ContractorsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Contractor | null>(null);
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
  } = useMasterExportImport("contractors", ["contractors"]);

  const { data: contractors = [], isLoading } = useQuery<Contractor[]>({
    queryKey: ["contractors"],
    queryFn: async () => {
      const res = await api.get("/contractors");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/contractors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setIsFormOpen(false);
      toast.success("Contractor registered successfully");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to register contractor")
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => api.patch(`/contractors/${editingContractor!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setIsFormOpen(false);
      setEditingContractor(null);
      toast.success("Contractor information updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update contractor")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/contractors/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Contractor reactivated" : "Contractor deactivated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update status")
  });

  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phoneNumber && c.phoneNumber.includes(searchTerm));
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "active" && c.isActive) ||
        (activeFilter === "inactive" && !c.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [contractors, searchTerm, activeFilter]);

  return (
    <div className="p-6 space-y-6 bg-secondary-50/30 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Contractor Directory</h1>
          <p className="text-secondary-500 font-medium">Manage external work partners and labor contractors</p>
        </motion.div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport()}
            disabled={exportLoading || contractors.length === 0}
            className="h-11 border-secondary-300 text-secondary-700 font-bold px-5 shadow-sm hover:bg-white active:scale-95 transition-all"
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
            className="h-11 border-secondary-300 text-secondary-700 font-bold px-5 shadow-sm hover:bg-white active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          {canAddMaster && (
            <Button
              onClick={() => { setEditingContractor(null); setIsFormOpen(true); }}
              className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg font-bold h-11 px-6 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Register Contractor
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-sm border-secondary-200/60 bg-white/80 backdrop-blur-sm">
          <div className="p-5 flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <Input
                placeholder="Search by name or contact number..."
                className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl"
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
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Contractor Ledger</h3>
                <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredContractors.length} Total Records</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary-50/50">
                <TableRow className="border-secondary-100">
                  <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                  <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Work Partner Details</TableHead>
                  <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Communication</TableHead>
                  <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Lifecycle</TableHead>
                  <TableHead className="w-[120px] pr-6 text-right font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Operations</TableHead>
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
                  ) : filteredContractors.length > 0 ? (
                    filteredContractors.map((c, idx) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                      >
                        <TableCell className="pl-6 py-5 font-bold text-secondary-400 text-xs">{String(idx + 1).padStart(2, '0')}</TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors">{c.name}</span>
                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">Enterprise Level Partner</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-5 font-bold text-secondary-600 text-sm">{c.phoneNumber}</TableCell>
                        <TableCell className="py-5 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${c.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {c.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setEditingContractor(c); setIsFormOpen(true); }}
                              className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
                              title="Edit partner record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {canEditMaster && (
                              c.isActive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setInactiveTarget(c)}
                                  className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-white border hover:border-amber-100 rounded-xl transition-all shadow-sm"
                                  title="Deactivate partner"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: true })}
                                  className="h-9 w-9 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-white border hover:border-emerald-100 rounded-xl transition-all shadow-sm"
                                  title="Reactivate partner"
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
                            <Users className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-secondary-900 font-bold text-lg">No Partners Found</p>
                            <p className="text-secondary-400 text-sm font-medium">We couldn't find any contractor records matching your filter.</p>
                          </div>
                          <Button variant="outline" onClick={() => { setSearchTerm(""); setActiveFilter("all"); }} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Reset Ledger View</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <ContractorDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        item={editingContractor}
        onSubmit={(data) => editingContractor ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Partner Deactivation"
        size="sm"
      >
        <div className="space-y-8 py-2">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner">
              <Ban className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-secondary-900">Deactivate Record?</h4>
              <p className="text-sm font-medium text-secondary-500 mt-1 max-w-[280px]">
                Are you sure you want to disable <span className="text-secondary-900 font-bold">{inactiveTarget?.name}</span>?
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
              Cancel
            </Button>
            <Button
              type="button"
              className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-200 active:scale-95 transition-all"
              onClick={() => toggleActiveMutation.mutate({ id: inactiveTarget!.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Updating..." : "Deactivate"}
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
        title="Import Contractors Preview"
      />
    </div>
  );
}

