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
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <Building2 className="w-10 h-10 text-primary-600" />
            Company Registry
          </h1>
          <p className="text-gray-500 mt-2 font-semibold">Manage global company entities within the system</p>
        </motion.div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            className="rounded-2xl h-14 px-6 border-2 border-gray-100 font-bold hover:bg-secondary-50 shadow-sm"
          >
            <Download className="w-5 h-5 mr-3 text-primary-600" />
            Export
          </Button>
          <Button
            onClick={handleAdd}
            className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
          >
            <Plus className="w-6 h-6 mr-2" />
            Register Company
          </Button>
        </div>
      </div>

      <div className="relative max-w-2xl bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        <Input
          placeholder="Search by company name..."
          className="pl-16 h-14 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-[2.5rem] bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredCompanies.map((company, idx) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-none shadow-sm hover:shadow-2xl transition-all group overflow-hidden bg-white rounded-[2.5rem] p-8 relative h-full flex flex-col justify-between border border-transparent hover:border-primary-100">
                  <div className="absolute top-0 right-0 p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary-50"><MoreVertical className="w-5 h-5 text-gray-400" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-40">
                        <DropdownMenuItem onClick={() => handleEdit(company)} className="rounded-xl gap-2 cursor-pointer font-bold"><Edit2 className="w-4 h-4 text-primary-600" /> Edit Detail</DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl gap-2 cursor-pointer font-bold text-rose-600"><Trash2 className="w-4 h-4" /> Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div>
                    <div className="h-16 w-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-2xl mb-6 shadow-inner border border-primary-100">
                      {company.name.charAt(0)}
                    </div>
                    <h3 className="text-xl font-black text-gray-900 leading-tight pr-6">{company.name}</h3>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-gray-50 pt-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${company.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                      {company.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <p className="text-[10px] font-black text-gray-300 uppercase">SYS-ID: {company.id.toString().padStart(3, '0')}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

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
