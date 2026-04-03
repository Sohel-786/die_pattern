import { Search, X, Calendar, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import type { MultiSelectSearchOption } from "@/components/ui/multi-select-search";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TransferFiltersState } from "@/lib/transfer-filters";
import { Role } from "@/types";

import { hasActiveTransferFilters } from "@/lib/transfer-filters";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { Select } from "@/components/ui/select";
import { ItemInfiniteSelect } from "./item-infinite-select";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const inputClass =
    "h-9 rounded-lg border border-secondary-200 dark:border-secondary-200 bg-white dark:bg-card px-3 text-sm text-secondary-900 dark:text-foreground placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-colors";
const selectClass =
    "h-9 w-full rounded-lg border border-secondary-200 dark:border-secondary-200 bg-white dark:bg-card pl-3 pr-8 text-sm text-secondary-900 dark:text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface TransferFiltersProps {
    filters: TransferFiltersState;
    onFiltersChange: (f: TransferFiltersState) => void;
    partyOptions: MultiSelectSearchOption[];
    creatorOptions: MultiSelectSearchOption[];
    onClear: () => void;
    isAdmin: boolean;
    /** Display name for current location (value 0) in From/To party filters. Shown instead of "Our Location". */
    currentLocationName?: string | null;
    className?: string;
}

export function TransferFilters({
    filters,
    onFiltersChange,
    partyOptions,
    creatorOptions,
    onClear,
    isAdmin,
    currentLocationName,
    className,
}: TransferFiltersProps) {
    const hasActive = hasActiveTransferFilters(filters);

    const update = (patch: Partial<TransferFiltersState>) => {
        const isPaginationOnly = Object.keys(patch).every((k) => k === "page" || k === "pageSize");
        onFiltersChange({ ...filters, ...patch, ...(isPaginationOnly ? {} : { page: 1 }) });
    };

    // Current location (value 0) shown with actual name when available
    const partyOptionsWithLocation = [
        { label: currentLocationName ?? "Our Location", value: 0 },
        ...partyOptions,
    ];

    return (
        <Card
            className={cn(
                "overflow-visible shrink-0 rounded-xl border border-secondary-200 bg-white shadow-sm w-full",
                className
            )}
        >
            <CardContent className="p-0 w-full">
                <div className="flex flex-col gap-0 overflow-visible w-full">
                    {/* Row 1: Search and Clear */}
                    <div className="flex items-end gap-4 px-4 pt-3 pb-2 w-full">
                        <div className="relative flex-1 min-w-0">
                            <label className={filterLabelClass}>Search</label>
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400 pointer-events-none" />
                                <Input
                                    type="search"
                                    value={filters.search}
                                    onChange={(e) => update({ search: e.target.value })}
                                    placeholder="Transfer No, remarks or details…"
                                    className={cn(inputClass, "pl-9 h-9 w-full")}
                                />
                            </div>
                        </div>
                        <PageSizeSelect
                            value={filters.pageSize}
                            onChange={(pageSize) => update({ pageSize, page: 1 })}
                        />
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

                    {/* Row 2: Parties and Items */}
                    <div className="grid grid-cols-3 gap-4 px-4 py-2 w-full">
                        <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                            <label className={filterLabelClass}>From Party</label>
                            <MultiSelectSearch
                                options={partyOptionsWithLocation}
                                value={filters.fromPartyIds}
                                onChange={(v) => update({ fromPartyIds: v as number[] })}
                                placeholder="Select party"
                            />
                        </div>
                        <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                            <label className={filterLabelClass}>To Party</label>
                            <MultiSelectSearch
                                options={partyOptionsWithLocation}
                                value={filters.toPartyIds}
                                onChange={(v) => update({ toPartyIds: v as number[] })}
                                placeholder="Select party"
                            />
                        </div>
                        <div className="min-w-0">
                            <label className={filterLabelClass}>ITEM SELECTION</label>
                            <ItemInfiniteSelect
                                value={filters.itemIds}
                                onChange={(v) => update({ itemIds: v })}
                                placeholder="Select items"
                            />
                        </div>
                    </div>

                    {/* Row 3: Rows per page, Creator, Active, Dates */}
                    <div className="grid grid-cols-4 gap-4 px-4 pb-3 pt-2 w-full">
                        <div className="min-w-0 [&_button]:h-9 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-sm [&_button]:w-full">
                            <label className={filterLabelClass}>Created By</label>
                            <MultiSelectSearch
                                options={creatorOptions}
                                value={filters.creatorIds}
                                onChange={(v) => update({ creatorIds: v as number[] })}
                                placeholder="Select user"
                                searchPlaceholder="Search user…"
                            />
                        </div>

                        <div className="min-w-0">
                            <label className={filterLabelClass}>Entry Status</label>
                            {isAdmin ? (
                                <Select
                                    value={filters.isActive === null ? "all" : filters.isActive ? "true" : "false"}
                                    onValueChange={(v) => update({ isActive: v === "all" ? null : v === "true" })}
                                    className="border-secondary-200 h-9"
                                    placeholder="All"
                                >
                                    <option value="all">All</option>
                                    <option value="true">Active Only</option>
                                    <option value="false">Inactive Only</option>
                                </Select>
                            ) : (
                                <div className={cn(selectClass, "flex items-center bg-secondary-50 text-secondary-500 cursor-not-allowed")}>
                                    Active Only
                                </div>
                            )}
                        </div>

                        <div className="col-span-2 min-w-0 flex gap-2">
                            <div className="flex-1">
                                <label className={filterLabelClass}>From Date</label>
                                <DatePicker
                                    value={filters.dateFrom}
                                    onChange={(date) => update({ dateFrom: date ? format(date, "yyyy-MM-dd") : "" })}
                                    className="h-9 w-full border-secondary-200"
                                    placeholder="From"
                                    clearable={true}
                                />
                            </div>
                            <div className="flex-1">
                                <label className={filterLabelClass}>To Date</label>
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
                </div>
            </CardContent>
        </Card>
    );
}

