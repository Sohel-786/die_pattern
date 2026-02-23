"use client";

import { useQuery } from "@tanstack/react-query";
import {
    Plus, Search, ArrowDownLeft, Package,
    Building2, MapPin, Eye, Filter, Calendar
} from "lucide-react";
import api from "@/lib/api";
import { Movement, MovementType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

export default function InwardsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");

    const { data: movements = [], isLoading } = useQuery<Movement[]>({
        queryKey: ["movements", "inward"],
        queryFn: async () => {
            const res = await api.get("/movements");
            return res.data.data.filter((m: Movement) => m.type === MovementType.Inward);
        },
        enabled: !!permissions?.viewInward
    });

    if (permissions && !permissions.viewInward) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-secondary-900">Access Denied</h2>
                    <p className="text-secondary-500">You don't have permission to view inward entries.</p>
                </div>
            </div>
        );
    }

    const filteredMovements = movements.filter(m =>
        m.item?.currentName.toLowerCase().includes(search.toLowerCase()) ||
        m.purchaseOrder?.poNo.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 space-y-4 bg-secondary-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Inward Entries</h1>
                    <p className="text-secondary-500 text-sm">Track materials received from vendors</p>
                </div>
                {permissions?.createInward && (
                    <Link href="/movements/inward">
                        <Button className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            Inward Receipt
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="border-secondary-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Item or PO No..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary-500 hover:text-primary-600 font-bold text-xs uppercase tracking-wider"
                        onClick={() => setSearch("")}
                    >
                        Clear Filters
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-primary-50 border-secondary-100 divide-x divide-secondary-100">
                                <TableHead className="w-16 h-11 text-center font-bold text-primary-900 uppercase tracking-tight text-[11px]">Sr.No</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Inward Details</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Received Item</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Source Vendor</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Storage Target</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px] text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={6} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredMovements.length > 0 ? (
                                filteredMovements.map((m, idx) => (
                                    <TableRow
                                        key={m.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans whitespace-nowrap"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{m.transactionNo || `INW-${m.id}`}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{format(new Date(m.createdAt), 'dd MMM yyyy')}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <Package className="w-4 h-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-secondary-900 uppercase">{m.item?.currentName}</span>
                                                    <span className="text-[9px] text-secondary-400 font-bold uppercase tracking-tight">{m.item?.mainPartName}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 font-bold text-secondary-700 text-[11px] uppercase">
                                                    <Building2 className="w-3 h-3 text-secondary-400" />
                                                    {m.purchaseOrder?.vendorName || 'DIRECT'}
                                                </div>
                                                <span className="text-[10px] text-primary-600 font-bold uppercase italic">
                                                    PO: {m.purchaseOrder?.poNo || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 font-bold text-secondary-600 text-[11px] uppercase">
                                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                                {m.toLocationName || m.toLocation?.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                title="View Entry"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <td colSpan={6} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No inward receipts found matching parameters.
                                    </td>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
