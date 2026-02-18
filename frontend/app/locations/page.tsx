"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Location } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Building2, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { LocationDialog } from "@/components/masters/location-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LocationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Location | null>(null);
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return res.data?.data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location added");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to add")
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/locations/${selectedItem?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Location updated");
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const handleEdit = (item: Location) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const filteredLocations = locations.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <MapPin className="w-10 h-10 text-primary-600" />
            Location Master
          </h1>
          <p className="text-gray-500 mt-2 font-semibold text-lg">Manage storage zones and facility locations</p>
        </motion.div>

        <Button
          onClick={handleAdd}
          className="rounded-2xl h-14 px-8 bg-primary-600 hover:bg-primary-700 text-white font-black shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-6 h-6 mr-2" />
          Add New Location
        </Button>
      </div>

      <div className="relative max-w-2xl bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
        <Input
          placeholder="Search by location or company name..."
          className="pl-16 h-14 rounded-2xl border-none bg-secondary-50/50 focus:bg-white transition-all text-base font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-56 rounded-[2.5rem] bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredLocations.map((loc, idx) => (
              <motion.div
                key={loc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="border-none shadow-sm hover:shadow-2xl transition-all group overflow-hidden bg-white rounded-[2.5rem] p-8 relative flex flex-col justify-between h-56 border border-transparent hover:border-primary-100">
                  <div className="absolute top-0 right-0 p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-secondary-50"><MoreVertical className="w-5 h-5 text-gray-400" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-40">
                        <DropdownMenuItem onClick={() => handleEdit(loc)} className="rounded-xl gap-2 cursor-pointer font-bold"><Edit2 className="w-4 h-4 text-primary-600" /> Edit Detail</DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl gap-2 cursor-pointer font-bold text-rose-600"><Trash2 className="w-4 h-4" /> Deactivate</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-secondary-50 rounded-xl flex items-center justify-center text-primary-600 border border-gray-100 group-hover:bg-primary-50 transition-colors">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 leading-tight truncate pr-6">{loc.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 font-bold px-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="text-xs uppercase tracking-tight truncate">{loc.company?.name || 'GENERIC'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${loc.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                      {loc.isActive ? 'Storage Ready' : 'Decommissioned'}
                    </span>
                    <p className="text-[10px] font-black text-gray-100 uppercase">#{loc.id.toString().padStart(3, '0')}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <LocationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        item={selectedItem}
        onSubmit={(data) => selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data)}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
