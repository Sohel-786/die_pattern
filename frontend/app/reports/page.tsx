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
    queryKey: ["item-types", "active"],
    queryFn: async () => {
      const res = await api.get("/masters/item-types/active");
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
            <p className="text-gray-600">You do not have permission to view reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            Reports
          </h1>
          <p className="text-gray-600">Item ledger: full traceability for a selected die/pattern.</p>
        </div>

        {/* Select item for ledger */}
        <Card className="shadow-sm border-primary-200 bg-primary-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select item for ledger</CardTitle>
            <p className="text-sm text-gray-600 font-normal mt-1">
              Choose an item type (optional), then select an item. The table below shows the full history for that item.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[280px_320px_160px_160px_120px_auto] gap-4 items-end">
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Item Type</Label>
              <select
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                value={ledgerItemTypeId}
                onChange={(e) => {
                  const v = e.target.value;
                  setLedgerItemTypeId(v === "" ? "" : Number(v));
                  setLedgerItemId(null);
                  resetPagination();
                }}
                aria-label="Item type"
              >
                <option value="">All types</option>
                {itemTypes.map((t: { id: number; name: string }) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Item *</Label>
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
              <Label className="text-sm font-medium text-gray-700 mb-1.5">Date from</Label>
              <DatePicker
                value={ledgerDateFrom || undefined}
                onChange={(date) => {
                  setLedgerDateFrom(date ? format(date, "yyyy-MM-dd") : "");
                  resetPagination();
                }}
                placeholder="From"
                clearable
                className="h-10 rounded-lg border-gray-300"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Label className="text-sm font-medium text-gray-700 mb-1.5">Date to</Label>
              <DatePicker
                value={ledgerDateTo || undefined}
                onChange={(date) => {
                  setLedgerDateTo(date ? format(date, "yyyy-MM-dd") : "");
                  resetPagination();
                }}
                placeholder="To"
                clearable
                className="h-10 rounded-lg border-gray-300"
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <Label htmlFor="report-row-count" className="text-sm font-medium text-gray-700 mb-1.5">
                Rows per page
              </Label>
              <select
                id="report-row-count"
                value={ledgerLimit}
                onChange={(e) => {
                  const v = Number(e.target.value) as RowCount;
                  if (ROW_COUNT_OPTIONS.includes(v)) {
                    setLedgerLimit(v);
                    setLedgerPage(1);
                  }
                }}
                className="flex h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-w-[80px]"
              >
                {ROW_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <Input
                  type="search"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Search by party name, reference no., description, prepared by..."
                  className="pl-9 h-10 rounded-lg border-gray-300 bg-white"
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
                  className="shrink-0 h-9 px-3 text-gray-600 hover:bg-gray-100"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear search
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 -mt-2">
          Report is scoped to your location. Use date range and search (party name, reference no., etc.) as needed. Export uses the same criteria.
        </p>

        {/* Ledger item summary */}
        {ledgerItem && (
          <Card className="shadow-sm border-primary-200 bg-primary-50/30">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Ledger for</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {ledgerItem.itemTypeName && (
                  <>
                    <span className="text-primary-600">{ledgerItem.itemTypeName}</span>
                    <span className="text-gray-400 mx-2">&raquo;</span>
                  </>
                )}
                {ledgerItem.currentName}
                {ledgerItem.mainPartName && (
                  <span className="font-mono text-gray-600 ml-2">({ledgerItem.mainPartName})</span>
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
              <div className="text-center py-12 text-gray-500 text-lg">
                Select an item in the filter bar to view full traceability (PI, PO, Inward, QC, Job Work, Transfer).
              </div>
            ) : loadingLedger ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="ml-3 text-gray-600">Loading...</p>
              </div>
            ) : ledgerRows.length > 0 ? (
              <>
                <div className="overflow-x-auto overflow-y-hidden rounded-b-lg border border-gray-200 border-t-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-primary-200 bg-primary-100">
                        <TableHead className="text-center whitespace-nowrap min-w-[130px] font-semibold text-primary-900">Event Date</TableHead>
                        <TableHead className="text-center whitespace-nowrap min-w-[100px] font-semibold text-primary-900">Event Type</TableHead>
                        <TableHead className="text-center min-w-[200px] font-semibold text-primary-900">Item name (at event)</TableHead>
                        <TableHead className="text-center whitespace-nowrap min-w-[100px] font-semibold text-primary-900">Reference No</TableHead>
                        <TableHead className="text-center min-w-[120px] font-semibold text-primary-900">Location</TableHead>
                        <TableHead className="text-center min-w-[120px] font-semibold text-primary-900">Party</TableHead>
                        <TableHead className="text-center min-w-[180px] font-semibold text-primary-900">From – To</TableHead>
                        <TableHead className="text-center min-w-[140px] font-semibold text-primary-900">Description</TableHead>
                        <TableHead className="text-center min-w-[120px] font-semibold text-primary-900">Prepared By</TableHead>
                        <TableHead className="text-center min-w-[120px] font-semibold text-primary-900">Authorized By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerRows.map((row: ItemLedgerRow, idx: number) => (
                        <TableRow key={`${row.referenceNo}-${row.eventDate}-${idx}`} className="border-b border-gray-100 hover:bg-primary-50">
                          <TableCell className="text-center whitespace-nowrap text-gray-600">
                            {formatDateTime(row.eventDate)}
                          </TableCell>
                          <TableCell className="text-center font-medium">{row.eventType}</TableCell>
                          <TableCell className="text-center text-gray-700" title="Display name at time of event">
                            {row.itemNameAtEvent ?? "—"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-gray-700">{row.referenceNo}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.locationName ?? "—"}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.partyName ?? "—"}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.fromToDisplay ?? "—"}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.description ?? "—"}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.preparedBy ?? "—"}</TableCell>
                          <TableCell className="text-center text-gray-600">{row.authorizedBy ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {ledgerTotal > ledgerLimit && (
                  <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50/50 text-sm text-gray-600">
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
              <div className="text-center py-12 text-gray-500 text-lg">
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
