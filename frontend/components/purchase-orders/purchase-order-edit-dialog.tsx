"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Trash2, Package, Plus } from "lucide-react";
import api from "@/lib/api";
import { PO, Party, PurchaseIndentItem, GstType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "react-hot-toast";

interface PurchaseOrderEditDialogProps {
  poId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function PurchaseOrderEditDialog({ poId, onClose, onSaved }: PurchaseOrderEditDialogProps) {
  const queryClient = useQueryClient();
  const [vendorId, setVendorId] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [gstType, setGstType] = useState<GstType | "">("");
  const [gstPercent, setGstPercent] = useState<number>(18);
  const [quotationUrls, setQuotationUrls] = useState<string[]>([]);
  const [selectedPiItemIds, setSelectedPiItemIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: po, isLoading: loadingPO } = useQuery<PO>({
    queryKey: ["purchase-order", poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}`);
      return res.data.data;
    },
    enabled: !!poId,
  });

  const { data: piItemsForEdit = [] } = useQuery<PurchaseIndentItem[]>({
    queryKey: ["purchase-orders", "approved-items-for-edit", poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/approved-items-for-edit?poId=${poId}`);
      return res.data.data;
    },
    enabled: !!poId,
  });

  const { data: vendors = [] } = useQuery<Party[]>({
    queryKey: ["parties", "active"],
    queryFn: async () => {
      const res = await api.get("/parties/active");
      return res.data.data;
    },
    enabled: !!poId,
  });

  useEffect(() => {
    if (po) {
      setVendorId(po.vendorId);
      setRate(po.rate ?? 0);
      setDeliveryDate(po.deliveryDate ? po.deliveryDate.slice(0, 10) : "");
      setRemarks(po.remarks ?? "");
      setGstType((po.gstType as GstType) ?? "");
      setGstPercent(po.gstPercent ?? 18);
      setQuotationUrls(po.quotationUrls ?? []);
      setSelectedPiItemIds(po.items?.map((i) => i.purchaseIndentItemId) ?? []);
    }
  }, [po]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/purchase-orders/${poId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast.success("PO updated successfully");
      onSaved();
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? "Update failed"),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("file", files[i]);
        const res = await api.post("/purchase-orders/upload-quotation", form, { headers: { "Content-Type": "multipart/form-data" } });
        const url = res.data?.data?.url;
        if (url) setQuotationUrls((prev) => [...prev, url]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeQuotation = (index: number) => setQuotationUrls((prev) => prev.filter((_, i) => i !== index));
  const toggleItem = (id: number) => setSelectedPiItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = () => {
    if (!vendorId) {
      toast.error("Select a vendor");
      return;
    }
    if (selectedPiItemIds.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    updateMutation.mutate({
      vendorId,
      rate: rate || undefined,
      deliveryDate: deliveryDate || undefined,
      remarks: remarks || undefined,
      quotationUrls: quotationUrls.length ? quotationUrls : undefined,
      gstType: gstType || undefined,
      gstPercent: gstPercent ?? undefined,
      purchaseIndentItemIds: selectedPiItemIds,
    });
  };

  const filteredAvailable = piItemsForEdit.filter(
    (i) =>
      !selectedPiItemIds.includes(i.id) &&
      (i.currentName?.toLowerCase().includes(searchTerm.toLowerCase()) || i.mainPartName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const selectedItems = piItemsForEdit.filter((i) => selectedPiItemIds.includes(i.id));

  if (!poId) return null;

  return (
    <Dialog isOpen={true} onClose={onClose} title={`Edit PO`} size="2xl" contentScroll>
      {loadingPO ? (
        <div className="py-12 text-center text-secondary-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-secondary-500 uppercase">Vendor</Label>
              <SearchableSelect
                options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                value={vendorId || ""}
                onChange={(val) => setVendorId(Number(val))}
                placeholder="Select vendor..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-secondary-500 uppercase">Rate (₹)</Label>
              <Input type="number" value={rate || ""} onChange={(e) => setRate(Number(e.target.value))} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-secondary-500 uppercase">Delivery date</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-secondary-500 uppercase">GST type</Label>
              <select className="w-full h-10 px-3 rounded-md border border-secondary-200 bg-white text-sm" value={gstType} onChange={(e) => setGstType((e.target.value as GstType) || "")}>
                <option value="">—</option>
                <option value={GstType.CGST_SGST}>CGST + SGST</option>
                <option value={GstType.IGST}>IGST</option>
                <option value={GstType.UGST}>UGST</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-secondary-500 uppercase">GST %</Label>
              <Input type="number" min={0} step={0.01} value={gstPercent} onChange={(e) => setGstPercent(Number(e.target.value) || 0)} className="h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase">Quotation attachments</Label>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-secondary-200 bg-white hover:bg-secondary-50 text-sm font-medium">
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Add file(s)"}
                <input type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" multiple onChange={handleFileSelect} disabled={uploading} />
              </label>
              {quotationUrls.map((url, i) => (
                <span key={i} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 bg-secondary-100 rounded text-xs font-medium">
                  {url.split("/").pop()?.slice(0, 20)}…
                  <button type="button" onClick={() => removeQuotation(i)} className="p-0.5 hover:bg-secondary-200 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase">Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[80px]" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-secondary-500 uppercase">Items ({selectedPiItemIds.length})</Label>
            <Input placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="mb-2 h-10" />
            <div className="max-h-48 overflow-y-auto border border-secondary-200 rounded-lg p-2 space-y-1">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-secondary-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary-500" />
                    <span className="font-medium text-sm">{item.currentName}</span>
                    <span className="text-xs text-secondary-500">{item.mainPartName}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500" onClick={() => toggleItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {filteredAvailable.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 px-3 hover:bg-secondary-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-secondary-400" />
                    <span className="text-sm">{item.currentName}</span>
                    <span className="text-xs text-secondary-500">{item.mainPartName}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary-600" onClick={() => toggleItem(item.id)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={handleSave} disabled={updateMutation.isPending || selectedPiItemIds.length === 0} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white">
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
