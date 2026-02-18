"use client";
import { LookupMaster } from "@/components/masters/lookup-master";
export default function TypesPage() {
    return <LookupMaster title="Item Types" description="Manage Die and Pattern types." endpoint="/masters/types" queryKey="types" />;
}
