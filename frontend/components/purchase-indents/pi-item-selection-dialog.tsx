"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { ItemWithStatus, ItemProcessState } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ItemProcessState, string> = {
  NotInStock: "Not in stock",
  InPI: "PI Issued",
  InPO: "PO Issued",
  InQC: "In QC",
  InJobwork: "In Job work",
  Outward: "Outward",
  InStock: "In Stock",
};

const STATUS_PILL_CLASS: Record<ItemProcessState, string> = {
  NotInStock: "bg-slate-100 text-slate-700 border-slate-200",
  InPI: "bg-amber-100 text-amber-800 border-amber-200",
  InPO: "bg-indigo-100 text-indigo-800 border-indigo-200",
  InQC: "bg-violet-100 text-violet-800 border-violet-200",
  InJobwork: "bg-teal-100 text-teal-800 border-teal-200",
  Outward: "bg-orange-100 text-orange-800 border-orange-200",
  InStock: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

interface PiItemSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  selectedItemIds: number[];
  onAddItems: (itemIds: number[]) => void;
  /** When editing a PI, pass its id so items only in this PI are treated as available. */
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
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const { data: itemsWithStatus = [], isLoading } = useQuery<ItemWithStatus[]>({
    queryKey: ["purchase-indents", "items-with-status", excludePiId ?? "new"],
    queryFn: async () => {
      const params = excludePiId != null ? { excludePiId } : {};
      const res = await api.get("/purchase-indents/items-with-status", { params });
      const data = res.data?.data ?? [];
      return Array.isArray(data) ? data : [];
    },
    enabled: open,
  });

  const selectedSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return itemsWithStatus;
    const q = search.trim().toLowerCase();
    return itemsWithStatus.filter(
      (i) =>
        (i.currentName ?? "").toLowerCase().includes(q) ||
        (i.mainPartName ?? "").toLowerCase().includes(q)
    );
  }, [itemsWithStatus, search]);

  const addableRows = useMemo(
    () => filtered.filter((i) => i.status === "NotInStock" && !selectedSet.has(i.itemId)),
    [filtered, selectedSet]
  );
  const checkedAddable = useMemo(
    () => addableRows.filter((r) => checkedIds.has(r.itemId)),
    [addableRows, checkedIds]
  );

  const handleToggle = (itemId: number) => {
    const item = itemsWithStatus.find((i) => i.itemId === itemId);
    if (!item || item.status !== "NotInStock" || selectedSet.has(itemId)) return;
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleSelectAllAddable = () => {
    if (checkedAddable.length === addableRows.length) {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        addableRows.forEach((r) => next.delete(r.itemId));
        return next;
      });
    } else {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        addableRows.forEach((r) => next.add(r.itemId));
        return next;
      });
    }
  };

  const handleAddSelected = () => {
    const toAdd = Array.from(checkedIds).filter(
      (id) => itemsWithStatus.find((i) => i.itemId === id)?.status === "NotInStock" && !selectedSet.has(id)
    );
    if (toAdd.length === 0) return;
    onAddItems(toAdd);
    setCheckedIds((prev) => {
      const next = new Set(prev);
      toAdd.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleDone = () => {
    setSearch("");
    setCheckedIds(new Set());
    onClose();
  };

  return (
    <Dialog
      isOpen={open}
      onClose={handleDone}
      title="Add items to Purchase Indent"
      size="2xl"
      contentScroll={false}
      className="max-h-[85vh] flex flex-col"
    >
      <div className="flex flex-col flex-1 min-h-0 p-6">
        <p className="text-sm text-secondary-600 mb-4">
          Only items with status <span className="font-semibold text-slate-700">Not in stock</span> can be added. Others are shown for reference.
        </p>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Search by name or main part..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm h-9 border-secondary-200"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAllAddable}
            disabled={addableRows.length === 0}
            className="h-9"
          >
            {checkedAddable.length === addableRows.length && addableRows.length > 0 ? "Deselect all" : "Select all addable"}
          </Button>
        </div>
        <div className="flex-1 min-h-0 border border-secondary-200 rounded-lg overflow-hidden bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary-50 border-b border-secondary-200">
                    <TableHead className="w-10 text-center">Add</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600">Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600">Main Part</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600 w-28">Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase text-secondary-600 w-36">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-secondary-500">
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const canAdd = item.status === "NotInStock" && !selectedSet.has(item.itemId);
                      const alreadyIn = selectedSet.has(item.itemId);
                      const checked = checkedIds.has(item.itemId);
                      return (
                        <TableRow
                          key={item.itemId}
                          className={cn(
                            "border-b border-secondary-100",
                            !canAdd && "bg-secondary-50/50",
                            canAdd && "hover:bg-primary-50/30"
                          )}
                        >
                          <TableCell className="text-center align-middle">
                            {alreadyIn ? (
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" title="Already in PI">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : canAdd ? (
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggle(item.itemId)}
                                className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                              />
                            ) : (
                              <span className="inline-block w-4 h-4 rounded border border-secondary-200 bg-secondary-100" title={STATUS_LABELS[item.status]} />
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
                                STATUS_PILL_CLASS[item.status]
                              )}
                            >
                              {STATUS_LABELS[item.status]}
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
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-secondary-200 mt-4">
          <div className="text-sm text-secondary-600">
            {checkedAddable.length > 0 && (
              <span className="font-medium text-primary-700">{checkedAddable.length} item(s) selected to add</span>
            )}
            {selectedItemIds.length > 0 && (
              <span className="ml-2 text-secondary-500">{selectedItemIds.length} already in PI</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDone} className="font-semibold">
              Done
            </Button>
            <Button
              type="button"
              onClick={handleAddSelected}
              disabled={checkedAddable.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2"
            >
              <Plus className="w-4 h-4" />
              Add selected to PI
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
