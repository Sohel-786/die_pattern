"use client";

import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Company } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Upload, Building2, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { CompanyDialog } from "@/components/masters/company-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CompaniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Company | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.success("Company created successfully");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/companies/${selectedItem?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated successfully");
      setIsDialogOpen(false);
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

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
            Company Master
          </h1>
          <p className="text-secondary-600">
            Manage company master entries
          </p>
        </motion.div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm border-secondary-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleAdd}
            size="sm"
            className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Company
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <div className="p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search by name..."
              className="pl-10 h-10 border-secondary-300 shadow-sm focus:ring-primary-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="shadow-sm">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
          <h3 className="text-xl font-semibold leading-none tracking-tight text-secondary-900">
            All Companies ({filteredCompanies.length})
          </h3>
        </div>
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-secondary-200 m-6 mt-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200 bg-primary-50">
                    <th className="px-4 py-3 font-semibold text-primary-900 w-16">Sr.No</th>
                    <th className="px-4 py-3 font-semibold text-primary-900">Name</th>
                    <th className="px-4 py-3 font-semibold text-primary-900">Status</th>
                    <th className="px-4 py-3 font-semibold text-primary-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredCompanies.map((company, idx) => (
                      <motion.tr
                        key={company.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-secondary-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-secondary-900">{company.name}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${company.isActive
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-red-100 text-red-700 border-red-200'
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
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="w-4 h-4 text-secondary-500" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-secondary-500 text-lg">No companies found.</p>
            </div>
          )}
        </div>
      </Card>

      <CompanyDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        item={selectedItem}
        onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
