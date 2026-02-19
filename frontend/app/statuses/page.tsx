"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Status } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2, Search, Ban, CheckCircle, Download, Upload, Activity, Info } from "lucide-react";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { StatusDialog } from "@/components/masters/status-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

});

type StatusForm = z.infer<typeof statusSchema>;
type ActiveFilter = "all" | "active" | "inactive";

export default function StatusesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Status | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: permissions } = useCurrentUserPermissions();
  const canAddMaster = permissions?.manageMaster ?? false;
  const canEditMaster = permissions?.manageMaster ?? false;
  const canImportExportMaster = permissions?.manageMaster ?? false;

  const {
    handleExport,
    handleImport,
    exportLoading,
    importLoading,
    validationData,
    isPreviewOpen,
    confirmImport,
    closePreview,
  } = useMasterExportImport("statuses", ["statuses"]);

  const { data: statuses = [], isLoading } = useQuery<Status[]>({
    queryKey: ["statuses"],
    queryFn: async () => {
      const res = await api.get("/statuses");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/statuses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      reset();
      toast.success("Functional status registered");
      setIsFormOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StatusForm }) => api.patch(`/statuses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setIsFormOpen(false);
      toast.success("Status attributes updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/statuses/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Status activated" : "Status deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Status update failed")
  });

  const handleOpenForm = (status?: Status) => {
    if (status) {
      setEditingStatus(status);
      setValue("name", status.name);
      setValue("isActive", status.isActive);
    } else {
      setEditingStatus(null);
      reset();
      setValue("isActive", true);
    }
    setIsFormOpen(true);
  };

  const onSubmit = (data: StatusForm) => {
    if (editingStatus) {
      updateMutation.mutate({ id: editingStatus.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredStatuses = useMemo(() => {
    let list = statuses;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (activeFilter === "active") list = list.filter((s) => s.isActive);
    if (activeFilter === "inactive") list = list.filter((s) => !s.isActive);
    return list;
  }, [statuses, searchTerm, activeFilter]);

  return (
    <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Status Directory</h1>
          <p className="text-secondary-500 font-medium">Manage functional and operational states for system assets</p>
        </motion.div>
        <div className="flex flex-wrap gap-3">
          <input type="file" ref={importFileRef} accept=".xlsx,.xls" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { handleImport(f); e.target.value = ""; }
          }} />
          {canImportExportMaster && (
            <>
              <Button variant="ghost" onClick={handleExport} disabled={exportLoading} className="text-secondary-600 hover:text-primary-600 hover:bg-white border-transparent hover:border-primary-100 border font-bold h-11 px-5 transition-all">
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Button variant="ghost" onClick={() => importFileRef.current?.click()} disabled={importLoading} className="text-secondary-600 hover:text-primary-600 hover:bg-white border-transparent hover:border-primary-100 border font-bold h-11 px-5 transition-all">
                <Upload className="w-4 h-4 mr-2" /> Import
              </Button>
            </>
          )}
          {canAddMaster && (
            <Button onClick={() => handleOpenForm()} className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 font-bold h-11 px-6 active:scale-95 transition-all">
              <Plus className="w-4 h-4 mr-2" /> Register Status
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200/60 bg-white">
        <div className="p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search by status name or system label..."
              className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Label htmlFor="active-filter" className="text-xs font-bold text-secondary-500 uppercase tracking-widest whitespace-nowrap">State</Label>
            <select
              id="active-filter"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="flex h-11 w-full md:w-40 rounded-xl border border-secondary-200 bg-secondary-50/50 px-3 py-2 text-sm font-bold text-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="all">All States</option>
              <option value="active">Active Only</option>
              <option value="inactive">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="shadow-xl shadow-secondary-200/20 border-secondary-200/60 overflow-hidden bg-white">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-gradient-to-r from-white to-secondary-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Status Ledger</h3>
              <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredStatuses.length} Statuses Configured</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary-50/50">
              <TableRow className="border-secondary-100">
                <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Status Identification</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Lifecycle</TableHead>
                <TableHead className="w-[120px] pr-6 text-right font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Operations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="animate-pulse">
                      {Array(4).fill(0).map((_, j) => (
                        <TableCell key={j}><div className="h-5 bg-secondary-100 rounded-lg w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredStatuses.length > 0 ? (
                  filteredStatuses.map((s, idx) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                    >
                      <TableCell className="pl-6 py-5 font-bold text-secondary-400 text-xs">{String(idx + 1).padStart(2, '0')}</TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors uppercase tracking-tight">{s.name}</span>
                          <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">Operational State Definition</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${s.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {s.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(s)}
                            className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {canEditMaster && (
                            s.isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInactiveTarget(s)}
                                className="h-9 w-9 p-0 text-amber-500 hover:text-amber-600 hover:bg-white border hover:border-amber-100 rounded-xl transition-all shadow-sm"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleActiveMutation.mutate({ id: s.id, isActive: true })}
                                className="h-9 w-9 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-white border hover:border-emerald-100 rounded-xl transition-all shadow-sm"
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
                    <TableCell colSpan={4} className="py-24 text-center bg-secondary-50/20">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-secondary-200/50 flex items-center justify-center text-secondary-300">
                          <Activity className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-secondary-900 font-bold text-lg">No Statuses Defined</p>
                          <p className="text-secondary-400 text-sm font-medium">We couldn't find any status labels matching your criteria.</p>
                        </div>
                        <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Refresh Ledger</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog isOpen={!!inactiveTarget} onClose={() => setInactiveTarget(null)} title="Confirm Deactivation" size="sm">
        <div className="space-y-4">
          <p className="text-sm font-medium text-secondary-600 leading-relaxed">
            Are you sure you want to archive <span className="font-bold text-secondary-900">"{inactiveTarget?.name}"</span>? This will prevent it from being used in new asset records.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1 font-bold border-secondary-200">Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}>Deactivate</Button>
          </div>
        </div>
      </Dialog>

      <Dialog isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editingStatus ? "Update Status Protocol" : "Register New Status Label"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="status-name" className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest block">Status Label Master *</Label>
            <Input id="status-name" {...register("name")} placeholder="e.g. Under Repair, Ready for Production" className="h-12 border-secondary-200 focus:ring-primary-500/20 rounded-xl font-medium shadow-none" />
            {errors.name && <p className="text-xs text-rose-500 font-bold">{errors.name.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold h-12 shadow-lg shadow-primary-200">
              {editingStatus ? "Update Protocol" : "Save Label"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1 font-bold h-12 border-secondary-200">Discard</Button>
          </div>
        </form>
      </Dialog>

      <ImportPreviewModal isOpen={isPreviewOpen} onClose={closePreview} data={validationData} onConfirm={confirmImport} isLoading={importLoading} title="Import Statuses Preview" />
    </div>
  );
}
