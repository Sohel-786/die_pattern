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
import type { JobWorkFiltersState } from "@/lib/job-work-filters";
import { hasActiveJobWorkFilters } from "@/lib/job-work-filters";
import { JobWorkStatus } from "@/types";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
    "h-9 rounded-lg border border-secondary-200 bg-white px-3 text-sm text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
    "h-9 w-full rounded-lg border border-secondary-200 bg-white pl-3 pr-8 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface JobWorkFiltersProps {
    filters: JobWorkFiltersState;
    onFiltersChange: (f: JobWorkFiltersState) => void;
    partyOptions: MultiSelectSearchOption[];
    onClear: () => void;
    className?: string;
}

const STATUS_LABELS: Record<JobWorkStatus, string> = {
    [JobWorkStatus.Pending]: "Pending",
    [JobWorkStatus.InTransit]: "In Transit",
    [JobWorkStatus.Completed]: "Completed",
};

export function JobWorkFilters({
    filters,
    onFiltersChange,
    partyOptions,
    onClear,
    className,
}: JobWorkFiltersProps) {
    const hasActive = hasActiveJobWorkFilters(filters);
    const update = (patch: Partial<JobWorkFiltersState>) => {
        onFiltersChange({ ...filters, ...patch });
    };

    return (
        <Card
            className={cn(
                "overflow-visible shrink-0 rounded-xl border border-secondary-200 bg-white shadow-sm w-full font-sans",
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
                                    placeholder="JobWork No, party or item…"
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
                                    className="h-9 px-4 text-xs font-bold rounded-lg transition-colors whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                                >
                                    <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                                    Clear Filter
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Status, Party, Date Range */}
                    <div className="grid grid-cols-4 gap-4 px-4 py-2 w-full pb-3">
                        <div className="min-w-0">
                            <label className={filterLabelClass}>Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => update({ status: e.target.value === "" ? "" : Number(e.target.value) as JobWorkStatus })}
                                className={selectClass}
                            >
                                <option value="">All Statuses</option>
                                <option value={JobWorkStatus.Pending}>Pending</option>
                                <option value={JobWorkStatus.InTransit}>In Transit</option>
                                <option value={JobWorkStatus.Completed}>Completed</option>
                            </select>
                        </div>

                        <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full font-mono">
                            <label className={filterLabelClass}>Party (Send To)</label>
                            <MultiSelectSearch
                                options={partyOptions}
                                value={filters.partyIds as (number | string)[]}
                                onChange={(v) => update({ partyIds: v as number[] })}
                                placeholder="Select parties"
                                searchPlaceholder="Search…"
                            />
                        </div>

                        <div className="col-span-2 min-w-0">
                            <label className={filterLabelClass}>Date Range (Created)</label>
                            <div className="flex gap-2">
                                <div className="flex-1 min-w-0">
                                    <DatePicker
                                        value={filters.dateFrom}
                                        onChange={(date) => update({ dateFrom: date ? format(date, "yyyy-MM-dd") : "" })}
                                        className="h-9 w-full border-secondary-200"
                                        placeholder="From"
                                        clearable={true}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <DatePicker
                                        value={filters.dateTo}
                                        onChange={(date) => update({ dateTo: date ? format(date, "yyyy-MM-dd") : "" })}
                                        className="h-9 w-full border-secondary-200"
                                        placeholder="To"
                                        clearable={true}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Hidden Active Toggle for now to keep UI clean, but can add if needed */}
                        <div className="hidden min-w-0">
                            <label className={filterLabelClass}>Entry State</label>
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
                </div>
            </CardContent>
        </Card>
    );
}
