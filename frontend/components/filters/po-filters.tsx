"use client";

import { Search, X, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { POFiltersState } from "@/lib/po-filters";
import { hasActivePOFilters } from "@/lib/po-filters";
import { PoStatus } from "@/types";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
  "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
  "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface POFiltersProps {
  filters: POFiltersState;
  onFiltersChange: (f: POFiltersState) => void;
  partyOptions: MultiSelectSearchOption[];
  itemOptions: MultiSelectSearchOption[];
  onClear: () => void;
  className?: string;
}

export function POFilters({
  filters,
  onFiltersChange,
  partyOptions,
  itemOptions,
  onClear,
  className,
}: POFiltersProps) {
  const hasActive = hasActivePOFilters(filters);
  const update = (patch: Partial<POFiltersState>) => {
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
          {/* Row 1: Search (full width of row) + Clear Filter */}
          <div className="flex items-end gap-4 px-4 pt-3 pb-2 w-full">
            <div className="relative flex-1 min-w-0">
              <label className={filterLabelClass} htmlFor="po-search">
                Search
              </label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                <Input
                  id="po-search"
                  type="search"
                  value={filters.search}
                  onChange={(e) => update({ search: e.target.value })}
                  placeholder="PO No. or party…"
                  className={cn(inputClass, "pl-9 h-9 w-full")}
                  aria-label="Search purchase orders"
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

          {/* Row 2: Approval Status, Purchase Type, Party, Item — equal width columns */}
          <div className="grid grid-cols-4 gap-4 px-4 py-2 w-full">
            <div className="min-w-0">
              <label className={filterLabelClass}>Approval Status</label>
              <select
                value={filters.status}
                onChange={(e) => update({ status: e.target.value })}
                className={selectClass}
                aria-label="Approval status"
              >
                <option value="">All</option>
                <option value={PoStatus.Pending}>Pending</option>
                <option value={PoStatus.Approved}>Approved</option>
                <option value={PoStatus.Rejected}>Rejected</option>
              </select>
            </div>
            <div className="min-w-0">
              <label className={filterLabelClass}>Purchase Type</label>
              <select
                value={filters.purchaseType}
                onChange={(e) => update({ purchaseType: e.target.value })}
                className={selectClass}
                aria-label="Purchase type"
              >
                <option value="">All</option>
                <option value="Regular">Regular</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
              <label className={filterLabelClass}>Party</label>
              <MultiSelectSearch
                options={partyOptions}
                value={filters.vendorIds as (number | string)[]}
                onChange={(v) => update({ vendorIds: v as number[] })}
                placeholder="Select party"
                searchPlaceholder="Search…"
                aria-label="Filter by party"
              />
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
          </div>

          {/* Row 3: Purchase Order Date Wise, Delivery Date Wise, Rate Wise — equal width columns */}
          <div className="grid grid-cols-3 gap-4 px-4 pb-3 pt-0 w-full">
            <div className="min-w-0">
              <label className={filterLabelClass}>Purchase Order Date Wise</label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={filters.poDateFrom}
                    onChange={(date) => update({ poDateFrom: date ? format(date, "yyyy-MM-dd") : "" })}
                    className="h-9 w-full border-secondary-200"
                    placeholder="From"
                    clearable={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={filters.poDateTo}
                    onChange={(date) => update({ poDateTo: date ? format(date, "yyyy-MM-dd") : "" })}
                    className="h-9 w-full border-secondary-200"
                    placeholder="To"
                    clearable={true}
                  />
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <label className={filterLabelClass}>Delivery Date Wise</label>
              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={filters.deliveryDateFrom}
                    onChange={(date) => update({ deliveryDateFrom: date ? format(date, "yyyy-MM-dd") : "" })}
                    className="h-9 w-full border-secondary-200"
                    placeholder="From"
                    clearable={true}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <DatePicker
                    value={filters.deliveryDateTo}
                    onChange={(date) => update({ deliveryDateTo: date ? format(date, "yyyy-MM-dd") : "" })}
                    className="h-9 w-full border-secondary-200"
                    placeholder="To"
                    clearable={true}
                  />
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <label className={filterLabelClass}>Rate Wise</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={filters.rateMin ?? ""}
                  onChange={(e) =>
                    update({ rateMin: e.target.value === "" ? null : parseFloat(e.target.value) || null })
                  }
                  placeholder="Min"
                  className={cn(inputClass, "h-9 flex-1 min-w-0")}
                  aria-label="Minimum rate"
                />
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={filters.rateMax ?? ""}
                  onChange={(e) =>
                    update({ rateMax: e.target.value === "" ? null : parseFloat(e.target.value) || null })
                  }
                  placeholder="Max"
                  className={cn(inputClass, "h-9 flex-1 min-w-0")}
                  aria-label="Maximum rate"
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
