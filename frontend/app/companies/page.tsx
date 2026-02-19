"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Company } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Download, Building2, Edit2, Database } from "lucide-react";
import { toast } from "react-hot-toast";
import { CompanyDialog } from "@/components/masters/company-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CompaniesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Company | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

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
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/companies/${selectedItem?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company details updated");
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
    <div className="p-6 space-y-6 bg-secondary-50/20 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold text-secondary-900 leading-tight mb-2 tracking-tight">Company Master</h1>
          <p className="text-secondary-500 font-medium">Manage legal entities and business corporate structures</p>
        </motion.div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="text-secondary-600 hover:text-primary-600 hover:bg-white border-transparent hover:border-primary-100 border font-bold h-11 px-5 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 font-bold h-11 px-6 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Entity
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200/60 bg-white">
        <div className="p-5 flex items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Filter by legal name, entity group, or classification..."
              className="pl-11 h-12 border-secondary-200 shadow-none focus:ring-primary-500 text-sm font-medium rounded-xl bg-secondary-50/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="shadow-xl shadow-secondary-200/20 border-secondary-200/60 overflow-hidden bg-white">
        <div className="p-6 border-b border-secondary-100 flex items-center justify-between bg-gradient-to-r from-white to-secondary-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-secondary-900 tracking-tight">Enterprise Ledger</h3>
              <p className="text-[11px] font-bold text-secondary-400 uppercase tracking-widest">{filteredCompanies.length} Registered Entities</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary-50/50">
              <TableRow className="border-secondary-100">
                <TableHead className="w-20 pl-6 font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Sr.</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Corporate Name</TableHead>
                <TableHead className="font-bold text-secondary-600 uppercase tracking-widest text-[10px]">Entity Classification</TableHead>
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
                ) : filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company, idx) => (
                    <motion.tr
                      key={company.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-primary-50/30 transition-all border-b border-secondary-50 last:border-0"
                    >
                      <TableCell className="pl-6 py-5 font-bold text-secondary-400 text-xs">{String(idx + 1).padStart(2, '0')}</TableCell>
                      <TableCell className="py-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-secondary-900 text-sm group-hover:text-primary-700 transition-colors">{company.name}</span>
                          <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tight">Global Corporate Entity</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary-100 text-secondary-600 uppercase tracking-wider">
                          Holding/Subsidiary
                        </span>
                      </TableCell>
                      <TableCell className="py-5 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm ${company.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-2 ${company.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {company.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                            className="h-9 w-9 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border hover:border-primary-100 rounded-xl transition-all shadow-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-24 text-center bg-secondary-50/20">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-secondary-200/50 flex items-center justify-center text-secondary-300">
                          <Database className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-secondary-900 font-bold text-lg">No Entities Detected</p>
                          <p className="text-secondary-400 text-sm font-medium">We couldn't find any corporate records matching your search criteria.</p>
                        </div>
                        <Button variant="outline" onClick={() => setSearch("")} className="mt-4 font-bold border-secondary-300 rounded-xl px-6">Refresh Entity Ledger</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
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
