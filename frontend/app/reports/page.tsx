"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, FileText, FileSpreadsheet, History, ArrowLeftRight,
  Download, Search, Loader2, ChevronLeft, ChevronRight
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
  TableRow
} from "@/components/ui/table";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import type { PIReportRow, InwardReportRow, ItemLedgerRow } from "@/types";
import { PurchaseIndentStatus } from "@/types";
import { cn } from "@/lib/utils";

const ROW_COUNT_OPTIONS = [25, 50, 75, 100] as const;
type ReportTab = "pi" | "inward" | "ledger";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export default function ReportsPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const canViewReports = permissions?.viewReports ?? false;
  const canViewPI = permissions?.viewPIPReport ?? false;
  const canViewInward = permissions?.viewInwardReport ?? false;
  const canViewLedger = permissions?.viewItemLedgerReport ?? false;

  const tabs = useMemo(() => {
    const t: { id: ReportTab; label: string; icon: typeof FileText }[] = [];
    if (canViewPI) t.push({ id: "pi", label: "PI Report", icon: FileText });
    if (canViewInward) t.push({ id: "inward", label: "Inward Report", icon: ArrowLeftRight });
    if (canViewLedger) t.push({ id: "ledger", label: "Item Ledger", icon: History });
    return t;
  }, [canViewPI, canViewInward, canViewLedger]);

  const defaultTab: ReportTab = tabs[0]?.id ?? "pi";
  const [activeTab, setActiveTab] = useState<ReportTab>(defaultTab);
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) setActiveTab(tabs[0].id);
  }, [tabs, activeTab]);

  const [piSearch, setPiSearch] = useState("");
  const [piDateFrom, setPiDateFrom] = useState("");
  const [piDateTo, setPiDateTo] = useState("");
  const [piStatus, setPiStatus] = useState("");
  const [piPage, setPiPage] = useState(1);
  const [piLimit, setPiLimit] = useState(25);
  const [piSelected, setPiSelected] = useState<Set<number>>(new Set());

  const [inwardSearch, setInwardSearch] = useState("");
  const [inwardDateFrom, setInwardDateFrom] = useState("");
  const [inwardDateTo, setInwardDateTo] = useState("");
  const [inwardPage, setInwardPage] = useState(1);
  const [inwardLimit, setInwardLimit] = useState(25);
  const [inwardSelected, setInwardSelected] = useState<Set<number>>(new Set());

  const [ledgerItemId, setLedgerItemId] = useState<number | null>(null);
  const [ledgerDateFrom, setLedgerDateFrom] = useState("");
  const [ledgerDateTo, setLedgerDateTo] = useState("");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLimit, setLedgerLimit] = useState(50);
  const [ledgerSelected, setLedgerSelected] = useState<Set<number>>(new Set());

  const debouncedPiSearch = useDebouncedValue(piSearch, 400);
  const debouncedInwardSearch = useDebouncedValue(inwardSearch, 400);

  const piParams = useMemo(() => ({
    search: debouncedPiSearch || undefined,
    dateFrom: piDateFrom || undefined,
    dateTo: piDateTo || undefined,
    status: piStatus || undefined,
    page: piPage,
    limit: piLimit,
  }), [debouncedPiSearch, piDateFrom, piDateTo, piStatus, piPage, piLimit]);

  const inwardParams = useMemo(() => ({
    search: debouncedInwardSearch || undefined,
    dateFrom: inwardDateFrom || undefined,
    dateTo: inwardDateTo || undefined,
    page: inwardPage,
    limit: inwardLimit,
  }), [debouncedInwardSearch, inwardDateFrom, inwardDateTo, inwardPage, inwardLimit]);

  const ledgerParams = useMemo(() => ({
    itemId: ledgerItemId!,
    dateFrom: ledgerDateFrom || undefined,
    dateTo: ledgerDateTo || undefined,
    page: ledgerPage,
    limit: ledgerLimit,
  }), [ledgerItemId, ledgerDateFrom, ledgerDateTo, ledgerPage, ledgerLimit]);

  const { data: piReport, isLoading: loadingPI } = useQuery<{ data: PaginatedResponse<PIReportRow> }>({
    queryKey: ["reports", "purchase-indents", piParams],
    queryFn: async () => {
      const res = await api.get("/reports/purchase-indents", { params: piParams });
      return res.data;
    },
    enabled: canViewReports && activeTab === "pi",
  });

  const { data: inwardReport, isLoading: loadingInward } = useQuery<{ data: { data: InwardReportRow[]; total: number; page: number; limit: number } }>({
    queryKey: ["reports", "inwards", inwardParams],
    queryFn: async () => {
      const res = await api.get("/reports/inwards", { params: inwardParams });
      return res.data;
    },
    enabled: canViewReports && activeTab === "inward",
  });

  const { data: ledgerReport, isLoading: loadingLedger } = useQuery<{ data: { item: { id: number; currentName: string; mainPartName: string; itemTypeName?: string }; data: ItemLedgerRow[]; total: number; page: number; limit: number } }>({
    queryKey: ["reports", "item-ledger", ledgerParams],
    queryFn: async () => {
      const res = await api.get("/reports/item-ledger", { params: ledgerParams });
      return res.data;
    },
    enabled: canViewReports && activeTab === "ledger" && !!ledgerItemId,
  });

  const { data: itemsList = [] } = useQuery<{ id: number; currentName?: string; mainPartName?: string }[]>({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data.data ?? [];
    },
    enabled: canViewLedger && activeTab === "ledger",
  });

  const handleExportExcel = useCallback(async () => {
    try {
      if (activeTab === "pi") {
        const params = new URLSearchParams();
        if (debouncedPiSearch) params.set("search", debouncedPiSearch);
        if (piDateFrom) params.set("dateFrom", piDateFrom);
        if (piDateTo) params.set("dateTo", piDateTo);
        if (piStatus) params.set("status", piStatus);
        const res = await api.get("/reports/export/purchase-indents", { params, responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `PI_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Excel downloaded");
      } else if (activeTab === "inward") {
        const params = new URLSearchParams();
        if (debouncedInwardSearch) params.set("search", debouncedInwardSearch);
        if (inwardDateFrom) params.set("dateFrom", inwardDateFrom);
        if (inwardDateTo) params.set("dateTo", inwardDateTo);
        const res = await api.get("/reports/export/inwards", { params, responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Inward_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Excel downloaded");
      } else if (activeTab === "ledger" && ledgerItemId) {
        const params = new URLSearchParams({ itemId: String(ledgerItemId) });
        if (ledgerDateFrom) params.set("dateFrom", ledgerDateFrom);
        if (ledgerDateTo) params.set("dateTo", ledgerDateTo);
        const res = await api.get("/reports/export/item-ledger", { params, responseType: "blob" });
        const url = URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Item_Ledger_${ledgerItemId}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Excel downloaded");
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Export failed");
    }
  }, [activeTab, debouncedPiSearch, piDateFrom, piDateTo, piStatus, debouncedInwardSearch, inwardDateFrom, inwardDateTo, ledgerItemId, ledgerDateFrom, ledgerDateTo]);

  if (!canViewReports) {
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

  const piPayload = piReport?.data as PaginatedResponse<PIReportRow> | undefined;
  const inwardPayload = inwardReport?.data as PaginatedResponse<InwardReportRow> | undefined;
  const ledgerPayload = ledgerReport?.data as { item: { id: number; currentName: string; mainPartName: string; itemTypeName?: string }; data: ItemLedgerRow[]; total: number; page: number; limit: number } | undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary-600" />
          Reports
        </h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            disabled={
              (activeTab === "pi" && !piPayload?.data?.length) ||
              (activeTab === "inward" && !inwardPayload?.data?.length) ||
              (activeTab === "ledger" && (!ledgerItemId || !ledgerPayload?.data?.length))
            }
            variant="outline"
            className="gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                activeTab === id
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "pi" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Purchase Indent Report</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="PI No, Creator..."
                    className="pl-9"
                    value={piSearch}
                    onChange={(e) => setPiSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Date From</Label>
                <Input type="date" className="mt-1" value={piDateFrom} onChange={(e) => setPiDateFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Date To</Label>
                <Input type="date" className="mt-1" value={piDateTo} onChange={(e) => setPiDateTo(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm"
                  value={piStatus}
                  onChange={(e) => setPiStatus(e.target.value)}
                >
                  <option value="">All</option>
                  {Object.values(PurchaseIndentStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Page size</Label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm"
                  value={piLimit}
                  onChange={(e) => { setPiLimit(Number(e.target.value)); setPiPage(1); }}
                >
                  {ROW_COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loadingPI ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12"><input type="checkbox" checked={piPayload?.data?.length ? piSelected.size === piPayload.data.length : false} onChange={(e) => { if (e.target.checked) setPiSelected(new Set(piPayload?.data?.map((r: PIReportRow) => r.id) ?? [])); else setPiSelected(new Set()); }} /></TableHead>
                        <TableHead>PI No</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Approved</TableHead>
                        <TableHead>Creator</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Req. Delivery</TableHead>
                        <TableHead>MTC Req</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(piPayload?.data ?? []).map((row: PIReportRow) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={piSelected.has(row.id)}
                              onChange={() => {
                                const next = new Set(piSelected);
                                if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
                                setPiSelected(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{row.piNo}</TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.createdAt ? format(new Date(row.createdAt), "dd-MMM-yyyy") : ""}</TableCell>
                          <TableCell>{row.approvedAt ? format(new Date(row.approvedAt), "dd-MMM-yyyy") : "-"}</TableCell>
                          <TableCell>{row.creatorName ?? "-"}</TableCell>
                          <TableCell>{row.approverName ?? "-"}</TableCell>
                          <TableCell>{row.itemCount}</TableCell>
                          <TableCell>{row.reqDateOfDelivery ?? "-"}</TableCell>
                          <TableCell>{row.mtcReq ? "Yes" : "No"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Showing {(piPage - 1) * piLimit + 1}-{Math.min(piPage * piLimit, piPayload?.total ?? 0)} of {piPayload?.total ?? 0}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={piPage <= 1} onClick={() => setPiPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <span>Page {piPage} of {Math.max(1, Math.ceil((piPayload?.total ?? 0) / piLimit))}</span>
                      <Button variant="outline" size="sm" disabled={piPage >= Math.ceil((piPayload?.total ?? 0) / piLimit)} onClick={() => setPiPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "inward" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Inward Report</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Inward No, Vendor..." className="pl-9" value={inwardSearch} onChange={(e) => setInwardSearch(e.target.value)} />
                </div>
              </div>
              <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1" value={inwardDateFrom} onChange={(e) => setInwardDateFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1" value={inwardDateTo} onChange={(e) => setInwardDateTo(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Page size</Label>
                <select className="w-full mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm" value={inwardLimit} onChange={(e) => { setInwardLimit(Number(e.target.value)); setInwardPage(1); }}>
                  {ROW_COUNT_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loadingInward ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12"><input type="checkbox" checked={inwardPayload?.data?.length ? inwardSelected.size === inwardPayload.data.length : false} onChange={(e) => { if (e.target.checked) setInwardSelected(new Set(inwardPayload?.data?.map((r: InwardReportRow) => r.id) ?? [])); else setInwardSelected(new Set()); }} /></TableHead>
                        <TableHead>Inward No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Lines</TableHead>
                        <TableHead>Created By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(inwardPayload?.data ?? []).map((row: InwardReportRow) => (
                        <TableRow key={row.id}>
                          <TableCell><input type="checkbox" checked={inwardSelected.has(row.id)} onChange={() => { const next = new Set(inwardSelected); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); setInwardSelected(next); }} /></TableCell>
                          <TableCell className="font-medium">{row.inwardNo}</TableCell>
                          <TableCell>{row.inwardDate ? format(new Date(row.inwardDate), "dd-MMM-yyyy") : ""}</TableCell>
                          <TableCell>{row.status}</TableCell>
                          <TableCell>{row.locationName ?? "-"}</TableCell>
                          <TableCell>{row.vendorName ?? "-"}</TableCell>
                          <TableCell>{row.lineCount}</TableCell>
                          <TableCell>{row.creatorName ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Showing {(inwardPage - 1) * inwardLimit + 1}-{Math.min(inwardPage * inwardLimit, inwardPayload?.total ?? 0)} of {inwardPayload?.total ?? 0}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={inwardPage <= 1} onClick={() => setInwardPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <span>Page {inwardPage} of {Math.max(1, Math.ceil((inwardPayload?.total ?? 0) / inwardLimit))}</span>
                      <Button variant="outline" size="sm" disabled={inwardPage >= Math.ceil((inwardPayload?.total ?? 0) / inwardLimit)} onClick={() => setInwardPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "ledger" && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Item Ledger</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Full history for a selected item (die/pattern), active entries only, ordered by date.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div className="lg:col-span-2">
                <Label className="text-xs">Select Item *</Label>
                <select
                  className="w-full mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm"
                  value={ledgerItemId ?? ""}
                  onChange={(e) => { setLedgerItemId(e.target.value ? Number(e.target.value) : null); setLedgerPage(1); }}
                >
                  <option value="">-- Select item --</option>
                  {itemsList.map((i) => (
                    <option key={i.id} value={i.id}>{[i.currentName, i.mainPartName].filter(Boolean).join(" – ") || `Item ${i.id}`}</option>
                  ))}
                </select>
              </div>
              <div><Label className="text-xs">Date From</Label><Input type="date" className="mt-1" value={ledgerDateFrom} onChange={(e) => setLedgerDateFrom(e.target.value)} /></div>
              <div><Label className="text-xs">Date To</Label><Input type="date" className="mt-1" value={ledgerDateTo} onChange={(e) => setLedgerDateTo(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Page size</Label>
                <select className="w-full mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm" value={ledgerLimit} onChange={(e) => { setLedgerLimit(Number(e.target.value)); setLedgerPage(1); }}>
                  {[25, 50, 75, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {ledgerPayload?.item && (
              <p className="mt-2 text-sm font-medium text-gray-700">
                Item: {ledgerPayload.item.currentName} ({ledgerPayload.item.mainPartName}) {ledgerPayload.item.itemTypeName && ` · ${ledgerPayload.item.itemTypeName}`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {!ledgerItemId ? (
                <p className="py-12 text-center text-gray-500">Select an item to view its ledger.</p>
              ) : loadingLedger ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Event Date</TableHead>
                        <TableHead>Event Type</TableHead>
                        <TableHead>Reference No</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ledgerPayload?.data ?? []).map((row: ItemLedgerRow, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{(ledgerPage - 1) * ledgerLimit + idx + 1}</TableCell>
                          <TableCell>{row.eventDate ? format(new Date(row.eventDate), "dd-MMM-yyyy HH:mm") : ""}</TableCell>
                          <TableCell>{row.eventType}</TableCell>
                          <TableCell className="font-medium">{row.referenceNo}</TableCell>
                          <TableCell>{row.locationName ?? "-"}</TableCell>
                          <TableCell>{row.partyName ?? "-"}</TableCell>
                          <TableCell>{row.description ?? "-"}</TableCell>
                          <TableCell>{row.byUser ?? "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
                    <span>Showing {(ledgerPage - 1) * ledgerLimit + 1}-{Math.min(ledgerPage * ledgerLimit, ledgerPayload?.total ?? 0)} of {ledgerPayload?.total ?? 0}</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <span>Page {ledgerPage} of {Math.max(1, Math.ceil((ledgerPayload?.total ?? 0) / ledgerLimit))}</span>
                      <Button variant="outline" size="sm" disabled={ledgerPage >= Math.ceil((ledgerPayload?.total ?? 0) / ledgerLimit)} onClick={() => setLedgerPage((p) => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
