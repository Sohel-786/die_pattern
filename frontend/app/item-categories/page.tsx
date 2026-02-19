"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { ItemCategory } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Search, Ban, CheckCircle, Download, Upload, Layers, Database } from "lucide-react";
import { toast } from "react-hot-toast";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { ItemCategoryDialog } from "@/components/masters/item-category-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must be at most 100 characters"),
  isActive: z.boolean().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;
type ActiveFilter = "all" | "active" | "inactive";

export default function ItemCategoriesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<ItemCategory | null>(null);
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
  } = useMasterExportImport("item-categories", ["item-categories"]);

  const { data: categories = [], isLoading } = useQuery<ItemCategory[]>({
    queryKey: ["item-categories"],
    queryFn: async () => {
      const res = await api.get("/item-categories");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/item-categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
      toast.success("Item category registered");
      setIsFormOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.patch(`/item-categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
      setIsFormOpen(false);
      toast.success("Category details updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/item-categories/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["item-categories"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Category activated" : "Category deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Status update failed")
  });

  const handleOpenForm = (category?: ItemCategory) => {
    setEditingCategory(category ?? null);
    setIsFormOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredCategories = useMemo(() => {
    let list = categories;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (activeFilter === "active") list = list.filter((c) => c.isActive);
    if (activeFilter === "inactive") list = list.filter((c) => !c.isActive);
    return list;
  }, [categories, searchTerm, activeFilter]);

  return (
    <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Item Categories</h1>
          <p className="text-secondary-500 font-medium">Classify and organize your engineering assets and components</p>
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
              <Plus className="w-4 h-4 mr-2" /> Register Category
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200/60 bg-white">
        <div className="p-5 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Filter by classification name..."
              className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Label htmlFor="active-filter" className="text-xs font-bold text-secondary-500 uppercase tracking-widest whitespace-nowrap">Status</Label>
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
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Classification Ledger</h3>
              <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredCategories.length} Categories Defined</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary-50/50">
              <TableRow className="border-secondary-100">
                <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Classification Label</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px] text-center">Engagement</TableHead>
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
                ) : filteredCategories.length > 0 ? (
                  filteredCategories.map((c, idx) => (
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
                          <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors uppercase tracking-tight">{c.name}</span>
                          <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">System Entity classification</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${c.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {c.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(c)}
                            className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
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
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleActiveMutation.mutate({ id: c.id, isActive: true })}
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
                          <Layers className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-secondary-900 font-bold text-lg">No Categories Detected</p>
                          <p className="text-secondary-400 text-sm font-medium">We couldn't find any classifications matching your search.</p>
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
            Are you sure you want to deactivate <span className="font-bold text-secondary-900">"{inactiveTarget?.name}"</span>? This will hide the category from active selection lists.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1 font-bold border-secondary-200">Cancel</Button>
            <Button className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}>Deactivate</Button>
          </div>
        </div>
      </Dialog>

      <ItemCategoryDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        item={editingCategory}
        onSubmit={onSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ImportPreviewModal isOpen={isPreviewOpen} onClose={closePreview} data={validationData} onConfirm={confirmImport} isLoading={importLoading} title="Import Item Categories Preview" />
    </div>
  );
}
