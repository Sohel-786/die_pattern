"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Briefcase, Package, Calendar } from "lucide-react";
import api from "@/lib/api";
import { JobWork, JobWorkStatus } from "@/types";
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
import { format } from "date-fns";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { JobWorkDialog } from "@/components/job-works/job-work-dialog";

const STATUS_LABELS: Record<JobWorkStatus, string> = {
    [JobWorkStatus.Pending]: "Pending",
    [JobWorkStatus.InTransit]: "In Transit",
    [JobWorkStatus.Completed]: "Completed",
};

export default function JobWorksPage() {
    const { data: permissions } = useCurrentUserPermissions();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<JobWorkStatus | "">("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data: jobWorks = [], isLoading } = useQuery<JobWork[]>({
        queryKey: ["job-works", statusFilter],
        queryFn: async () => {
            const params = statusFilter !== "" ? `?status=${statusFilter}` : "";
            const res = await api.get("/job-works" + params);
            return res.data.data ?? [];
        },
        enabled: !!permissions?.viewMovement
    });

    if (permissions && !permissions.viewMovement) {
        return (
            <div className="flex h-[80vh] items-center justify-center font-sans px-4">
                <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
                    <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">Access Restricted</h2>
                    <p className="text-secondary-500 font-medium">You don&apos;t have permission to view Job Work entries.</p>
                </div>
            </div>
        );
    }

    const filtered = jobWorks.filter(jw =>
        (jw.jobWorkNo ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (jw.itemName ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (jw.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">Job Work</h1>
                    <p className="text-secondary-500 text-sm">Items sent for job work — receive back via Inward</p>
                </div>
                {permissions?.createInward && (
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Job Work
                    </Button>
                )}
            </div>

            <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="p-4 bg-white border-b border-secondary-100 flex flex-wrap gap-4 items-center shrink-0">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                        <Input
                            placeholder="Search by Job Work No, Item, Description..."
                            className="pl-10 h-10 border-secondary-200 focus:border-primary-500 focus:ring-primary-500/10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value === "" ? "" : Number(e.target.value))}
                        className="h-10 px-3 rounded-lg border border-secondary-200 bg-white text-sm font-medium text-secondary-700 focus:border-primary-500"
                    >
                        <option value="">All statuses</option>
                        {(Object.keys(STATUS_LABELS) as unknown as JobWorkStatus[]).map((k) => (
                            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-auto flex-1 min-h-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">#</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Job Work No</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Item</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Description</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Status</TableHead>
                                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px]">Created</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell colSpan={6} className="h-16 px-6"><div className="h-4 bg-secondary-100 rounded-full w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filtered.length > 0 ? (
                                filtered.map((jw, idx) => (
                                    <TableRow key={jw.id} className="border-b border-secondary-100 hover:bg-secondary-50">
                                        <TableCell className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{idx + 1}</TableCell>
                                        <TableCell className="px-4 py-3 font-mono font-bold text-primary-600 text-sm">{jw.jobWorkNo ?? "—"}</TableCell>
                                        <TableCell className="px-4 py-3 font-medium text-secondary-900 text-sm">{jw.itemName ?? "—"}</TableCell>
                                        <TableCell className="px-4 py-3 text-secondary-600 text-sm max-w-[200px] truncate">{jw.description ?? "—"}</TableCell>
                                        <TableCell className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                                                jw.status === JobWorkStatus.Pending ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                jw.status === JobWorkStatus.InTransit ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                                "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            }`}>
                                                {STATUS_LABELS[jw.status]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-secondary-500">
                                            {jw.createdAt ? format(new Date(jw.createdAt), "dd MMM yyyy HH:mm") : "—"}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-16 text-center text-secondary-400 italic font-medium">
                                        No job work entries found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {dialogOpen && <JobWorkDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
        </div>
    );
}
