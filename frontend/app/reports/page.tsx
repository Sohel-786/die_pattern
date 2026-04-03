"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import type { ItemLedgerRow } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SearchableSelectOption } from "@/components/ui/searchable-select";
import { DatePicker } from "@/components/ui/date-picker";
import { useInfiniteItemsForFilter } from "@/hooks/use-items";
import { useLocationContext } from "@/contexts/location-context";

const ROW_COUNT_OPTIONS = [25, 50, 75, 100] as const;
type RowCount = (typeof ROW_COUNT_OPTIONS)[number];

interface LedgerApiPayload {
  item: {
    id: number;
    currentName: string;
    mainPartName: string;
    itemTypeName?: string;
  };
  data: ItemLedgerRow[];
  total: number;
  page: number;
  limit: number;
}

function buildLedgerParams(
  itemId: number | null,
  debouncedSearch: string,
  dateFrom: string,
  dateTo: string,
  page: number,
  limit: number
): Record<string, string | number | undefined> {
  if (itemId == null) return {};
  const params: Record<string, string | number | undefined> = {
    itemId,
    page: String(page),
    limit: String(limit),
  };
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  const search = (debouncedSearch || "").trim();
  if (search) params.search = search;
  return params;
}

function ReportsContent() {
  const { data: permissions } = useCurrentUserPermissions();
  const { selected } = useLocationContext();
  const locationId = selected?.locationId ?? null;
  const canViewReports = permissions?.viewReports ?? false;
  const canViewLedger = permissions?.viewItemLedgerReport ?? false;
  const canAccess = canViewReports || canViewLedger;

  const [ledgerItemTypeId, setLedgerItemTypeId] = useState<number | string | "">("");
  const [ledgerItemId, setLedgerItemId] = useState<number | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit, setLedgerLimit] = useState<RowCount>(50);
  const [isExporting, setIsExporting] = useState(false);

  const debouncedLedgerSearch = useDebouncedValue(ledgerSearch, 400);
  const [itemSearch, setItemSearch] = useState("");
  const debouncedItemSearch = useDebouncedValue(itemSearch, 400);

  const { data: itemTypes = [] } = useQuery({
    queryKey: ["item-types", "for-filter", locationId],
    queryFn: async () => {
      const res = await api.get("/items/item-types/for-filter");
      return res.data?.data ?? [];
    },
    enabled: canAccess,
  });

  const {
    data: infiniteItemsData,
    fetchNextPage: fetchNextItems,
    hasNextPage: hasMoreItems,
    isFetchingNextPage: fetchingMoreItems
  } = useInfiniteItemsForFilter(debouncedItemSearch, ledgerItemTypeId);

  const ledgerItemOptions: SearchableSelectOption[] = useMemo(() => {
    if (!infiniteItemsData) return [];
    const allItems = infiniteItemsData.pages.flatMap(page => (page.data as any[]) || []);
    return allItems.map(i => ({
      value: i.id,
      label: [i.currentName, i.mainPartName].filter(Boolean).join(" – ") || `Item ${i.id}`,
    }));
  }, [infiniteItemsData]);

  const ledgerParams = useMemo(
    () =>
      buildLedgerParams(
        ledgerItemId,
        debouncedLedgerSearch,
        ledgerDateFrom,
        ledgerDateTo,
        ledgerPage,
        ledgerLimit
      ),
    [
      ledgerItemId,
      debouncedLedgerSearch,
      ledgerDateFrom,
      ledgerDateTo,
      ledgerPage,
      ledgerLimit,
    ]
  );

  const { data: ledgerReport, isLoading: loadingLedger } = useQuery({
    queryKey: ["reports", "item-ledger", ledgerParams],
    queryFn: async () => {
      const res = await api.get("/reports/item-ledger", { params: ledgerParams });
      return res.data;
    },
    enabled: canAccess && ledgerItemId != null && ledgerItemId > 0,
  });

  const ledgerPayload: LedgerApiPayload | undefined =
    ledgerReport?.data != null ? (ledgerReport.data as LedgerApiPayload) : undefined;

  const ledgerRows = ledgerPayload?.data ?? [];
  const ledgerTotal = ledgerPayload?.total ?? 0;
  const ledgerItem = ledgerPayload?.item;
  const totalPagesLedger = Math.ceil(ledgerTotal / ledgerLimit) || 1;

  const resetPagination = useCallback(() => setLedgerPage(1), []);

  const handleExportExcel = useCallback(async () => {
    if (ledgerItemId == null) {
      toast.error("Select an item first");
      return;
    }
    setIsExporting(true);
    try {
      const params: Record<string, string> = { itemId: String(ledgerItemId) };
      if (ledgerDateFrom) params.dateFrom = ledgerDateFrom;
      if (ledgerDateTo) params.dateTo = ledgerDateTo;
      const search = (ledgerSearch || debouncedLedgerSearch || "").trim();
      if (search) params.search = search;

      const res = await api.get("/reports/export/item-ledger", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Item_Ledger_${ledgerItemId}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel downloaded");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [ledgerItemId, ledgerDateFrom, ledgerDateTo, ledgerSearch, debouncedLedgerSearch]);

  if (!canAccess) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-600 dark:text-secondary-400">You do not have permission to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            Reports
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">Item ledger: full traceability for a selected die/pattern.</p>
        </div>

        {/* Select item for ledger */}
        <Card className="shadow-sm border-primary-200 dark:border-primary-800/50 bg-primary-50/20 dark:bg-primary-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select item for ledger</CardTitle>
            <p className="text-sm text-secondary-600 dark:text-secondary-400 font-normal mt-1">
              Choose an item type (optional), then select an item. The table below shows the full history for that item.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[280px_320px_160px_160px_120px_auto] gap-4 items-end">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-secondary-700 dark:text-secondary-900 mb-1.5 block">Item Type</Label>
              <Select
                value={ledgerItemTypeId?.toString() || "all"}
                onValueChange={(v) => {
                  setLedgerItemTypeId(v === "all" ? "" : Number(v));
                  setLedgerItemId(null);
                  resetPagination();
                }}
                className="h-10 border-secondary-300 dark:border-secondary-800"
                placeholder="All types"
              >
                <option value="all">All types</option>
                {itemTypes.map((t: { id: number; name: string }) => (
                  <option key={t.id} value={t.id.toString()}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-medium text-secondary-700 dark:text-secondary-900 mb-1.5 block">Item *</Label>
              <SearchableSelect
                id="ledger-item"
                options={ledgerItemOptions}
                value={ledgerItemId ?? ""}
                onChange={(v) => {
                  const id = v ? Number(v) : null;
                  setLedgerItemId(id);
                  resetPagination();
                }}
                onSearchChange={setItemSearch}
                onLoadMore={fetchNextItems}
                hasNextPage={hasMoreItems}
                isLoadingMore={fetchingMoreItems}
                placeholder={
                  ledgerItemTypeId !== ""
                    ? "Select item in this type"
                    : "Select item"
                }
                searchPlaceholder="Search item..."
                aria-label="Item"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Label className="text-sm font-medium text-secondary-700 dark:text-secondary-900 mb-1.5">Date from</Label>
              <DatePicker
                value={ledgerDateFrom || undefined}
                onChange={(date) => {
                  setLedgerDateFrom(date ? format(date, "yyyy-MM-dd") : "");
                  resetPagination();
                }}
                placeholder="From"
                clearable
                className="h-10 rounded-lg border-secondary-300 dark:border-border"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Label className="text-sm font-medium text-secondary-700 dark:text-secondary-900 mb-1.5">Date to</Label>
              <DatePicker
                value={ledgerDateTo || undefined}
                onChange={(date) => {
                  setLedgerDateTo(date ? format(date, "yyyy-MM-dd") : "");
                  resetPagination();
                }}
                placeholder="To"
                clearable
                className="h-10 rounded-lg border-secondary-300 dark:border-border"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Label htmlFor="report-row-count" className="text-sm font-medium text-secondary-700 dark:text-secondary-900 mb-1.5">
                Rows per page
              </Label>
              <Select
                value={ledgerLimit.toString()}
                onValueChange={(v) => {
                  const val = Number(v) as RowCount;
                  if (ROW_COUNT_OPTIONS.includes(val)) {
                    setLedgerLimit(val);
                    setLedgerPage(1);
                  }
                }}
                className="h-10 border-secondary-300 dark:border-secondary-800 min-w-[85px]"
              >
                {ROW_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n.toString()}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-start lg:justify-end">
              <Button
                onClick={handleExportExcel}
                disabled={isExporting || loadingLedger || ledgerItemId == null || ledgerTotal === 0}
                className="shadow-md gap-2 h-10"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search (debounced) – e.g. party name, reference no., description, prepared by */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                <Input
                  type="search"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Search by party name, reference no., description, prepared by..."
                  className="pl-9 h-10 rounded-lg border-secondary-300 dark:border-border bg-white dark:bg-card"
                  aria-label="Search ledger"
                />
              </div>
              {ledgerSearch.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLedgerSearch("");
                    setLedgerPage(1);
                  }}
                  className="shrink-0 h-9 px-3 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-secondary-500 dark:text-secondary-400 -mt-2">
          Report is scoped to your location. Use date range and search (party name, reference no., etc.) as needed. Export uses the same criteria.
        </p>

        {/* Ledger item summary */}
        {ledgerItem && (
          <Card className="shadow-sm border-primary-200 dark:border-primary-800 bg-primary-50/30 dark:bg-primary-900/10">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-secondary-600 dark:text-secondary-300 uppercase tracking-wide">Ledger for</p>
              <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-0.5">
                {ledgerItem.itemTypeName && (
                  <>
                    <span className="text-primary-600 dark:text-primary-400">{ledgerItem.itemTypeName}</span>
                    <span className="text-gray-400 mx-2">&raquo;</span>
                  </>
                )}
                {ledgerItem.currentName}
                {ledgerItem.mainPartName && (
                  <span className="font-mono text-secondary-600 dark:text-secondary-400 ml-2">({ledgerItem.mainPartName})</span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">
              Item Ledger
              {ledgerItem
                ? ` — ${ledgerItem.currentName} (${ledgerTotal} records)`
                : " — Select an item above"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerItemId == null ? (
              <div className="text-center py-12 text-secondary-500 dark:text-secondary-400 text-lg font-medium italic">
                Select an item in the filter bar to view full traceability (PI, PO, Inward, QC, Job Work, Transfer).
              </div>
            ) : loadingLedger ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="ml-3 text-secondary-600 dark:text-secondary-400 font-medium">Loading...</p>
              </div>
            ) : ledgerRows.length > 0 ? (
              <>
                <div className="overflow-x-auto overflow-y-hidden rounded-b-lg border border-secondary-200 dark:border-border border-t-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:!text-white">
                        <TableHead className="text-center whitespace-nowrap min-w-[130px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Event Date</TableHead>
                        <TableHead className="text-center whitespace-nowrap min-w-[100px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Event Type</TableHead>
                        <TableHead className="text-center min-w-[200px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Item name (at event)</TableHead>
                        <TableHead className="text-center whitespace-nowrap min-w-[100px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Reference No</TableHead>
                        <TableHead className="text-center min-w-[120px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Location</TableHead>
                        <TableHead className="text-center min-w-[120px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Party</TableHead>
                        <TableHead className="text-center min-w-[180px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">From – To</TableHead>
                        <TableHead className="text-center min-w-[140px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Description</TableHead>
                        <TableHead className="text-center min-w-[120px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Prepared By</TableHead>
                        <TableHead className="text-center min-w-[120px] font-bold text-primary-900 dark:!text-white uppercase tracking-wider text-[11px]">Authorized By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerRows.map((row: ItemLedgerRow, idx: number) => (
                        <TableRow key={`${row.referenceNo}-${row.eventDate}-${idx}`} className="border-b border-secondary-100 dark:border-border hover:bg-primary-50/50 dark:hover:bg-primary-900/10 text-secondary-900 dark:text-white">
                          <TableCell className="text-center whitespace-nowrap text-secondary-600 dark:text-secondary-800 font-medium tabular-nums">
                            {formatDateTime(row.eventDate)}
                          </TableCell>
                          <TableCell className="text-center font-bold text-secondary-900 dark:text-white whitespace-nowrap">{row.eventType}</TableCell>
                          <TableCell className="text-center text-secondary-700 dark:text-secondary-800 font-medium" title="Display name at time of event">
                            {row.itemNameAtEvent ?? "—"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-primary-600 dark:text-primary-400 font-bold whitespace-nowrap">{row.referenceNo}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 font-medium">{row.locationName ?? "—"}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 font-medium">{row.partyName ?? "—"}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 font-medium">{row.fromToDisplay ?? "—"}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 italic text-xs">{row.description ?? "—"}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 font-medium">{row.preparedBy ?? "—"}</TableCell>
                          <TableCell className="text-center text-secondary-600 dark:text-secondary-800 font-medium uppercase tracking-tighter text-[11px] whitespace-nowrap">{row.authorizedBy ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {ledgerTotal > ledgerLimit && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-secondary-200 dark:border-border bg-secondary-50/50 dark:bg-secondary-900/30 text-sm text-secondary-600 dark:text-secondary-400">
                    <span>
                      Showing {(ledgerPage - 1) * ledgerLimit + 1}–{Math.min(ledgerPage * ledgerLimit, ledgerTotal)} of {ledgerTotal}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerPage((p) => p - 1)}
                        disabled={ledgerPage <= 1}
                        className="h-9 px-3"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="min-w-[100px] text-center font-medium">
                        Page {ledgerPage} of {totalPagesLedger}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLedgerPage((p) => p + 1)}
                        disabled={ledgerPage >= totalPagesLedger}
                        className="h-9 px-3"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-secondary-500 dark:text-secondary-400 text-lg font-medium italic">
                {ledgerSearch.trim() || ledgerDateFrom || ledgerDateTo
                  ? "No ledger records match your search or date range."
                  : "No traceability records for this item."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center min-h-[200px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
