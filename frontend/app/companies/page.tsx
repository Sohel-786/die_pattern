"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Company } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Edit2, Ban, CheckCircle, Upload, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { CompanyDialog } from "@/components/masters/company-dialog";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { Dialog } from "@/components/ui/dialog";

export default function CompaniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Company | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogKey, setDialogKey] = useState(0);
  const [inactiveTarget, setInactiveTarget] = useState<Company | null>(null);

  const queryClient = useQueryClient();
  const {
    handleExport,
    handleImport,
    confirmImport,
    closePreview,
    exportLoading,
    importLoading,
    isPreviewOpen,
    validationData,
  } = useMasterExportImport("companies", ["companies"]);

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/companies", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company registered successfully");
      setSelectedItem(null);
      setDialogKey(prev => prev + 1); // Reset for next entry
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/companies/${selectedItem?.id || data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Details updated successfully");
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.put(`/companies/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Company activated" : "Company deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const handleEdit = (item: Company) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const toggleStatus = (item: Company) => {
    if (item.isActive) {
      setInactiveTarget(item);
    } else {
      toggleActiveMutation.mutate({ id: item.id, isActive: true });
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all"
      ? true
      : activeFilter === "active"
        ? c.isActive
        : !c.isActive;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Company Master</h1>
          <p className="text-secondary-500 font-medium">Manage master data for various companies</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="import-companies"
            className="hidden"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            className="shadow-sm border-secondary-200"
            onClick={handleExport}
            disabled={exportLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            className="shadow-sm border-secondary-200"
            onClick={() => document.getElementById("import-companies")?.click()}
            disabled={importLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200 bg-white mb-6">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search by name..."
              className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-secondary-700">Status</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all appearance-none cursor-pointer pr-8"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-secondary-100">
          <h3 className="text-lg font-bold text-secondary-900">
            All Companies ({filteredCompanies.length})
          </h3>
        </div>
        <div className="table-container">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                <th className="px-4 py-3 font-semibold w-16 text-center">Sr.No</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
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
              ) : filteredCompanies.length > 0 ? (
                filteredCompanies.map((company, idx) => (
                  <tr
                    key={company.id}
                    className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3 text-secondary-500 font-medium text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-secondary-900 uppercase tracking-tight">
                      {company.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${company.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(company)}
                          className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(company)}
                          className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${company.isActive
                            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                            : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                            }`}
                          title={company.isActive ? "Deactivate" : "Activate"}
                        >
                          {company.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-secondary-500 italic">
                    No companies found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <CompanyDialog
        key={dialogKey}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Confirm Deactivation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.name}</span>?
            This company will no longer appear in new master or transaction entries.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setInactiveTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate"}
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
        title="Import Companies Preview"
      />
    </div>
  );
}
