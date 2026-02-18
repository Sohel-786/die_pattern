"use client";
import { LookupMaster } from "@/components/masters/lookup-master";
export default function StatusesPage() {
    return <LookupMaster title="Status Master" description="Manage life-cycle statuses." endpoint="/masters/statuses" queryKey="statuses" />;
}
