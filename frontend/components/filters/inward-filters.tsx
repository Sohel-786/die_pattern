"use client";

import { Search, X, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { cn } from "@/lib/utils";
import type { InwardFiltersState } from "@/lib/inward-filters";
import { hasActiveInwardFilters } from "@/lib/inward-filters";
import { InwardSourceType } from "@/types";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
    "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
    "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface InwardFiltersProps {
    filters: InwardFiltersState;
    onFiltersChange: (f: InwardFiltersState) => void;
    partyOptions: MultiSelectSearchOption[];
    onClear: () => void;
    className?: string;
}

export function InwardFilters({
    filters,
    onFiltersChange,
    partyOptions,
    onClear,
    className,
}: InwardFiltersProps) {
    const hasActive = hasActiveInwardFilters(filters);
    const update = (patch: Partial<InwardFiltersState>) => {
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
                    {/* Row 1: Search + Clear */}
                    <div className="flex items-end gap-4 px-4 pt-3 pb-2 w-full">
                        <div className="relative flex-1 min-w-0">
                            <label className={filterLabelClass}>Search</label>
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                                <Input
                                    type="search"
                                    value={filters.search}
                                    onChange={(e) => update({ search: e.target.value })}
                                    placeholder="Inward No. or vendor…"
                                    className={cn(inputClass, "pl-9 h-9 w-full")}
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
                                >
                                    <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                    Clear Filter
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Source Type, Source No, Party, Status */}
                    <div className="grid grid-cols-4 gap-4 px-4 py-2 w-full">
                        <div className="min-w-0">
                            <label className={filterLabelClass}>Source Type</label>
                            <select
                                value={filters.sourceType}
                                onChange={(e) => update({ sourceType: e.target.value === "" ? "" : Number(e.target.value) as InwardSourceType })}
                                className={selectClass}
                            >
                                <option value="">All</option>
                                <option value={InwardSourceType.PO}>Purchase Order</option>
                                <option value={InwardSourceType.JobWork}>Job Work</option>
                                <option value={InwardSourceType.OutwardReturn}>Outward Return</option>
                            </select>
                        </div>
                        <div className="min-w-0">
                            <label className={filterLabelClass}>Source Number</label>
                            <Input
                                value={filters.sourceNo}
                                onChange={(e) => update({ sourceNo: e.target.value })}
                                placeholder="PO/JW No..."
                                className={cn(inputClass, "w-full")}
                            />
                        </div>
                        <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                            <label className={filterLabelClass}>Vendor / Party</label>
                            <MultiSelectSearch
                                options={partyOptions}
                                value={filters.vendorIds as (number | string)[]}
                                onChange={(v) => update({ vendorIds: v as number[] })}
                                placeholder="Select party"
                                searchPlaceholder="Search…"
                            />
                        </div>
                        <div className="min-w-0">
                            <label className={filterLabelClass}>Status</label>
                            <select
                                value={filters.isActive === null ? "" : filters.isActive ? "true" : "false"}
                                onChange={(e) => update({ isActive: e.target.value === "" ? null : e.target.value === "true" })}
                                className={selectClass}
                            >
                                <option value="">All</option>
                                <option value="true">Active Only</option>
                                <option value="false">Inactive Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Inward Date Range */}
                    <div className="flex gap-4 px-4 pb-3 pt-0 w-full">
                        <div className="flex-1 min-w-0 max-w-md">
                            <label className={filterLabelClass}>Inward Date Range</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <Input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) => update({ dateFrom: e.target.value })}
                                        className={cn(inputClass, "h-9 w-full pr-9")}
                                    />
                                    <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                                </div>
                                <div className="relative flex-1 min-w-0">
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => update({ dateTo: e.target.value })}
                                        className={cn(inputClass, "h-9 w-full pr-9")}
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
