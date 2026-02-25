"use client";

import { Search, X, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { cn } from "@/lib/utils";
import type { PIFiltersState } from "@/lib/pi-filters";
import { hasActivePIFilters } from "@/lib/pi-filters";
import { PurchaseIndentStatus } from "@/types";

/** Shared with PO filter for consistent enterprise UX. */
const filterLabelClass =
  "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
  "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
  "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface PIFiltersProps {
  filters: PIFiltersState;
  onFiltersChange: (f: PIFiltersState) => void;
  itemOptions: MultiSelectSearchOption[];
  onClear: () => void;
  className?: string;
}

export function PIFilters({
  filters,
  onFiltersChange,
  itemOptions,
  onClear,
  className,
}: PIFiltersProps) {
  const hasActive = hasActivePIFilters(filters);
  const update = (patch: Partial<PIFiltersState>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <Card
      className={cn(
        "overflow-visible shrink-0 rounded-xl border border-secondary-200 bg-white shadow-sm w-full",
        className
      )}
    >
      <CardContent className="p-0 w-full">
        <div className="flex flex-col gap-0 overflow-visible w-full">
          {/* Row 1: Search (full width) + Clear Filter — matches PO layout */}
          <div className="flex items-end gap-4 px-4 pt-3 pb-2 w-full">
            <div className="relative flex-1 min-w-0">
              <label className={filterLabelClass} htmlFor="pi-search">
                Search
              </label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                <Input
                  id="pi-search"
                  type="search"
                  value={filters.search}
                  onChange={(e) => update({ search: e.target.value })}
                  placeholder="PI No., creator or remarks…"
                  className={cn(inputClass, "pl-9 h-9 w-full")}
                  aria-label="Search purchase indents"
                />
              </div>
            </div>
            {hasActive && (
              <div className="flex items-end pb-0.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClear}
                  className="h-9 px-4 text-xs font-medium rounded-lg transition-colors whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                  aria-label="Clear all filters"
                >
                  <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Clear Filter
                </Button>
              </div>
            )}
          </div>

          {/* Row 2: Approval Status, Item, Created Date — equal width columns (same grid pattern as PO) */}
          <div className="grid grid-cols-3 gap-4 px-4 pb-3 pt-0 w-full">
            <div className="min-w-0">
              <label className={filterLabelClass}>Approval Status</label>
              <select
                value={filters.status}
                onChange={(e) => update({ status: e.target.value })}
                className={selectClass}
                aria-label="Approval status"
              >
                <option value="">All</option>
                <option value={PurchaseIndentStatus.Pending}>Pending</option>
                <option value={PurchaseIndentStatus.Approved}>Approved</option>
                <option value={PurchaseIndentStatus.Rejected}>Rejected</option>
              </select>
            </div>
            <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
              <label className={filterLabelClass}>Item</label>
              <MultiSelectSearch
                options={itemOptions}
                value={filters.itemIds as (number | string)[]}
                onChange={(v) => update({ itemIds: v as number[] })}
                placeholder="Select item"
                searchPlaceholder="Search…"
                aria-label="Filter by item"
              />
            </div>
            <div className="min-w-0">
              <label className={filterLabelClass}>Created Date</label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Input
                    type="date"
                    value={filters.createdDateFrom}
                    onChange={(e) => update({ createdDateFrom: e.target.value })}
                    className={cn(inputClass, "h-9 w-full pr-9")}
                    aria-label="Created date from"
                  />
                  <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                </div>
                <div className="relative flex-1 min-w-0">
                  <Input
                    type="date"
                    value={filters.createdDateTo}
                    onChange={(e) => update({ createdDateTo: e.target.value })}
                    className={cn(inputClass, "h-9 w-full pr-9")}
                    aria-label="Created date to"
                  />
                  <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
