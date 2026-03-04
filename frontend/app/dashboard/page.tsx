"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import api from "@/lib/api";
import { DashboardMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Package,
  FileText,
  ShoppingCart,
  History,
  ArrowRight,
  Search,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

type TableView = "at-vendor" | "pending-pi-po" | null;

interface ItemAtVendor {
  id: number;
  mainPartName: string;
  currentName?: string | null;
  drawingNo?: string | null;
  currentProcess: string;
  locationName?: string | null;
}

interface PendingPiPo {
  pendingIndents: { id: number; piNo: string; type: string; status: string; createdAt: string }[];
  pendingOrders: { id: number; poNo: string; status: string; createdAt: string }[];
}

export default function DashboardPage() {
  const [tableView, setTableView] = useState<TableView>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const response = await api.get("/dashboard/metrics");
      return response.data.data;
    },
  });

  const tableParams = useMemo(
    () => ({ ...(debouncedSearch && { search: debouncedSearch }) }),
    [debouncedSearch]
  );

  const { data: itemsAtVendor = [], isLoading: loadingAtVendor } = useQuery<ItemAtVendor[]>({
    queryKey: ["dashboard", "items-at-vendor", tableParams],
    queryFn: async () => {
      const response = await api.get("/dashboard/items-at-vendor", { params: tableParams });
      return response.data?.data ?? [];
    },
    enabled: tableView === "at-vendor",
  });

  const { data: pendingPiPo, isLoading: loadingPending } = useQuery<PendingPiPo>({
    queryKey: ["dashboard", "pending-pi-po"],
    queryFn: async () => {
      const response = await api.get("/dashboard/pending-pi-po");
      return response.data?.data ?? { pendingIndents: [], pendingOrders: [] };
    },
    enabled: tableView === "pending-pi-po",
  });

  const recentCount = metrics?.recentChangesCount ?? metrics?.recentChanges?.length ?? 0;
  const pendingPiPoTotal = (metrics?.summary?.pendingPI ?? 0) + (metrics?.summary?.pendingPO ?? 0);

  const statCards = [
    {
      title: "Location Wise Pattern Count",
      value: metrics?.summary?.total ?? 0,
      icon: MapPin,
      gradient: "from-blue-500 to-blue-600",
      baseBg: "bg-blue-50/40",
      shadowColor: "shadow-blue-500/20",
      iconColor: "text-blue-600",
      onClick: () => setTableView(null),
    },
    {
      title: "Patterns at Vendor",
      value: metrics?.summary?.atVendor ?? 0,
      icon: Package,
      gradient: "from-amber-500 to-amber-600",
      baseBg: "bg-amber-50/40",
      shadowColor: "shadow-amber-500/20",
      iconColor: "text-amber-600",
      onClick: () => setTableView("at-vendor"),
    },
    {
      title: "Pending PI & PO",
      value: pendingPiPoTotal,
      icon: FileText,
      gradient: "from-rose-500 to-rose-600",
      baseBg: "bg-rose-50/40",
      shadowColor: "shadow-rose-500/20",
      iconColor: "text-rose-600",
      onClick: () => setTableView("pending-pi-po"),
    },
    {
      title: "Recent Changes",
      value: recentCount,
      icon: History,
      gradient: "from-emerald-500 to-emerald-600",
      baseBg: "bg-emerald-50/40",
      shadowColor: "shadow-emerald-500/20",
      iconColor: "text-emerald-600",
      onClick: () => setTableView(null),
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-secondary-50/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-secondary-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header - QC_Tool style */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text mb-2">Dashboard</h1>
            <p className="text-secondary-600">
              Plan, prioritize, and manage your die & pattern items with ease.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/items">
              <Button variant="outline" className="shadow-sm">
                View All Items
              </Button>
            </Link>
            <Link href="/reports">
              <Button className="shadow-md">
                View Reports
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Cards - 4 cards, QC_Tool styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <div
                  onClick={stat.onClick}
                  className={`
                    relative overflow-hidden rounded-2xl cursor-pointer group h-full
                    ${stat.baseBg} hover:bg-gradient-to-br ${stat.gradient}
                    transition-all duration-500 ease-out
                    shadow-xl ${stat.shadowColor} border border-secondary-100/50
                  `}
                >
                  <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-secondary-500 group-hover:text-white/90 transition-colors duration-300">
                            {stat.title}
                          </p>
                          <h3 className="text-4xl font-bold text-text group-hover:text-white transition-colors duration-300 tracking-tight">
                            {stat.value}
                          </h3>
                        </div>
                      </div>
                      <div
                        className={`
                          p-3 rounded-xl shadow-sm transition-all duration-300
                          bg-secondary-50 group-hover:bg-white/20 group-hover:backdrop-blur-sm
                          group-hover:scale-110 group-hover:rotate-3
                        `}
                      >
                        <Icon
                          className={`
                            w-6 h-6 transition-colors duration-300
                            ${stat.iconColor} group-hover:text-white
                          `}
                        />
                      </div>
                    </div>
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-current opacity-[0.03] group-hover:opacity-10 pointer-events-none transition-opacity duration-500" />
                  </CardContent>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Drill-down: Patterns at Vendor */}
        {tableView === "at-vendor" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-secondary-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-xl font-bold text-text">
                  Patterns at Vendor
                </CardTitle>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
                  <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, drawing…"
                    className="pl-9 h-10 rounded-lg border-secondary-300 bg-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingAtVendor ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  <p className="mt-4 text-secondary-600">Loading...</p>
                </div>
              ) : itemsAtVendor.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-primary-200 bg-primary-100">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-primary-900 w-12">#</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">Main Part</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">Current Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">Drawing No</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-secondary-700">Process</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsAtVendor.map((item, idx) => (
                        <tr key={item.id} className="border-b border-secondary-100 hover:bg-primary-50/50">
                          <td className="py-3 px-4 text-secondary-600">{idx + 1}</td>
                          <td className="py-3 px-4 font-medium text-text">{item.mainPartName}</td>
                          <td className="py-3 px-4 text-secondary-600">{item.currentName ?? "—"}</td>
                          <td className="py-3 px-4 text-secondary-600 font-mono text-sm">{item.drawingNo ?? "—"}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                              {item.currentProcess}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-secondary-500">No patterns at vendor match your filters.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Drill-down: Pending PI & PO */}
        {tableView === "pending-pi-po" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b border-secondary-200">
              <CardTitle className="text-xl font-bold text-text">Pending PI & PO</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingPending ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                  <p className="mt-4 text-secondary-600">Loading...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  <div>
                    <h3 className="text-sm font-semibold text-secondary-600 uppercase tracking-wider mb-3">Pending Purchase Indents</h3>
                    {(pendingPiPo?.pendingIndents?.length ?? 0) > 0 ? (
                      <ul className="space-y-2">
                        {pendingPiPo!.pendingIndents.map((pi) => (
                          <li key={pi.id} className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-lg">
                            <span className="font-medium text-text">{pi.piNo}</span>
                            <Link href="/purchase-indents">
                              <Button variant="ghost" size="sm" className="text-primary-600">View</Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-secondary-500 text-sm py-4">No pending PIs.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-secondary-600 uppercase tracking-wider mb-3">Pending Purchase Orders</h3>
                    {(pendingPiPo?.pendingOrders?.length ?? 0) > 0 ? (
                      <ul className="space-y-2">
                        {pendingPiPo!.pendingOrders.map((po) => (
                          <li key={po.id} className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-lg">
                            <span className="font-medium text-text">{po.poNo}</span>
                            <Link href="/purchase-orders">
                              <Button variant="ghost" size="sm" className="text-primary-600">View</Button>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-secondary-500 text-sm py-4">No pending POs.</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Location Wise & Recent Changes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                Location-wise Pattern Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.locationWiseCount?.length ? metrics.locationWiseCount.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-lg">
                    <span className="font-medium text-text">{loc.locationName}</span>
                    <span className="px-3 py-1 bg-white text-primary-600 rounded-full font-bold shadow-sm">{loc.count}</span>
                  </div>
                )) : (
                  <p className="text-secondary-500 text-center py-4 italic">No location data.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                Recent Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentChanges?.length ? metrics.recentChanges.map((log: { mainPartName?: string; oldName?: string; newName?: string; changeType?: string; createdAt?: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm p-3 border-b border-secondary-100 last:border-0">
                    <div>
                      <p className="font-semibold text-text">{log.mainPartName ?? "—"}</p>
                      <p className="text-secondary-500">{log.oldName ?? "—"} → {log.newName ?? "—"}</p>
                      {log.createdAt && (
                        <p className="text-xs text-secondary-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md font-medium shrink-0">{log.changeType ?? "—"}</span>
                  </div>
                )) : (
                  <p className="text-secondary-500 text-center py-4 italic">No recent changes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
