"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import {
  Issue,
  Item,
  Company,
  Location,
  Role,
  ItemStatus,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Edit2,
  Ban,
  CheckCircle,
  LogIn,
  Image as ImageIcon,
  Camera,
  Upload,
  Trash2,
  ZoomIn,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  CameraPhotoInput,
  CameraPhotoInputRef,
} from "@/components/ui/camera-photo-input";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { formatDate } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import {
  TransactionFilters,
  defaultFilters,
  type TransactionFiltersState,
} from "@/components/filters/transaction-filters";
import { buildFilterParams, hasActiveFilters } from "@/lib/filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ItemSelectionDialog } from "@/components/dialogs/item-selection-dialog";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const issueSchema = z.object({
  itemId: z.number().min(1, "Item is required"),
  companyId: z.number().min(1, "Company is required"),
  locationId: z.number().min(1, "Location is required"),
  issuedTo: z.string().min(1, "Operator name is required"),
  remarks: z.string().optional(),
});

type IssueForm = z.infer<typeof issueSchema>;

export default function IssuesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Issue | null>(null);
  const [nextIssueCode, setNextIssueCode] = useState<string>("");
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<"reference" | "live">("live");
  const cameraInputRef = useRef<CameraPhotoInputRef>(null);

  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: currentUser } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();
  const canAddOutward = permissions?.createMovement ?? false;
  const canEditOutward = permissions?.createMovement ?? false;
  const isAdmin = currentUser?.role === Role.QC_ADMIN;
  const isViewOnly = !!editingIssue?.isReturned;

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const filtersForApi = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const filterKey = useMemo(() => JSON.stringify(filtersForApi), [filtersForApi]);

  const { data: issues = [], isFetching: issuesLoading } = useQuery<Issue[]>({
    queryKey: ["issues", filterKey],
    queryFn: async () => {
      const res = await api.get("/issues", {
        params: {
          ...buildFilterParams(filtersForApi),
          onlyPendingInward: "true",
        },
      });
      return res.data?.data ?? [];
    },
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["companies", "active"],
    queryFn: async () => {
      const res = await api.get("/companies/active");
      return res.data?.data ?? [];
    },
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await api.get("/locations/active");
      return res.data?.data ?? [];
    },
  });

  const { data: availableItems = [], isLoading: itemsLoading } = useQuery<Item[]>({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data?.data ?? [];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
  });

  const watchedCompanyId = watch("companyId");
  const watchedLocationId = watch("locationId");
  const watchedIssuedTo = watch("issuedTo");
  const selectedItemId = watch("itemId");

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return availableItems.find((i) => i.id === selectedItemId) ?? null;
  }, [selectedItemId, availableItems]);

  const createMutation = useMutation({
    mutationFn: async (data: IssueForm) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (imageFile) {
        formData.append("Image", imageFile);
      }

      const res = await api.post("/issues", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      handleCloseForm();
      toast.success("Outward entry created");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to create outward entry.")
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<IssueForm> }) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      if (imageFile) {
        formData.append("Image", imageFile);
      }

      const res = await api.put(`/issues/${id}`, formData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      handleCloseForm();
      toast.success("Outward entry updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update outward entry.")
  });

  const setInactiveMutation = useMutation({
    mutationFn: async (id: number) => api.patch(`/issues/${id}/inactive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      setInactiveTarget(null);
      toast.success("Outward marked inactive");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update.")
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: number) => api.patch(`/issues/${id}/active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      toast.success("Outward marked active");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update.")
  });

  const handleOpenForm = async () => {
    setEditingIssue(null);
    reset();
    try {
      const res = await api.get("/issues/next-code");
      setNextIssueCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextIssueCode("");
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (issue: Issue) => {
    setEditingIssue(issue);
    setNextIssueCode("");
    reset();
    setValue("itemId", issue.itemId);
    setValue("companyId", (issue as any).companyId ?? 0);
    setValue("locationId", issue.locationId ?? 0);
    setValue("issuedTo", issue.issuedTo ?? "");
    setValue("remarks", issue.remarks ?? "");

    if (issue.issueImage) {
      const src = issue.issueImage.startsWith("/")
        ? `${API_BASE}${issue.issueImage}`
        : `${API_BASE}/storage/${issue.issueImage}`;
      setImagePreview(src);
    } else {
      setImagePreview(null);
    }

    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingIssue(null);
    reset();
    setNextIssueCode("");
    setIsItemDialogOpen(false);
    setImageFile(null);
    setImagePreview(null);
    setActiveImageTab("live");
    createMutation.reset();
    updateMutation.reset();
  };

  const handleImageCapture = (file: File | null) => {
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const onSubmit = (data: IssueForm) => {
    if (!editingIssue && !imageFile) {
      toast.error("Please capture or upload an outward photo.");
      return;
    }

    if (editingIssue) {
      if (editingIssue.isReturned) return;
      updateMutation.mutate({
        id: editingIssue.id,
        data: {
          itemId: data.itemId,
          companyId: data.companyId,
          locationId: data.locationId,
          issuedTo: data.issuedTo,
          remarks: data.remarks,
        },
      });
    } else {
      createMutation.mutate({
        ...data,
        itemId: Number(data.itemId),
      });
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    setInactiveMutation.mutate(inactiveTarget.id);
  };

  const filterOptions = useMemo(() => ({
    company: companies.map((c) => ({ value: c.id, label: c.name })),
    location: (filters.companyIds.length > 0 ? locations.filter(l => filters.companyIds.includes(l.companyId)) : locations).map(l => ({ value: l.id, label: l.name })),
    item: availableItems.map(i => ({ value: i.id, label: (i as any).serialNumber ? `${i.currentName} (${(i as any).serialNumber})` : i.currentName })),
  }), [companies, locations, availableItems, filters.companyIds]);

  const companySelectOptions = useMemo(() => companies.map(c => ({ value: c.id, label: c.name })), [companies]);
  const locationSelectOptions = useMemo(() => {
    if (!watchedCompanyId) return [];
    return locations.filter(l => l.companyId === watchedCompanyId).map(l => ({ value: l.id, label: l.name }));
  }, [locations, watchedCompanyId]);
  const itemSelectOptions = useMemo(() => availableItems.map(item => ({
    value: item.id,
    label: `${item.currentName}${(item as any).serialNumber ? ` (${(item as any).serialNumber})` : ""}${item.statusName && item.statusName !== "AVAILABLE" && item.statusName !== "Available" ? ` — ${item.statusName}` : ""}`,
    disabled: item.statusName !== "AVAILABLE" && item.statusName !== "Available",
  })), [availableItems]);

  const goToInward = (issue: Issue) => router.push(`/returns?issueId=${issue.id}`);

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Outward</h1>
              <p className="text-secondary-600">Create and manage outward entries</p>
            </div>
            {canAddOutward && (
              <Button onClick={handleOpenForm} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Outward Entry
              </Button>
            )}
          </div>

          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            companyOptions={filterOptions.company}
            locationOptions={filterOptions.location}
            itemOptions={filterOptions.item}
            onClear={() => setFilters(defaultFilters)}
            searchPlaceholder="Search entries..."
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Outward Entries ({issues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {issuesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : issues.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100/50">
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[110px]">Outward No</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[120px]">Date</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[140px]">Item</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[120px]">Location</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[100px]">Operator</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[90px]">Status</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[100px]">Image</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center min-w-[150px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue: any, idx) => (
                        <motion.tr key={issue.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-secondary-100 hover:bg-primary-50">
                          <td className="px-4 py-3 font-mono text-center">{issue.issueNo}</td>
                          <td className="px-4 py-3 text-center">{formatDate(issue.issuedAt)}</td>
                          <td className="px-4 py-3 font-medium text-center">{issue.item?.currentName ?? "—"}</td>
                          <td className="px-4 py-3 text-center">{issue.location?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-center">{issue.issuedTo ?? "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${issue.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {issue.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {issue.issueImage && (
                              <img
                                src={issue.issueImage.startsWith("/") ? `${API_BASE}${issue.issueImage}` : `${API_BASE}/storage/${issue.issueImage}`}
                                className="w-10 h-10 object-cover rounded mx-auto cursor-pointer"
                                onClick={() => setFullScreenImageSrc(issue.issueImage.startsWith("/") ? `${API_BASE}${issue.issueImage}` : `${API_BASE}/storage/${issue.issueImage}`)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!issue.isReturned && (
                                <Button variant="outline" size="sm" onClick={() => goToInward(issue)} className="text-primary-600 h-8">
                                  Inward
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(issue)} className="h-8">
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                issue.isActive && !issue.isReturned ? (
                                  <Button variant="ghost" size="sm" onClick={() => setInactiveTarget(issue)} className="text-amber-600 h-8">
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  !issue.isActive && (
                                    <Button variant="ghost" size="sm" onClick={() => setActiveMutation.mutate(issue.id)} className="text-green-600 h-8">
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  )
                                )
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-secondary-500">No outward entries found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <Dialog isOpen={isFormOpen} onClose={handleCloseForm} title={editingIssue ? (editingIssue.isReturned ? "View Outward" : "Edit Outward") : "Outward Entry"} size="3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Outward No</Label>
                <Input value={editingIssue ? editingIssue.issueNo : nextIssueCode || "Generating..."} disabled readOnly className="bg-secondary-50" />
              </div>
              <div>
                <Label>Company *</Label>
                <SearchableSelect options={companySelectOptions} value={watchedCompanyId ?? ""} onChange={v => { setValue("companyId", Number(v)); setValue("locationId", 0); }} disabled={isViewOnly} placeholder="Select company" />
              </div>
              <div>
                <Label>Location *</Label>
                <SearchableSelect options={locationSelectOptions} value={watchedLocationId ?? ""} onChange={v => setValue("locationId", Number(v))} disabled={isViewOnly || !watchedCompanyId} placeholder="Select location" />
              </div>
              <div>
                <Label>Item *</Label>
                <div className="flex gap-2">
                  <Input value={selectedItem ? `${selectedItem.currentName} (${(selectedItem as any).serialNumber || "No Serial"})` : "No item selected"} disabled className="bg-secondary-50 flex-1" />
                  {!isViewOnly && (
                    <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(true)} className="shrink-0">
                      Select
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label>Operator Name *</Label>
                <Input {...register("issuedTo")} disabled={isViewOnly} placeholder="Enter operator name" />
                {errors.issuedTo && <p className="text-xs text-red-500 mt-1">{errors.issuedTo.message}</p>}
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea {...register("remarks")} disabled={isViewOnly} placeholder="Enter remarks..." rows={3} />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Photo Entry *</Label>
              {!isViewOnly ? (
                <div className="space-y-4">
                  <CameraPhotoInput ref={cameraInputRef} onCapture={handleImageCapture} previewUrl={imagePreview} className="w-full aspect-video rounded-xl border-2 border-dashed border-secondary-200" />
                  {imagePreview && (
                    <div className="relative rounded-xl overflow-hidden border border-secondary-200">
                      <img src={imagePreview} className="w-full h-auto" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                imagePreview && <img src={imagePreview} className="w-full rounded-xl border border-secondary-200" />
              )}
            </div>
          </div>

          {!isViewOnly && (
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingIssue ? "Update Outward" : "Confirm Outward"}
              </Button>
            </div>
          )}
        </form>
      </Dialog>

      <ItemSelectionDialog
        isOpen={isItemDialogOpen}
        onClose={() => setIsItemDialogOpen(false)}
        onSelectItem={(item) => { setValue("itemId", item.id); setIsItemDialogOpen(false); }}
        items={availableItems}
      />

      <Dialog isOpen={!!inactiveTarget} onClose={() => setInactiveTarget(null)} title="Mark outward inactive?" size="sm">
        <div className="space-y-4">
          <p className="text-secondary-600">This action will mark the outward entry as inactive.</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setInactiveTarget(null)} className="flex-1">Cancel</Button>
            <Button variant="destructive" onClick={handleMarkInactiveConfirm} className="flex-1">Confirm</Button>
          </div>
        </div>
      </Dialog>

      {fullScreenImageSrc && <FullScreenImageViewer isOpen={!!fullScreenImageSrc} imageSrc={fullScreenImageSrc} onClose={() => setFullScreenImageSrc(null)} />}
    </div>
  );
}
