"use client";

import { useQuery } from "@tanstack/react-query";
import {
    Plus, Search, Package, Building2, MapPin, Eye, Filter,
    FileText, Truck, Briefcase, Calendar
} from "lucide-react";
import api from "@/lib/api";
import { Inward, InwardSourceType, InwardStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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

const SOURCE_LABELS: Record<InwardSourceType, string> = {
    [InwardSourceType.PO]: "PO",
    [InwardSourceType.OutwardReturn]: "Outward Return",
    [InwardSourceType.JobWork]: "Job Work",
};

const STATUS_LABELS: Record<InwardStatus, string> = {
    [InwardStatus.Draft]: "Draft",
    [InwardStatus.Submitted]: "Submitted",
};

export default function InwardsPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");
    const [sourceFilter, setSourceFilter] = useState<InwardSourceType | "">("");
    const [statusFilter, setStatusFilter] = useState<InwardStatus | "">("");

    const { data: inwards = [], isLoading } = useQuery<Inward[]>({
        queryKey: ["inwards", sourceFilter, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (sourceFilter !== "") params.set("sourceType", String(sourceFilter));
            if (statusFilter !== "") params.set("status", String(statusFilter));
            const res = await api.get("/inwards" + (params.toString() ? "?" + params.toString() : ""));
            return res.data.data;
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

    const filtered = inwards.filter(i =>
        (i.inwardNo || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.sourceRefDisplay || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.vendorName || "").toLowerCase().includes(search.toLowerCase()) ||
        (i.locationName || "").toLowerCase().includes(search.toLowerCase())
    );

    const SourceIcon = ({ sourceType }: { sourceType: InwardSourceType }) => {
        if (sourceType === InwardSourceType.PO) return <FileText className="w-4 h-4 text-blue-600" />;
        if (sourceType === InwardSourceType.OutwardReturn) return <Truck className="w-4 h-4 text-amber-600" />;
        return <Briefcase className="w-4 h-4 text-emerald-600" />;
    };

    return (
        <div className="p-4 space-y-4 bg-secondary-50/30 min-h-screen">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Inward Entries</h1>
                    <p className="text-secondary-500 text-sm">PO, Outward Return & Job Work receipts — all go through Inward & QC</p>
                </div>
                {permissions?.createInward && (
                    <Link href="/inwards/create">
                        <Button className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all">
                            <Plus className="w-4 h-4 mr-2" />
                            New Inward
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="border-secondary-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Inward No, Ref, Vendor, Location..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                    >
                        <option value="">All sources</option>
                        {(Object.keys(SOURCE_LABELS) as unknown as InwardSourceType[]).map((k) => (
                            <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                    >
                        <option value="">All statuses</option>
                        {(Object.keys(STATUS_LABELS) as unknown as InwardStatus[]).map((k) => (
                            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                        ))}
                    </select>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-secondary-500 hover:text-primary-600 font-bold text-xs uppercase tracking-wider"
                        onClick={() => { setSearch(""); setSourceFilter(""); setStatusFilter(""); }}
                    >
                        Clear
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-primary-50 border-secondary-100 divide-x divide-secondary-100">
                                <TableHead className="w-12 h-11 text-center font-bold text-primary-900 uppercase tracking-tight text-[11px]">#</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Inward No / Date</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Source</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Reference</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Vendor / Location</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Lines</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px]">Status</TableHead>
                                <TableHead className="h-11 font-bold text-primary-900 uppercase tracking-tight text-[11px] text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={8} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((i, idx) => (
                                    <TableRow
                                        key={i.id}
                                        className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group font-sans whitespace-nowrap"
                                    >
                                        <td className="px-4 py-3 text-secondary-500 font-bold text-center text-[11px]">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{i.inwardNo}</span>
                                                <span className="text-[10px] text-secondary-400 font-bold uppercase">{format(new Date(i.inwardDate), "dd MMM yyyy")}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <SourceIcon sourceType={i.sourceType} />
                                                <span className="font-bold text-secondary-900 text-[11px] uppercase">{SOURCE_LABELS[i.sourceType]}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-primary-600 text-[11px] uppercase">{i.sourceRefDisplay ?? i.sourceRefId}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 font-bold text-secondary-700 text-[11px] uppercase">
                                                    <Building2 className="w-3 h-3 text-secondary-400" />
                                                    {i.vendorName ?? "—"}
                                                </div>
                                                <span className="text-[10px] text-secondary-500 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" /> {i.locationName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-secondary-700 font-bold text-[11px]">{i.lines?.length ?? 0} line(s)</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${i.status === InwardStatus.Draft ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                                                {STATUS_LABELS[i.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/inwards/${i.id}`}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                                                    title="View"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </td>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <td colSpan={8} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No inward entries found.
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
