"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { StoreItem, Role } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import {
  Plus,
  Edit2,
  Search,
  Ban,
  CheckCircle,
  Image as ImageIcon,
  Database,
  Box,
  MapPin
} from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { StoreItemDialog } from "@/components/masters/store-item-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ActiveFilter = "all" | "active" | "inactive";

export default function StoreItemsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<StoreItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === Role.QC_ADMIN;

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
  } = useMasterExportImport("items", ["items"]);

  const { data: items = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await api.get("/items");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => api.post("/items", fd, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setIsFormOpen(false);
      toast.success("Item created successfully");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Creation failed")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: number; fd: FormData }) => api.patch(`/items/${id}`, fd, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setIsFormOpen(false);
      toast.success("Item updated successfully");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Update failed")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/items/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Item activated." : "Item deactivated.");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Status update failed")
  });

  const handleOpenForm = (item?: StoreItem) => {
    setEditingItem(item ?? null);
    setIsFormOpen(true);
  };

  const onSubmit = (fd: FormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, fd });
    } else {
      createMutation.mutate(fd);
    }
  };

  const filteredItems = useMemo(() => {
    let list = items;
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(i =>
        i.itemName.toLowerCase().includes(q) ||
        i.serialNumber?.toLowerCase().includes(q) ||
        i.inHouseLocation?.toLowerCase().includes(q)
      );
    }
    if (activeFilter === "active") list = list.filter(i => i.isActive);
    if (activeFilter === "inactive") list = list.filter(i => !i.isActive);
    return list;
  }, [items, searchTerm, activeFilter]);

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Store Asset Master</h1>
            <p className="text-secondary-500 font-medium">Manage and monitor inventory of general store assets</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="file" ref={importFileRef} accept=".xlsx,.xls" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { handleImport(f); e.target.value = ""; }
            }} />
            {canImportExportMaster && (
              <ExportImportButtons
                onExport={handleExport}
                onImport={handleImport}
                exportLoading={exportLoading}
                importLoading={importLoading}
                inputId="store-items"
              />
            )}
            {canAddMaster && (
              <Button
                onClick={() => handleOpenForm()}
                className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register Asset
              </Button>
            )}
          </div>
        </div>

        <Card className="shadow-sm border-secondary-200 bg-white mb-6">
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <Input
                placeholder="Search by asset name, serial, or location..."
                className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-secondary-700">Status</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Inventory</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive / Archived</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-secondary-100">
            <h3 className="text-lg font-bold text-secondary-900">
              All Assets ({filteredItems.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                  <th className="px-4 py-3 font-semibold w-16 text-center">Sr.No</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Serial No</th>
                  <th className="px-4 py-3 font-semibold">Zone Location</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    [1, 2, 3].map((i) => (
                      <tr key={i} className="animate-pulse border-b border-secondary-100">
                        {Array(6).fill(0).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-5 bg-secondary-100 rounded-lg w-full" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group"
                      >
                        <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-lg overflow-hidden border border-secondary-200 bg-secondary-50 shrink-0 cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                              onClick={() => item.image && setFullScreenImageSrc(item.image.startsWith("/") ? `${API_BASE}${item.image}` : `${API_BASE}/storage/${item.image}`)}
                            >
                              {item.image ? (
                                <img src={item.image.startsWith("/") ? `${API_BASE}${item.image}` : `${API_BASE}/storage/${item.image}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-secondary-300">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight leading-none mb-1">{item.itemName}</span>
                              <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">{item.status}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-secondary-700 font-bold text-xs uppercase tracking-tight">{item.serialNumber || 'No Serial'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary-500" />
                            <span className="text-xs font-bold text-secondary-600 uppercase">{item.inHouseLocation || 'Not Specified'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${item.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEditMaster && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(item)}
                                className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => item.isActive ? setInactiveTarget(item) : toggleActiveMutation.mutate({ id: item.id, isActive: true })}
                                className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${item.isActive
                                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                                  : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                                  }`}
                                title={item.isActive ? "Deactivate" : "Activate"}
                              >
                                {item.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-secondary-500 italic">
                        No store items found matching your criteria.
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <StoreItemDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        item={editingItem}
        existingItems={items}
        onSubmit={onSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog isOpen={!!inactiveTarget} onClose={() => setInactiveTarget(null)} title="Confirm Deactivation" size="sm">
        <div className="space-y-4 p-1">
          <p className="text-sm font-medium text-secondary-600 leading-relaxed">
            Are you sure you want to deactivate <span className="font-bold text-secondary-900">"{inactiveTarget?.itemName}"</span>? This will stop it from appearing in active issuance lists.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1 font-bold border-secondary-200 rounded-xl h-11">Cancel</Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-11"
              onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? 'Processing...' : 'Deactivate'}
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
        title="Import Master Records Preview"
      />

      <FullScreenImageViewer
        isOpen={!!fullScreenImageSrc}
        onClose={() => setFullScreenImageSrc(null)}
        imageSrc={fullScreenImageSrc}
        alt="Asset Master View"
      />
    </div>
  );
}
