"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, FileSpreadsheet, History, Package,
  ShieldCheck, ArrowUpRight, ArrowDownLeft,
  TrendingUp, Download, Filter, Search
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type ReportTab = "inventory" | "movements" | "qc";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("inventory");
  const [search, setSearch] = useState("");

  const { data: inventory = [], isLoading: loadingInv } = useQuery<any[]>({
    queryKey: ["reports", "inventory"],
    queryFn: async () => {
      const res = await api.get("/item-reports/inventory-status");
      return res.data.data;
    },
    enabled: activeTab === "inventory"
  });

  const { data: movements = [], isLoading: loadingMov } = useQuery<any[]>({
    queryKey: ["reports", "movements"],
    queryFn: async () => {
      const res = await api.get("/item-reports/movement-ledger");
      return res.data.data;
    },
    enabled: activeTab === "movements"
  });

  const { data: qcInfo, isLoading: loadingQC } = useQuery<any>({
    queryKey: ["reports", "qc"],
    queryFn: async () => {
      const res = await api.get("/item-reports/qc-summary");
      return res.data.data;
    },
    enabled: activeTab === "qc"
  });

  return (
    <div className="p-8 space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
            <BarChart3 className="w-10 h-10 text-primary-600" />
            Strategic Reports
          </h1>
          <p className="text-gray-500 mt-2 font-semibold text-lg">Detailed analytical insights for asset lifecycle & logic</p>
        </motion.div>

        <div className="flex bg-white p-2 rounded-[2rem] shadow-xl border border-gray-100">
          {(["inventory", "movements", "qc"] as ReportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                ? "bg-primary-600 text-white shadow-lg shadow-primary/30"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 bg-secondary-50/50">
            <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Package className="w-4 h-4" /> Global Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase">Tracked Units</p>
              <p className="text-5xl font-black text-gray-900 tracking-tighter">542</p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-emerald-500 font-bold text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>+12 New this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-black/5 bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 bg-secondary-50/50">
            <CardTitle className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> QC Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase">First Pass Yield</p>
              <p className="text-5xl font-black text-emerald-600 tracking-tighter">98%</p>
            </div>
            <div className="mt-8 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[98%]" />
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2 bg-gray-900 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border-none">
              <Download className="w-6 h-6" />
            </Button>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white tracking-tight">Export Full Ledger</h3>
            <p className="text-gray-400 font-medium max-w-xs">Download the complete movement and lifecycle history for all items across all companies.</p>
          </div>
          <Button className="w-fit mt-10 h-14 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-black px-10 shadow-xl shadow-primary/40">
            Generate .XLSX
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-secondary-50/20">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary-600">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight capitalize">{activeTab} Ledger</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{activeTab === 'inventory' ? 'Real-time stock positions' : activeTab === 'movements' ? 'Historical transfer logs' : 'Certification audit results'}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Quick search data..."
                className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm font-bold text-sm min-w-[300px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="ghost" className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-gray-100">
              <Filter className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <AnimatePresence mode="wait">
            {activeTab === "inventory" && (
              <motion.div key="inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Table>
                  <TableHeader className="bg-secondary-50/50">
                    <TableRow className="border-none">
                      <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-widest text-xs">Identity</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs">Technical</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs text-center">Custodian</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((row) => (
                      <TableRow key={row.id} className="group hover:bg-primary-50/30 transition-all border-none">
                        <TableCell className="py-7 pl-10 border-b border-gray-50">
                          <p className="font-black text-gray-800 text-lg leading-none">{row.currentName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mt-2 tracking-widest">{row.mainPartName}</p>
                        </TableCell>
                        <TableCell className="border-b border-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-secondary-50 text-[10px] font-black rounded-lg border border-gray-100">{row.itemType}</span>
                            <span className="text-[10px] font-black text-gray-400 italic">REV: {row.revisionNo}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center border-b border-gray-50">
                          <p className="text-sm font-black text-gray-700">{row.holder}</p>
                          <p className={`text-[9px] font-black uppercase tracking-[0.1em] mt-1 ${row.currentHolderType === "Location" ? "text-primary-500" : row.currentHolderType === "NotInStock" ? "text-secondary-500" : "text-amber-500"}`}>
                            {row.currentHolderType === "NotInStock" ? "Not in stock" : row.currentHolderType}
                          </p>
                        </TableCell>
                        <TableCell className="text-center border-b border-gray-50">
                          <span className="px-4 py-1.5 rounded-xl bg-secondary-50 text-[10px] font-black border border-gray-100 uppercase italic">
                            {row.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}

            {activeTab === "movements" && (
              <motion.div key="mov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Table>
                  <TableHeader className="bg-secondary-50/50">
                    <TableRow className="border-none">
                      <TableHead className="font-black text-gray-900 py-8 pl-10 uppercase tracking-widest text-xs">Date & Protocol</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs">Asset</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs">Route</TableHead>
                      <TableHead className="font-black text-gray-900 uppercase tracking-widest text-xs">Execution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((row) => (
                      <TableRow key={row.id} className="group hover:bg-blue-50/30 transition-all border-none">
                        <TableCell className="py-7 pl-10 border-b border-gray-50">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${row.type === 'Outward' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                              {row.type === 'Outward' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-black text-gray-800 text-sm">{format(new Date(row.date), 'dd MMM yyyy')}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase">{row.type}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="border-b border-gray-50">
                          <p className="font-black text-gray-800 text-base">{row.item}</p>
                        </TableCell>
                        <TableCell className="border-b border-gray-50">
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-500">{row.from}</span>
                            <div className="h-0.5 w-4 bg-gray-100" />
                            <span className="text-xs font-black text-gray-900">{row.to}</span>
                          </div>
                        </TableCell>
                        <TableCell className="border-b border-gray-50">
                          <p className="text-xs font-black text-gray-600">{row.user}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1 truncate max-w-[150px]">{row.remarks || 'No remarks recorded'}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
