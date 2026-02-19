"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { DashboardMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Users,
  MapPin,
  FileText,
  ShoppingCart,
  History,
  AlertCircle,
  TrendingUp
} from "lucide-react";

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const response = await api.get("/dashboard/metrics");
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Items", value: metrics?.summary.total || 0, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "At Vendor", value: metrics?.summary.atVendor || 0, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "At Location", value: metrics?.summary.atLocation || 0, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Pending PI", value: metrics?.summary.pendingPI || 0, icon: FileText, color: "text-rose-600", bg: "bg-rose-50" },
    { title: "Pending PO", value: metrics?.summary.pendingPO || 0, icon: ShoppingCart, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="p-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of Item & Asset Management System</p>
      </motion.div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {statCards.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Location Wise Distribution */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary-600" />
              Location-wise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.locationWiseCount.map((loc, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-secondary-50/50 rounded-lg">
                  <span className="font-medium text-gray-700">{loc.locationName}</span>
                  <span className="px-3 py-1 bg-white text-primary-600 rounded-full font-bold shadow-sm">{loc.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Changes & Adjustments */}
        <div className="space-y-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Recent Modifications / Repairs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentChanges.length ? metrics.recentChanges.map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-semibold text-gray-900">{log.mainPartName}</p>
                      <p className="text-gray-500">{log.oldName} → {log.newName}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md font-medium">{log.changeType}</span>
                  </div>
                )) : <p className="text-gray-400 text-center py-4 italic">No recent changes</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                System Adjustments (Returns)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentSystemAdjustments.length ? metrics.recentSystemAdjustments.map((adj, i) => (
                  <div key={i} className="p-3 bg-rose-50/30 rounded-lg border border-rose-100/50">
                    <p className="font-semibold text-gray-900">{adj.mainPartName}</p>
                    <p className="text-xs text-rose-600 mt-1 italic">Reason: {adj.reason}</p>
                  </div>
                )) : <p className="text-gray-400 text-center py-4 italic">No recent adjustments</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
