"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Status } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Search, Ban, CheckCircle } from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { StatusDialog } from "@/components/masters/status-dialog";
import { Dialog } from "@/components/ui/dialog";

type ActiveFilter = "all" | "active" | "inactive";

export default function StatusesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Status | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [dialogKey, setDialogKey] = useState(0);

  const queryClient = useQueryClient();
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: permissions } = useCurrentUserPermissions();
  const canManageStatus = permissions?.manageItemStatus ?? false;

  if (permissions && !permissions.viewMaster) {
    return (
      <div className="flex h-[80vh] items-center justify-center font-sans">
        <div className="text-center">
          <h2 className="text-xl font-bold text-secondary-900 border-b border-primary-100 pb-2 mb-2">Access Denied</h2>
          <p className="text-secondary-500 font-medium">You don't have permission to view functional statuses.</p>
        </div>
      </div>
    );
  }

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

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/statuses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      toast.success("Functional status registered");
      setEditingStatus(null);
      setDialogKey(prev => prev + 1); // Reset for next entry
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/statuses/${editingStatus?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statuses"] });
      setIsFormOpen(false);
      setEditingStatus(null);
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
    setEditingStatus(status ?? null);
    setIsFormOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingStatus) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredStatuses = statuses.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" ? true : activeFilter === "active" ? s.isActive : !s.isActive;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Functional Statuses</h1>
          <p className="text-secondary-500 font-medium">Define master data for item life-cycle states</p>
        </div>
        <div className="flex items-center gap-2">
          {canManageStatus && (
            <ExportImportButtons
              onExport={handleExport}
              onImport={handleImport}
              exportLoading={exportLoading}
              importLoading={importLoading}
              inputId="statuses"
            />
          )}
          {canManageStatus && (
            <Button onClick={() => handleOpenForm()} className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Define Status
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200 bg-white mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Filter by name..."
              className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary-700">Display</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 appearance-none cursor-pointer pr-8"
            >
              <option value="all">All Records</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-secondary-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-secondary-900">Registered Statuses ({filteredStatuses.length})</h3>
        </div>
        <div className="table-container">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                <th className="px-4 py-3 font-semibold w-16 text-center">Sr.No</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Name</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse border-b border-secondary-100">
                    {Array(4).fill(0).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-5 bg-secondary-100 rounded-lg w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filteredStatuses.length > 0 ? (
                filteredStatuses.map((status, idx) => (
                  <tr key={status.id} className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group">
                    <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-secondary-900 uppercase">
                      {status.name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${status.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {status.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManageStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(status)}
                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canManageStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => status.isActive ? setInactiveTarget(status) : toggleActiveMutation.mutate({ id: status.id, isActive: true })}
                            className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${status.isActive
                              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                              : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                              }`}
                            title={status.isActive ? "Deactivate" : "Activate"}
                          >
                            {status.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-secondary-500 italic font-medium">
                    No functional statuses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <StatusDialog
        key={dialogKey}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStatus(null);
        }}
        item={editingStatus}
        onSubmit={onSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Confirm Status Inactivation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.name}</span>?
            This status will no longer be available for selection in item masters.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1 font-bold">
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate Status"}
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
        title="Import Statuses Preview"
      />
    </div>
  );
}
