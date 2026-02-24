"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Trash2, Save, Loader2, Calendar, Upload,
  Plus, ShieldCheck,
} from "lucide-react";
import api from "@/lib/api";
import {
  PO,
  Party,
  GstType,
  PurchaseIndent,
  PurchaseIndentItem,
  PurchaseIndentStatus,
  PurchaseType,
} from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { PiSelectionDialog } from "./pi-selection-dialog";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface POGridItem {
  purchaseIndentItemId: number;
  rate: number;
  gstPercent: number;
  sourcePiId?: number;
  drawingNo?: string;
  revisionNo?: string;
  materialName?: string;
  itemTypeName?: string;
}

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po?: PO | null;
  preSelectedPiItemIds?: number[];
  onPreviewRequest?: (poId: number) => void;
}

export function PurchaseOrderDialog({
  open,
  onOpenChange,
  po,
  preSelectedPiItemIds = [],
  onPreviewRequest,
}: PurchaseOrderDialogProps) {
  const isEditing = !!po?.id;
  const queryClient = useQueryClient();

  const [vendorId, setVendorId] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [gstPercent, setGstPercent] = useState<number>(18);
  const [quotationUrls, setQuotationUrls] = useState<string[]>([]);
  const [items, setItems] = useState<POGridItem[]>([]);
  const [selectedPiIds, setSelectedPiIds] = useState<number[]>([]);
  const [isPiSelectionOpen, setIsPiSelectionOpen] = useState(false);
  const [nextPoCode, setNextPoCode] = useState("");
  const [quotationNo, setQuotationNo] = useState("");
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("Regular");
  const [gstType, setGstType] = useState<GstType | "">("");
  const [uploading, setUploading] = useState(false);
  const [itemsDisplayMap, setItemsDisplayMap] = useState<Record<number, { currentName: string; mainPartName: string; drawingNo?: string; revisionNo?: string; materialName?: string; itemTypeName?: string }>>({});

  const { data: poData, isLoading: loadingPO } = useQuery<PO>({
    queryKey: ["purchase-order", po?.id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${po!.id}`);
      return res.data.data;
    },
    enabled: !!po?.id && open,
  });

  const { data: piItemsAvailable = [] } = useQuery<PurchaseIndentItem[]>({
    queryKey: ["purchase-orders", "approved-items-for-edit", po?.id],
    queryFn: async () => {
      const url = po?.id
        ? `/purchase-orders/approved-items-for-edit?poId=${po.id}`
        : "/purchase-indents/approved-items";
      const res = await api.get(url);
      return res.data.data;
    },
    enabled: open,
  });

  const { data: vendors = [] } = useQuery<Party[]>({
    queryKey: ["parties", "active"],
    queryFn: async () => {
      const res = await api.get("/parties/active");
      return res.data.data;
    },
    enabled: open,
  });

  const { data: allPIs = [] } = useQuery<PurchaseIndent[]>({
    queryKey: ["purchase-indents"],
    queryFn: async () => {
      const res = await api.get("/purchase-indents");
      return res.data.data ?? [];
    },
    enabled: open,
  });

  const approvedPIs = useMemo(
    () => allPIs.filter((p) => p.status === PurchaseIndentStatus.Approved && p.isActive !== false),
    [allPIs]
  );

  // PIs that have at least one item available (not already in another PO)
  const availablePIsForDialog = useMemo(
    () =>
      approvedPIs.filter((pi) =>
        (pi.items || []).some((it) => piItemsAvailable.some((a) => a.id === it.id))
      ),
    [approvedPIs, piItemsAvailable]
  );

  useEffect(() => {
    if (!open) return;
    if (isEditing && poData) {
      setNextPoCode(poData.poNo);
      setVendorId(poData.vendorId);
      setDeliveryDate(poData.deliveryDate ? format(new Date(poData.deliveryDate), "yyyy-MM-dd") : "");
      setRemarks(poData.remarks || "");
      setGstPercent(poData.gstPercent || 18);
      setQuotationUrls(poData.quotationUrls || []);
      setQuotationNo(poData.quotationNo || "");
      setPurchaseType((poData.purchaseType as PurchaseType) || "Regular");
      setGstType(poData.gstType ?? "");

      const mappedItems = poData.items.map((i) => ({
        purchaseIndentItemId: i.purchaseIndentItemId,
        rate: i.rate ?? 0,
        gstPercent: poData.gstPercent || 18,
        sourcePiId: 0,
      }));
      setItems(mappedItems);

      const dMap: Record<number, { currentName: string; mainPartName: string; drawingNo?: string; revisionNo?: string; materialName?: string; itemTypeName?: string }> = {};
      poData.items.forEach((i) => {
        dMap[i.purchaseIndentItemId] = {
          currentName: i.currentName ?? "",
          mainPartName: i.mainPartName ?? "",
          drawingNo: i.drawingNo,
          revisionNo: i.revisionNo,
          materialName: i.materialName,
          itemTypeName: i.itemTypeName,
        };
      });
      setItemsDisplayMap(dMap);
      setSelectedPiIds([]);
    } else {
      setVendorId(0);
      setDeliveryDate("");
      setRemarks("");
      setGstPercent(18);
      setQuotationUrls([]);
      setItems([]);
      setSelectedPiIds([]);
      setItemsDisplayMap({});
      setQuotationNo("");
      setPurchaseType("Regular");
      setGstType("");
      api.get("/purchase-orders/next-code").then((res) => setNextPoCode(res.data?.data ?? "PO-01")).catch(() => setNextPoCode("PO-01"));
    }
  }, [open, poData, isEditing]);

  const preSelectedKey = preSelectedPiItemIds.length > 0 ? preSelectedPiItemIds.join(",") : "";
  useEffect(() => {
    if (!open || isEditing || !preSelectedKey || !piItemsAvailable?.length) return;
    const ids = preSelectedPiItemIds;
    const preselected = piItemsAvailable
      .filter((p) => ids.includes(p.id))
      .map((p) => ({ purchaseIndentItemId: p.id, rate: 0, gstPercent: 18 } as POGridItem));
    if (preselected.length === 0) return;
    setItems((prev) => (prev.length === 0 ? preselected : prev));
    setItemsDisplayMap((prev) => {
      const next = { ...prev };
      piItemsAvailable.filter((p) => ids.includes(p.id)).forEach((p) => {
        next[p.id] = {
          currentName: p.currentName ?? "",
          mainPartName: p.mainPartName ?? "",
          drawingNo: p.drawingNo,
          revisionNo: p.revisionNo,
          materialName: p.materialName,
          itemTypeName: p.itemTypeName,
        };
      });
      return next;
    });
  }, [open, isEditing, preSelectedKey, piItemsAvailable?.length]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/purchase-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      toast.success("PO saved");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Creation failed"),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/purchase-orders/${po!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("PO updated");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed"),
  });

  const mutation = isEditing ? updateMutation : createMutation;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || uploading) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("file", files[i], files[i].name);
        const res = await api.post("/purchase-orders/upload-quotation", form);
        const url = res.data?.data?.url;
        if (url) setQuotationUrls((prev) => [...prev, url]);
      }
      if (files.length > 0) toast.success("File(s) uploaded.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeItem = (purchaseIndentItemId: number) => {
    setItems((prev) => prev.filter((i) => i.purchaseIndentItemId !== purchaseIndentItemId));
  };

  const removePiAndItsItems = (piId: number) => {
    setSelectedPiIds((prev) => prev.filter((id) => id !== piId));
    setItems((prev) => prev.filter((i) => i.sourcePiId !== piId));
  };

  const updateItemRate = (purchaseIndentItemId: number, rate: number) => {
    setItems((prev) => prev.map((i) => (i.purchaseIndentItemId === purchaseIndentItemId ? { ...i, rate } : i)));
  };

  const updateItemGstPercent = (purchaseIndentItemId: number, gstPercent: number) => {
    setItems((prev) => prev.map((i) => (i.purchaseIndentItemId === purchaseIndentItemId ? { ...i, gstPercent } : i)));
  };

  const addItemsFromPi = (pi: PurchaseIndent) => {
    if (selectedPiIds.includes(pi.id)) return;
    const piItemIds = (pi.items || []).map((it) => it.id);
    const existingIds = new Set(items.map((i) => i.purchaseIndentItemId));
    const toAdd = piItemIds.filter((id) => !existingIds.has(id));
    const newItems: POGridItem[] = (pi.items || [])
      .filter((it) => toAdd.includes(it.id))
      .map((it) => ({
        purchaseIndentItemId: it.id,
        rate: 0,
        gstPercent: 18,
        sourcePiId: pi.id,
      }));
    const displayUpdates: Record<number, { currentName: string; mainPartName: string; drawingNo?: string; revisionNo?: string; materialName?: string; itemTypeName?: string }> = {};
    (pi.items || []).forEach((it) => {
      displayUpdates[it.id] = {
        currentName: it.currentName ?? "",
        mainPartName: it.mainPartName ?? "",
        drawingNo: it.drawingNo,
        revisionNo: it.revisionNo,
        materialName: it.materialName,
        itemTypeName: it.itemTypeName,
      };
    });
    setSelectedPiIds((prev) => (prev.includes(pi.id) ? prev : [...prev, pi.id]));
    setItems((prev) => {
      const merged = [...prev];
      newItems.forEach((ni) => {
        if (!merged.some((m) => m.purchaseIndentItemId === ni.purchaseIndentItemId)) merged.push(ni);
      });
      return merged;
    });
    setItemsDisplayMap((prev) => ({ ...prev, ...displayUpdates }));
  };

  const handleSelectPIs = (pis: PurchaseIndent[]) => {
    pis.forEach((pi) => addItemsFromPi(pi));
    setIsPiSelectionOpen(false);
  };

  const totalTaxable = items.reduce((sum, i) => sum + (i.rate ?? 0), 0);
  const totalGst = items.reduce((sum, i) => sum + ((i.rate ?? 0) * (i.gstPercent ?? 0)) / 100, 0);
  const finalAmount = totalTaxable + totalGst;

  const handleSubmit = () => {
    if (!vendorId) {
      toast.error("Please select Party Name");
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one item (use Add PI).");
      return;
    }
    const itemsWithRate = items.filter((i) => (i.rate ?? 0) > 0);
    if (itemsWithRate.length === 0) {
      toast.error("Enter rate for at least one item");
      return;
    }
    const payload = {
      vendorId,
      deliveryDate: deliveryDate || null,
      remarks: remarks || undefined,
      quotationNo: quotationNo || undefined,
      quotationUrls: quotationUrls.length ? quotationUrls : undefined,
      purchaseType,
      gstType: gstType || undefined,
      gstPercent: gstPercent || undefined,
      items: items.map((i) => ({ purchaseIndentItemId: i.purchaseIndentItemId, rate: i.rate ?? 0 })),
    };
    mutation.mutate(payload);
  };

  const selectedVendor = vendors.find((v) => v.id === vendorId);

  const getItemDisplay = (piItemId: number) => {
    const fromMap = itemsDisplayMap[piItemId];
    if (fromMap) return fromMap;
    const piItem = piItemsAvailable.find((p) => p.id === piItemId);
    return piItem
      ? {
          currentName: piItem.currentName ?? "—",
          mainPartName: piItem.mainPartName ?? "—",
          drawingNo: piItem.drawingNo,
          revisionNo: piItem.revisionNo,
          materialName: piItem.materialName,
          itemTypeName: piItem.itemTypeName,
        }
      : { currentName: "—", mainPartName: "—" };
  };

  if (!open) return null;

  return (
    <Dialog
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={isEditing ? "Edit Purchase Order" : "Purchase Order"}
      size="full"
      contentScroll={false}
      className="overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col"
    >
      <div className="flex flex-col h-full min-h-0 bg-[#f8fafc]">
        {loadingPO && isEditing ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 px-6 py-4 gap-4">
              {/* Single block: no section headers */}
              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-secondary-600">PO No.</Label>
                  <Input value={nextPoCode} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm font-semibold" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-secondary-600">PO Date</Label>
                  <Input value={format(new Date(), "dd-MMM-yyyy")} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs font-semibold text-secondary-600">Purchase Type</Label>
                  <select
                    value={purchaseType}
                    onChange={(e) => setPurchaseType(e.target.value as PurchaseType)}
                    className="w-full h-9 mt-0.5 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-900 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="Regular">Regular</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs font-semibold text-secondary-600">Party Name *</Label>
                  <div className="mt-0.5">
                    <SearchableSelect
                      options={vendors.map((v) => ({ label: v.name, value: v.id }))}
                      value={vendorId}
                      onChange={(val) => setVendorId(Number(val))}
                      placeholder="Search parties..."
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs font-semibold text-secondary-600">address</Label>
                  <Input value={selectedVendor?.address || "—"} readOnly className="h-9 mt-0.5 bg-secondary-50 border-secondary-200 text-sm truncate" />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-4">
                  <Label className="text-xs font-semibold text-secondary-600">Quotation Number</Label>
                  <Input
                    placeholder="Supplier quote ref"
                    value={quotationNo}
                    onChange={(e) => setQuotationNo(e.target.value)}
                    className="h-9 mt-0.5 border-secondary-200 text-sm"
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs font-semibold text-secondary-600">Quotation Upload</Label>
                  <div className="mt-0.5 relative flex items-center justify-center h-9 px-4 rounded-lg border-2 border-dashed border-secondary-200 bg-secondary-50/50 hover:bg-white hover:border-primary-400 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-secondary-400 mr-2" />
                    <span className="text-xs font-medium text-secondary-600">
                      {uploading ? "Uploading..." : quotationUrls.length > 0 ? `${quotationUrls.length} file(s)` : "Drag & drop or click"}
                    </span>
                    <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} disabled={uploading} />
                  </div>
                </div>
                <div className="col-span-4 flex items-end gap-2">
                  <Button type="button" onClick={() => setIsPiSelectionOpen(true)} className="h-9 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold gap-2">
                    <Plus className="w-4 h-4" />
                    Add PI
                  </Button>
                  {selectedPiIds.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedPiIds.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-xs font-medium"
                        >
                          PI-{id}
                          <button type="button" onClick={() => removePiAndItsItems(id)} className="hover:text-rose-600">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items table: only this area scrolls */}
              <div className="flex-1 min-h-0 flex flex-col border border-secondary-200 rounded-lg bg-white overflow-hidden">
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-secondary-50 border-b border-secondary-200 z-10">
                      <tr>
                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide">Name</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide w-24">Type</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide">Drawing No. / Rev</th>
                        <th className="text-left py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide">Material</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide w-20">GST %</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide w-28">Unit Rate (₹)</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide w-24">Tax</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-secondary-600 uppercase tracking-wide w-28">Total</th>
                        <th className="w-10 px-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-secondary-500 text-sm">
                            No items. Click &quot;Add PI&quot; to add approved purchase indents.
                          </td>
                        </tr>
                      ) : (
                        items.map((i) => {
                          const display = getItemDisplay(i.purchaseIndentItemId);
                          const tax = ((i.rate ?? 0) * (i.gstPercent ?? 0)) / 100;
                          const total = (i.rate ?? 0) + tax;
                          return (
                            <tr key={i.purchaseIndentItemId} className="hover:bg-primary-50/30 group">
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-secondary-900">{display.currentName}</span>
                                  <span className="text-xs text-secondary-500">{display.mainPartName}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-secondary-700">{display.itemTypeName ?? "—"}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-secondary-800">{display.drawingNo ?? "N/A"}</span>
                                  <span className="text-xs text-secondary-500">R{display.revisionNo ?? "0"}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-secondary-700">{display.materialName ?? "—"}</td>
                              <td className="py-2.5 px-3 text-center">
                                <Input
                                  type="number"
                                  value={i.gstPercent}
                                  onChange={(e) => updateItemGstPercent(i.purchaseIndentItemId, parseFloat(e.target.value) || 0)}
                                  className="h-8 w-16 text-center text-sm border-secondary-200 rounded"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Input
                                  type="number"
                                  value={i.rate || ""}
                                  onChange={(e) => updateItemRate(i.purchaseIndentItemId, parseFloat(e.target.value) || 0)}
                                  className="h-8 w-24 text-right text-sm border-secondary-200 rounded"
                                  placeholder="0"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right text-secondary-600 tabular-nums">₹ {tax.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-secondary-900 tabular-nums">₹ {total.toFixed(2)}</td>
                              <td className="py-2.5 px-2">
                                <button type="button" onClick={() => removeItem(i.purchaseIndentItemId)} className="p-1.5 text-secondary-400 hover:text-rose-600 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <Label className="text-xs font-semibold text-secondary-600">Remarks</Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Optional remarks..."
                    className="mt-0.5 min-h-[72px] text-sm border-secondary-200 rounded-lg resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer: same style as master dialogs */}
            <footer className="shrink-0 border-t border-secondary-200 bg-white px-6 py-4 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <Label className="text-xs font-semibold text-secondary-500 block">Delivery Date</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-9 w-40 mt-0.5 text-sm border-secondary-200"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-secondary-500 block">Total Amount</span>
                  <span className="text-base font-bold text-secondary-900">₹ {totalTaxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-secondary-500 block">Tax Total</span>
                  <span className="text-base font-bold text-secondary-600">₹ {totalGst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-secondary-500 block">Final Amount</span>
                  <span className="text-lg font-bold text-primary-700">₹ {finalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-5 font-semibold">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending || !vendorId || items.length === 0}
                  className="h-9 px-5 bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2"
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Save
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>

      <PiSelectionDialog
        isOpen={isPiSelectionOpen}
        onClose={() => setIsPiSelectionOpen(false)}
        availablePIs={availablePIsForDialog}
        selectedPiIds={selectedPiIds}
        onSelectPIs={handleSelectPIs}
      />
    </Dialog>
  );
}
