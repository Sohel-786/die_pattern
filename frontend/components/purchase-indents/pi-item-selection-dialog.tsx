"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check, Loader2, X, Package } from "lucide-react";
import api from "@/lib/api";
import { ItemWithStatus, ItemProcessState } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ItemProcessState, string> = {
  NotInStock: "Not in stock",
  InPI: "PI Issued",
  InPO: "PO Issued",
  InwardDone: "Inward Done",
  InQC: "In QC",
  InJobwork: "In Job work",
  AtVendor: "At Vendor",
  Outward: "Outward",
  InStock: "In Stock",
};

const STATUS_PILL_CLASS: Record<ItemProcessState, string> = {
  NotInStock: "bg-slate-100 text-slate-700 border-slate-200",
  InPI: "bg-amber-100 text-amber-800 border-amber-200",
  InPO: "bg-indigo-100 text-indigo-800 border-indigo-200",
  InwardDone: "bg-sky-100 text-sky-800 border-sky-200",
  InQC: "bg-violet-100 text-violet-800 border-violet-200",
  InJobwork: "bg-teal-100 text-teal-800 border-teal-200",
  AtVendor: "bg-pink-100 text-pink-800 border-pink-200",
  Outward: "bg-orange-100 text-orange-800 border-orange-200",
  InStock: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

interface PiItemSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItemIds: number[];
  onAddItems: (items: ItemWithStatus[]) => void;
  excludePiId?: number | null;
}

export function PiItemSelectionDialog({
  open,
  onClose,
  selectedItemIds,
  onAddItems,
  excludePiId,
}: PiItemSelectionDialogProps) {
  const [search, setSearch] = useState("");
  const [pendingItemsState, setPendingItemsState] = useState<ItemWithStatus[]>([]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPendingItemsState([]);
    }
  }, [open]);

  const { data: itemsWithStatus = [], isLoading } = useQuery<ItemWithStatus[]>({
    queryKey: ["purchase-indents", "items-with-status", excludePiId ?? "new"],
    queryFn: async () => {
      const params = excludePiId != null ? { excludePiId } : {};
      const res = await api.get("/purchase-indents/items-with-status", { params });
      const data = res.data?.data ?? [];
      if (!Array.isArray(data)) return [];

      // Normalise backend shape (handles PascalCase vs camelCase and missing fields)
      return data.map((raw: any) => ({
        itemId: raw.itemId ?? raw.ItemId ?? 0,
        currentName: raw.currentName ?? raw.CurrentName ?? null,
        mainPartName: raw.mainPartName ?? raw.MainPartName ?? null,
        itemTypeName: raw.itemTypeName ?? raw.ItemTypeName ?? null,
        status: (raw.status ?? raw.Status ?? "NotInStock") as ItemProcessState,
      })) as ItemWithStatus[];
    },
    enabled: open,
  });

  const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const pendingSet = useMemo(() => new Set(pendingItemsState.map(i => i.itemId)), [pendingItemsState]);

  const filtered = useMemo(() => {
    if (!search.trim()) return itemsWithStatus;
    const q = search.trim().toLowerCase();
    return itemsWithStatus.filter(
      (i) =>
        (i.currentName ?? "").toLowerCase().includes(q) ||
        (i.mainPartName ?? "").toLowerCase().includes(q)
    );
  }, [itemsWithStatus, search]);

  // Normalise backend status strings (tolerate null/undefined, spaces, casing) to our enum keys
  const normalizeStatus = (status?: string | null): ItemProcessState | null => {
    if (!status) return null;
    const key = status.replace(/\s+/g, "").toLowerCase();
    switch (key) {
      case "notinstock":
        return "NotInStock";
      case "inpi":
        return "InPI";
      case "inpo":
        return "InPO";
      case "inwarddone":
        return "InwardDone";
      case "inqc":
        return "InQC";
      case "injobwork":
        return "InJobwork";
      case "atvendor":
        return "AtVendor";
      case "outward":
        return "Outward";
      case "instock":
        return "InStock";
      default:
        return null;
    }
  };

  const addableRows = useMemo(
    () =>
      filtered.filter((i) => normalizeStatus(i.status) === "NotInStock" && !selectedSet.has(i.itemId)),
    [filtered, selectedSet]
  );

  const pendingItems = pendingItemsState;

  const addToPending = (item: ItemWithStatus) => {
    const st = normalizeStatus(item.status);
    if (st !== "NotInStock" || selectedSet.has(item.itemId) || pendingSet.has(item.itemId)) return;
    setPendingItemsState((prev) => [...prev, item]);
  };

  const removeFromPending = (itemId: number) => {
    setPendingItemsState((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const clearPending = () => {
    setPendingItemsState([]);
  };

  const commitAddToPI = () => {
    if (pendingItemsState.length === 0) return;
    onAddItems(pendingItemsState);
    setPendingItemsState([]);
    toast.success(`${pendingItemsState.length} item(s) added to PI`);
  };

  const handleDone = () => {
    onClose();
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleDone}
      title="Add items to Purchase Indent"
      size="2xl"
      contentScroll={false}
      className="max-h-[90vh] flex flex-col"
    >
      <div className="flex flex-col flex-1 min-h-0 p-6 gap-4">
        <p className="text-sm text-secondary-600">
          Click an item below to add it to the Purchase Indent. Items marked with a check are already selected.
        </p>

        {/* Selected for PI – pending section */}
        {pendingItems.length > 0 && (
          <div className="rounded-lg border-2 border-primary-200 bg-primary-50/30 overflow-hidden shrink-0">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary-200 bg-primary-100/50">
              <h3 className="text-sm font-bold text-primary-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600" />
                Selected for PI ({pendingItems.length})
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPending}
                className="h-7 px-2 text-xs font-semibold text-primary-700 hover:bg-primary-200/50 hover:text-primary-900"
              >
                Clear all
              </Button>
            </div>
            <div className="max-h-[180px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary-50/50 border-b border-primary-200">
                    <TableHead className="w-10 text-center text-[10px] font-bold uppercase text-primary-800">#</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-primary-800">Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-primary-800">Main Part</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase text-primary-800 w-28">Type</TableHead>
                    <TableHead className="w-14 text-center text-[10px] font-bold uppercase text-primary-800">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item, idx) => (<TableRow
                      key={`pending-${item.itemId}-${idx}`}
                      className="border-b border-primary-100/50 last:border-0 hover:bg-primary-50/50"
                    >
                      <TableCell className="text-center text-secondary-600 font-medium text-sm py-2">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="font-semibold text-secondary-900 text-sm">{item.currentName ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2 text-secondary-600 text-sm">{item.mainPartName ?? "—"}</TableCell>
                      <TableCell className="py-2 text-secondary-600 text-xs">{item.itemTypeName ?? "—"}</TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromPending(item.itemId)}
                          className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-full"
                          title="Remove from selection"
                          aria-label="Remove from selection"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Available items */}
        <div className="flex gap-3">
          <Input
            placeholder="Search by name or main part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm h-9 border-secondary-200"
          />
        </div>
        <div className="flex-1 min-h-0 border border-secondary-200 rounded-lg overflow-hidden bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-secondary-200 bg-secondary-50 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
            Available items — click a row to add to selection
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-auto flex-1 min-h-0" style={{ maxHeight: "42vh" }}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary-50 border-b border-secondary-200 sticky top-0 z-10">
                    <TableHead className="w-12 text-center text-xs font-bold uppercase text-secondary-600">Action</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600">Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600">Main Part</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600 w-28">Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600 w-36">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (<TableRow key="no-items">
                      <TableCell colSpan={5} className="py-12 text-center text-secondary-500">
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item, idx) => {
                      const canonicalStatus = normalizeStatus(item.status);
                      const canAdd = canonicalStatus === "NotInStock" && !selectedSet.has(item.itemId);
                      const alreadyInPI = selectedSet.has(item.itemId);
                      const inPending = pendingSet.has(item.itemId);
                        return (<TableRow
                          key={`available-${item.itemId}-${idx}`}
                          className={cn(
                            "border-b border-secondary-100 transition-colors",
                            !canAdd && "bg-secondary-50/50",
                            canAdd && "hover:bg-primary-50/40 cursor-pointer"
                          )}
                          onClick={() => canAdd && addToPending(item)}
                          role={canAdd ? "button" : undefined}
                          tabIndex={canAdd ? 0 : -1}
                          onKeyDown={(e) => {
                            if (canAdd && (e.key === "Enter" || e.key === " ")) {
                              e.preventDefault();
                              addToPending(item);
                            }
                          }}
                        >
                          <TableCell className="text-center align-middle">
                            {alreadyInPI ? (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                                title="Already in PI"
                              >
                                <Check className="w-4 h-4" />
                              </span>
                            ) : inPending ? (
                              <span
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 border border-primary-200"
                                title="In selection — click Add to PI to confirm"
                              >
                                <Check className="w-4 h-4" />
                              </span>
                            ) : canAdd ? (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 hover:border-primary-500">
                                <Plus className="w-4 h-4" />
                              </span>
                            ) : (
                              <span
                                className="inline-block h-7 w-7 rounded border border-secondary-200 bg-secondary-100"
                                title={canonicalStatus ? STATUS_LABELS[canonicalStatus] : item.status}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-secondary-900 text-sm">{item.currentName ?? "—"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-secondary-600 text-sm">{item.mainPartName ?? "—"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-secondary-600 text-xs">{item.itemTypeName ?? "—"}</span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                canonicalStatus ? STATUS_PILL_CLASS[canonicalStatus] : "bg-secondary-100 text-secondary-700 border-secondary-200"
                              )}
                            >
                              {canonicalStatus ? STATUS_LABELS[canonicalStatus] : item.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-secondary-200 shrink-0">
          <div className="text-sm text-secondary-600">
            {pendingItemsState.length > 0 && (
              <span className="font-medium text-primary-700">{pendingItemsState.length} item(s) in selection</span>
            )}
            {selectedItemIds.length > 0 && (
              <span className="ml-2 text-secondary-500">{selectedItemIds.length} already in PI</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDone} className="font-semibold h-9 px-4">
              Close
            </Button>
            {pendingItemsState.length > 0 && (
              <Button
                type="button"
                onClick={commitAddToPI}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-9 px-6 shadow-sm flex gap-2 items-center"
              >
                <Plus className="w-4 h-4" />
                Add to PI
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
