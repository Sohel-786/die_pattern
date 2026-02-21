"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { Return, Issue, Item, Role, Status, RETURN_CONDITIONS } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit2, Ban, CheckCircle, Trash2, Camera } from "lucide-react";
import { CameraPhotoInput } from "@/components/ui/camera-photo-input";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { toast } from "react-hot-toast";
import {
  TransactionFilters,
  defaultFilters,
  type TransactionFiltersState,
} from "@/components/filters/transaction-filters";
import { buildFilterParams } from "@/lib/filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const returnSchema = z.object({
  entryMode: z.enum(["from_outward", "missing_item"]),
  issueId: z.number().optional(),
  itemId: z.number().optional(),
  condition: z.enum(["OK", "Damaged", "Calibration Required", "Missing"]),
  statusId: z.number().optional(),
  remarks: z.string().optional(),
  receivedBy: z.string().optional(),
  companyId: z.number().optional(),
  locationId: z.number().optional(),
}).refine(data => (data.entryMode === "from_outward" ? (data.issueId ?? 0) >= 1 : (data.itemId ?? 0) >= 1), {
  message: "Selection required based on mode",
  path: ["issueId"]
});

type ReturnForm = z.infer<typeof returnSchema>;

export default function ReturnsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Return | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<Return | null>(null);
  const [nextInwardCode, setNextInwardCode] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullScreenImageSrc, setFullScreenImageSrc] = useState<string | null>(null);
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);

  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const prefillIssueId = searchParams.get("issueId");
  const { user: currentUser } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();
  const canAddInward = permissions?.createMovement ?? false;
  const canEditInward = permissions?.createMovement ?? false;
  const isAdmin = currentUser?.role === Role.QC_ADMIN;

  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const filtersForApi = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const filterKey = useMemo(() => JSON.stringify(filtersForApi), [filtersForApi]);

  const { data: returns = [], isFetching: returnsLoading } = useQuery<Return[]>({
    queryKey: ["returns", filterKey],
    queryFn: async () => {
      const res = await api.get("/returns", { params: { ...buildFilterParams(filtersForApi) } });
      return res.data?.data ?? [];
    },
  });

  const { data: activeIssues = [] } = useQuery<Issue[]>({
    queryKey: ["active-issues"],
    queryFn: async () => {
      const res = await api.get("/issues/active");
      return res.data?.data ?? [];
    },
  });

  const { data: missingItems = [] } = useQuery<Item[]>({
    queryKey: ["items", "missing"],
    queryFn: async () => {
      const res = await api.get("/items/missing");
      return res.data?.data ?? [];
    },
    enabled: isFormOpen && !editingReturn,
  });

  const { data: filterCompanies = [] } = useQuery({
    queryKey: ["companies", "active"],
    queryFn: async () => {
      const res = await api.get("/companies/active");
      return res.data?.data ?? [];
    },
  });

  const { data: filterLocations = [] } = useQuery({
    queryKey: ["locations", "active"],
    queryFn: async () => {
      const res = await api.get("/locations/active");
      return res.data?.data ?? [];
    },
  });

  const { data: filterItems = [] } = useQuery({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data?.data ?? [];
    },
  });

  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ["statuses", "active"],
    queryFn: async () => {
      const res = await api.get("/statuses/active");
      return res.data?.data ?? [];
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ReturnForm>({
    resolver: zodResolver(returnSchema),
    defaultValues: { entryMode: "from_outward", condition: "OK" }
  });

  const entryMode = watch("entryMode");
  const selectedIssueId = watch("issueId");
  const watchedCompanyId = watch("companyId");

  const outwardOptions = useMemo(() => activeIssues.map(i => ({ value: i.id, label: i.issueNo || `Issue #${i.id}` })), [activeIssues]);
  const missingItemOptions = useMemo(() => missingItems.map(i => ({ value: i.id, label: i.serialNumber ? `${i.itemName} (${i.serialNumber})` : i.itemName })), [missingItems]);
  const locationFormOptions = useMemo(() => {
    if (!watchedCompanyId) return [];
    return filterLocations.filter(l => l.companyId === watchedCompanyId).map(l => ({ value: l.id, label: l.name }));
  }, [filterLocations, watchedCompanyId]);

  const filterOptions = useMemo(() => ({
    company: filterCompanies.map((c: any) => ({ value: c.id, label: c.name })),
    location: filterLocations.map((l: any) => ({ value: l.id, label: l.name })),
    item: filterItems.map((i: any) => ({ value: i.id, label: i.serialNumber ? `${i.itemName} (${i.serialNumber})` : i.itemName })),
    condition: RETURN_CONDITIONS.map(c => ({ value: c, label: c })),
  }), [filterCompanies, filterLocations, filterItems]);

  const createMutation = useMutation({
    mutationFn: async (fd: FormData) => api.post("/returns", fd, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      handleCloseForm();
      toast.success("Inward entry recorded");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to record inward.")
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => api.patch(`/returns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      handleCloseForm();
      toast.success("Inward entry updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed to update.")
  });

  const handleOpenForm = async (presetIssueId?: number) => {
    reset({ entryMode: "from_outward", issueId: presetIssueId ?? 0, condition: "OK" });
    setImageFile(null);
    setImagePreview(null);
    try {
      const res = await api.get("/returns/next-code");
      setNextInwardCode(res.data?.data?.nextCode ?? "");
    } catch {
      setNextInwardCode("");
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingReturn(null);
    reset();
    setImageFile(null);
    setImagePreview(null);
    createMutation.reset();
  };

  const handleImageCapture = (file: File | null) => {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const onSubmit = (data: ReturnForm) => {
    if (data.condition !== "Missing" && !imageFile && !editingReturn) {
      toast.error("Photo is required for inward entry.");
      return;
    }
    if (editingReturn) {
      updateMutation.mutate({ id: editingReturn.id, data });
    } else {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => { if (v) fd.append(k, String(v)); });
      if (imageFile) fd.append("image", imageFile);
      createMutation.mutate(fd);
    }
  };

  const handleMarkInactiveConfirm = () => {
    if (!inactiveTarget) return;
    api.patch(`/returns/${inactiveTarget.id}/inactive`).then(() => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      setInactiveTarget(null);
      toast.success("Inward marked inactive");
    });
  };

  return (
    <div className="p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Inward</h1>
              <p className="text-secondary-600">Record and manage inward asset returns</p>
            </div>
            {canAddInward && (
              <Button onClick={() => handleOpenForm()} className="shadow-md">
                <Plus className="w-4 h-4 mr-2" /> Inward Entry
              </Button>
            )}
          </div>

          <TransactionFilters
            filters={filters}
            onFiltersChange={setFilters}
            companyOptions={filterOptions.company}
            locationOptions={filterOptions.location}
            itemOptions={filterOptions.item}
            showConditionFilter={true}
            conditionOptions={filterOptions.condition}
            showReceivedByFilter={true}
            onClear={() => setFilters(defaultFilters)}
            searchPlaceholder="Search entries..."
          />

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Inward Entries ({returns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {returnsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : returns.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100/50">
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Inward No</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Date</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Source</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Item</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Condition</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Location</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Image</th>
                        <th className="px-4 py-3 font-semibold text-primary-900 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((r: any) => (
                        <tr key={r.id} className="border-b border-secondary-100 hover:bg-primary-50">
                          <td className="px-4 py-3 text-center">{r.returnCode}</td>
                          <td className="px-4 py-3 text-center">{formatDateTime(r.returnedAt)}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.issue?.issueNo ?? "Missing"}</td>
                          <td className="px-4 py-3 text-center font-medium">{r.issue?.item?.itemName ?? r.item?.itemName}</td>
                          <td className="px-4 py-3 text-center">{r.condition}</td>
                          <td className="px-4 py-3 text-center">{r.issue?.location?.name ?? r.location?.name}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs ${r.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {r.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.returnImage && (
                              <img
                                src={r.returnImage.startsWith("/") ? `${API_BASE}${r.returnImage}` : `${API_BASE}/storage/${r.returnImage}`}
                                className="w-10 h-10 object-cover rounded mx-auto cursor-pointer"
                                onClick={() => setFullScreenImageSrc(r.returnImage.startsWith("/") ? `${API_BASE}${r.returnImage}` : `${API_BASE}/storage/${r.returnImage}`)}
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                              {isAdmin && r.isActive && <Button variant="ghost" size="sm" onClick={() => setInactiveTarget(r)} className="text-amber-600"><Ban className="w-4 h-4" /></Button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-secondary-500">No inward records found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <Dialog isOpen={isFormOpen} onClose={handleCloseForm} title={editingReturn ? "Edit Inward" : "Inward Entry"} size="3xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Entry Mode</Label>
                <select {...register("entryMode")} className="w-full h-10 rounded-lg border border-secondary-200 px-3 bg-white" disabled={!!editingReturn}>
                  <option value="from_outward">From Outward</option>
                  <option value="missing_item">Missing Item Recovery</option>
                </select>
              </div>
              {entryMode === "from_outward" ? (
                <div>
                  <Label>Outward (Issue) *</Label>
                  <SearchableSelect options={outwardOptions} value={selectedIssueId ?? ""} onChange={v => setValue("issueId", Number(v))} disabled={!!editingReturn} />
                </div>
              ) : (
                <>
                  <div>
                    <Label>Company *</Label>
                    <SearchableSelect options={filterOptions.company} value={watchedCompanyId ?? ""} onChange={v => { setValue("companyId", Number(v)); setValue("locationId", 0); }} />
                  </div>
                  <div>
                    <Label>Location *</Label>
                    <SearchableSelect options={locationFormOptions} value={watch("locationId") ?? ""} onChange={v => setValue("locationId", Number(v))} disabled={!watchedCompanyId} />
                  </div>
                  <div>
                    <Label>Missing Item *</Label>
                    <SearchableSelect options={missingItemOptions} value={watch("itemId") ?? ""} onChange={v => setValue("itemId", Number(v))} />
                  </div>
                </>
              )}
              <div>
                <Label>Condition *</Label>
                <select {...register("condition")} className="w-full h-10 rounded-lg border border-secondary-200 px-3 bg-white">
                  {RETURN_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Received By</Label>
                <Input {...register("receivedBy")} placeholder="Enter receiver name" />
              </div>
              <div>
                <Label>Remarks</Label>
                <Textarea {...register("remarks")} placeholder="Enter remarks..." />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Inward Photo *</Label>
              {!editingReturn ? (
                <div className="space-y-4">
                  <CameraPhotoInput onCapture={handleImageCapture} className="w-full aspect-video rounded-xl border-2 border-dashed border-secondary-200" />
                  {imagePreview && (
                    <div className="relative rounded-xl overflow-hidden border">
                      <img src={imagePreview} className="w-full" />
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => { setImageFile(null); setImagePreview(null); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              ) : (
                editingReturn.returnImage && <img src={editingReturn.returnImage.startsWith("/") ? `${API_BASE}${editingReturn.returnImage}` : `${API_BASE}/storage/${editingReturn.returnImage}`} className="w-full rounded-xl" />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>{editingReturn ? "Update" : "Confirm Inward"}</Button>
          </div>
        </form>
      </Dialog>

      {fullScreenImageSrc && <FullScreenImageViewer src={fullScreenImageSrc} onClose={() => setFullScreenImageSrc(null)} />}
    </div>
  );
}
