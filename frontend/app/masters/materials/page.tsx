"use client";
import { LookupMaster } from "@/components/masters/lookup-master";
export default function MaterialsPage() {
    return <LookupMaster title="Material Master" description="Manage materials used for patterns/dies." endpoint="/masters/materials" queryKey="materials" />;
}
