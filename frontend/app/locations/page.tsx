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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
            Location Master
          </h1>
          <p className="text-secondary-600">
            Manage storage zones and facility locations
          </p>
        </motion.div>

        <Button
          onClick={handleAdd}
          size="sm"
          className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      <Card className="shadow-sm">
        <div className="p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <Input
              placeholder="Search by location or company..."
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
            All Locations ({filteredLocations.length})
          </h3>
        </div>
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : filteredLocations.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-secondary-200 m-6 mt-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200 bg-primary-50">
                    <th className="px-4 py-3 font-semibold text-primary-900 w-16">Sr.No</th>
                    <th className="px-4 py-3 font-semibold text-primary-900">Location Name</th>
                    <th className="px-4 py-3 font-semibold text-primary-900">Company</th>
                    <th className="px-4 py-3 font-semibold text-primary-900">Status</th>
                    <th className="px-4 py-3 font-semibold text-primary-900 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredLocations.map((loc, idx) => (
                      <motion.tr
                        key={loc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-secondary-100 hover:bg-primary-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-secondary-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-secondary-900">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-500" />
                            {loc.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-secondary-600">{loc.company?.name || 'GENERIC'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${loc.isActive
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                            }`}>
                            {loc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(loc)}
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
              <p className="text-secondary-500 text-lg">No locations found.</p>
            </div>
          )}
        </div>
      </Card>

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
