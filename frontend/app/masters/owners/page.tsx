"use client";
import { LookupMaster } from "@/components/masters/lookup-master";
export default function OwnersPage() {
    return <LookupMaster title="Owner Type Master" description="Manage ownership categories." endpoint="/masters/owner-types" queryKey="owner-types" />;
}
