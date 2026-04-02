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

// Note: This dialog now shows only "Not In Stock" items, so no status column/pills are required.

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

  // Normalise backend status strings (tolerate null/undefined, spaces, casing) to our enum keys
  function normalizeStatus(status?: string | null): ItemProcessState | null {
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
  }

  const filtered = useMemo(() => {
    const base = itemsWithStatus.filter((i) => normalizeStatus(i.status) === "NotInStock");
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (i) =>
        (i.currentName ?? "").toLowerCase().includes(q) ||
        (i.mainPartName ?? "").toLowerCase().includes(q)
    );
  }, [itemsWithStatus, search]);

  const addableRows = useMemo(
    () => filtered.filter((i) => !selectedSet.has(i.itemId)),
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
      <div className="flex flex-col flex-1 min-h-0 px-6 py-4 gap-4 bg-white dark:bg-background">
        <p className="text-[11px] font-bold text-secondary-500 dark:text-secondary-400 uppercase tracking-widest leading-relaxed">
          Click an item below to add it to the Purchase Indent. Only items that are Not In Stock are shown.
        </p>

        {/* Selected for PI – pending section */}
        {pendingItems.length > 0 && (
          <div className="rounded-xl border-2 border-primary-200 dark:border-primary-900 bg-primary-50/30 dark:bg-primary-950/20 overflow-hidden shrink-0 shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary-200 dark:border-primary-900 bg-primary-100/50 dark:bg-primary-900/30">
              <h3 className="text-[11px] font-black text-primary-900 dark:text-primary-300 uppercase tracking-widest flex items-center gap-2">
                <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Selected for PI ({pendingItems.length})
              </h3>
                <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPending}
                className="h-7 px-3 text-[10px] font-black uppercase tracking-widest text-primary-700 dark:text-primary-400 hover:bg-primary-200/50 dark:hover:bg-primary-800/50 hover:text-primary-900 dark:hover:text-primary-200 transition-colors"
              >
                Clear all
              </Button>
            </div>
            <div className="max-h-[180px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary-50/50 dark:bg-primary-950/20 border-b border-primary-200 dark:border-primary-900">
                    <TableHead className="w-10 text-center text-[10px] font-black uppercase text-primary-800 dark:text-white tracking-widest whitespace-nowrap">#</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary-800 dark:text-white tracking-widest whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary-800 dark:text-white tracking-widest whitespace-nowrap">Main Part</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary-800 dark:text-white tracking-widest whitespace-nowrap w-40">Type</TableHead>
                    <TableHead className="w-16 text-center text-[10px] font-black uppercase text-primary-800 dark:text-white tracking-widest whitespace-nowrap">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingItems.map((item, idx) => (
                    <TableRow
                      key={`pending-${item.itemId}-${idx}`}
                      className="border-b border-primary-100/50 dark:border-primary-900/50 last:border-0 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors"
                    >
                      <TableCell className="text-center text-secondary-500 dark:text-secondary-400 font-bold text-xs py-2.5 tabular-nums">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="font-bold text-secondary-900 dark:text-white text-[13px] uppercase tracking-tight">{item.currentName ?? "—"}</span>
                      </TableCell>
                      <TableCell className="py-2.5 text-secondary-600 dark:text-gray-300 font-bold text-[11px] uppercase tracking-wider">{item.mainPartName ?? "—"}</TableCell>
                      <TableCell className="py-2.5 text-secondary-600 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">{item.itemTypeName ?? "—"}</TableCell>
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
            className="max-w-sm h-10 border-secondary-200 dark:border-border bg-white dark:bg-card text-sm font-medium focus:ring-primary-500/10"
          />
        </div>
        <div className="flex-1 min-h-0 border border-secondary-200 dark:border-border rounded-xl overflow-hidden bg-white dark:bg-card flex flex-col shadow-sm">
          <div className="px-4 py-2 border-b border-secondary-200 dark:border-border bg-secondary-50 dark:bg-secondary-900/50 text-[10px] font-black text-secondary-500 dark:text-secondary-400 uppercase tracking-widest">
            Available items (Not In Stock) — click a row to add to selection
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-auto flex-1 min-h-0" style={{ maxHeight: "42vh" }}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary-50 dark:bg-secondary-900/80 border-b border-secondary-200 dark:border-border sticky top-0 z-10">
                    <TableHead className="w-16 text-center text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-widest whitespace-nowrap">Action</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-secondary-500 dark:text-white tracking-widest whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-secondary-500 dark:text-white tracking-widest whitespace-nowrap">Main Part</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-secondary-500 dark:text-white tracking-widest whitespace-nowrap w-40">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addableRows.length === 0 ? (<TableRow key="no-items">
                      <TableCell colSpan={4} className="py-12 text-center text-secondary-500">
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    addableRows.map((item, idx) => {
                      const canonicalStatus = normalizeStatus(item.status);
                      const canAdd = canonicalStatus === "NotInStock" && !selectedSet.has(item.itemId);
                      const alreadyInPI = selectedSet.has(item.itemId);
                      const inPending = pendingSet.has(item.itemId);
                        return (<TableRow
                          key={`available-${item.itemId}-${idx}`}
                          className={cn(
                            "border-b border-secondary-100 dark:border-secondary-800 transition-colors group",
                            !canAdd && "bg-secondary-50/50 dark:bg-secondary-900/20",
                            canAdd && "hover:bg-primary-50/40 dark:hover:bg-primary-900/10 cursor-pointer"
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
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-primary-200 dark:border-primary-800 text-primary-500 dark:text-primary-600 group-hover:border-primary-400 dark:group-hover:border-primary-700 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-all">
                                <Plus className="w-4 h-4" />
                              </span>
                            ) : (
                              <span
                                className="inline-block h-7 w-7 rounded-full border border-secondary-200 dark:border-secondary-800 bg-secondary-100 dark:bg-secondary-900 shadow-inner"
                                title="Not in stock"
                              />
                            )}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="font-bold text-secondary-900 dark:text-white text-[13px] uppercase tracking-tight group-hover:text-primary-600 dark:group-hover:text-white transition-colors">{item.currentName ?? "—"}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-secondary-600 dark:text-gray-300 font-bold text-[11px] uppercase tracking-wider group-hover:text-secondary-900 dark:group-hover:text-white transition-colors">{item.mainPartName ?? "—"}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-secondary-600 dark:text-gray-400 font-bold text-[10px] uppercase tracking-widest group-hover:text-secondary-800 dark:group-hover:text-gray-200 transition-colors">{item.itemTypeName ?? "—"}</span>
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
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-secondary-200 dark:border-border shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-widest text-secondary-500 dark:text-secondary-400">
            {pendingItemsState.length > 0 && (
              <span className="text-primary-600 dark:text-primary-400">{pendingItemsState.length} item(s) selected</span>
            )}
            {selectedItemIds.length > 0 && (
              <span className={cn("text-secondary-400", pendingItemsState.length > 0 && "ml-3 pl-3 border-l border-secondary-200 dark:border-secondary-800")}>
                {selectedItemIds.length} already in PI
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleDone} className="font-bold h-10 px-6 border-secondary-300 dark:border-border text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 rounded-lg">
              Close
            </Button>
            {pendingItemsState.length > 0 && (
              <Button
                type="button"
                onClick={commitAddToPI}
                className="bg-primary-600 hover:bg-primary-700 text-white font-black uppercase tracking-widest text-xs h-10 px-8 shadow-md flex gap-2.5 items-center rounded-lg transition-all active:scale-95"
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
