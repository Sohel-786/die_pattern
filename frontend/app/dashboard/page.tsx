"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
    Boxes,
    Truck,
    Factory,
    ShoppingCart,
    ArrowUpRight,
    Clock,
    ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dashboard-stats"],
        queryFn: async () => {
            const response = await api.get("/dashboard/stats");
            return response.data;
        },
    });

    if (isLoading) {
        return <div className="animate-pulse space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white rounded-3xl border border-secondary-100" />)}
            </div>
            <div className="h-96 bg-white rounded-3xl border border-secondary-100" />
        </div>;
    }

    const statCards = [
        { label: "Total Patterns", value: stats?.totalPatterns || 0, icon: Boxes, color: "bg-blue-500" },
        { label: "At Vendors", value: stats?.atVendor || 0, icon: Truck, color: "bg-amber-500" },
        { label: "In-House", value: stats?.inHouse || 0, icon: Factory, color: "bg-green-500" },
        { label: "Pending PO", value: stats?.pendingPO || 0, icon: ShoppingCart, color: "bg-purple-500" },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-secondary-900 tracking-tight">System Overview</h2>
                    <p className="text-secondary-500 mt-1">Real-time status of all dies and patterns across locations.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                    <ShieldCheck className="w-4 h-4" /> System Online
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white p-6 rounded-[2rem] border border-secondary-100 shadow-sm hover:shadow-xl transition-all group"
                    >
                        <div className="flex items-center justify-between">
                            <div className={cn("p-3 rounded-2xl text-white shadow-lg", stat.color)}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <ArrowUpRight className="text-secondary-300 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="mt-5">
                            <h3 className="text-4xl font-bold text-secondary-900">{stat.value}</h3>
                            <p className="text-sm font-medium text-secondary-500 mt-1">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activities */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-secondary-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-secondary-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" /> Recent History
                            </h3>
                            <button className="text-sm font-bold text-primary hover:underline">View All</button>
                        </div>

                        <div className="space-y-6">
                            {stats?.recentChanges?.length > 0 ? (
                                stats.recentChanges.map((change: any, i: number) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-secondary-50/50 hover:bg-secondary-50 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-secondary-100 flex items-center justify-center text-primary shadow-sm font-bold">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-secondary-900">
                                                {change.patternDie?.mainPartName} - <span className="text-primary">{change.newName}</span>
                                            </p>
                                            <p className="text-xs text-secondary-500 mt-1">
                                                Revision changed from {change.previousRevision} to {change.newRevision}
                                            </p>
                                            <p className="text-[10px] text-secondary-400 mt-2 uppercase font-bold tracking-wider">
                                                {new Date(change.changedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-secondary-400 italic">No recent changes found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Location-wise Pattern count */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-secondary-100 shadow-sm">
                        <h3 className="text-xl font-bold text-secondary-900 mb-8">Location Stock</h3>
                        <div className="space-y-4">
                            {stats?.locationWiseCount?.map((loc: any, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-secondary-700">{loc.locationName}</span>
                                        <span className="text-secondary-500 font-medium">{loc.count} Units</span>
                                    </div>
                                    <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${(loc.count / stats.totalPatterns) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { cn } from "@/lib/utils";
