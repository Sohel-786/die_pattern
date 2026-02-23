"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ShieldCheck, ShieldAlert, Save, X,
    LayoutDashboard, Package, FileText,
    ShoppingCart, ArrowLeftRight, ClipboardCheck,
    BarChart3, Settings, Shield as ShieldIcon,
    CheckCircle2, AlertTriangle, Users, ArrowUpRight,
    Building2, MapPin, Layers, History, RotateCcw,
    Search, CheckSquare, Edit, Activity, Plus,
    ArrowDownLeft
} from "lucide-react";
import api from "@/lib/api";
import { UserPermission } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

interface PermissionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    userName: string;
}

const PermissionToggle = ({
    label,
    checked,
    onChange,
    icon: Icon,
    description
}: {
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
    icon: any;
    description?: string;
}) => (
    <div className="group flex items-center justify-between p-6 rounded-[2rem] bg-secondary-50/50 hover:bg-white border border-transparent hover:border-gray-100 transition-all hover:shadow-xl hover:shadow-black/5">
        <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${checked ? 'bg-primary-600 text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-gray-400'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="font-black text-gray-900 tracking-tight">{label}</p>
                {description && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{description}</p>}
            </div>
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-16 h-8 rounded-full transition-all flex items-center px-1 ${checked ? 'bg-primary-600' : 'bg-gray-200'}`}
        >
            <motion.div
                animate={{ x: checked ? 32 : 0 }}
                className="h-6 w-6 rounded-full bg-white shadow-md shadow-black/10"
            />
        </button>
    </div>
);

export function PermissionDialog({ isOpen, onClose, userId, userName }: PermissionDialogProps) {
    const queryClient = useQueryClient();
    const [permissions, setPermissions] = useState<UserPermission | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["user-permissions", userId],
        queryFn: async () => {
            const res = await api.get(`/users/${userId}/permissions`);
            return res.data.data;
        },
        enabled: isOpen
    });

    useEffect(() => {
        if (data) setPermissions(data);
    }, [data]);

    const mutation = useMutation({
        mutationFn: (data: UserPermission) => api.put(`/users/${userId}/permissions`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
            toast.success("Strategic reach reconfigured");
            onClose();
        },
        onError: (err: any) => toast.error("Authorization failed")
    });

    const updatePermission = (key: keyof UserPermission, value: boolean) => {
        if (!permissions) return;
        setPermissions({ ...permissions, [key]: value });
    };

    if (!isOpen) return null;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title=""
            hideHeader
            size="2xl"
            className="rounded-[4rem] bg-white border-none shadow-2xl overflow-hidden p-0"
        >
            <div className="flex flex-col h-[85vh] -m-6 bg-white overflow-hidden">
                <div className="bg-gray-900 p-12 shrink-0 relative">
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="h-20 w-20 rounded-3xl bg-amber-500 flex items-center justify-center text-white shadow-2xl shadow-amber-500/30">
                                <ShieldIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase">Tactical Reach Control</h2>
                                <p className="text-amber-400 font-bold text-sm tracking-widest mt-2">CONFIGURING OPERATIVE: @{userName}</p>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 h-14 w-14 rounded-2xl">
                            <X className="w-8 h-8" />
                        </Button>
                    </div>
                    <div className="absolute top-0 right-0 h-64 w-64 bg-amber-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </div>

                <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-amber-500" />
                            <p className="font-black text-gray-400 uppercase text-xs tracking-widest">Hydrating ACL...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-full mb-4">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Intelligence & Reporting</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <PermissionToggle label="Strategic Dashboard" checked={permissions?.viewDashboard || false} onChange={(v) => updatePermission('viewDashboard', v)} icon={LayoutDashboard} description="Global visualization of metrics" />
                                    <PermissionToggle label="Operational Reports" checked={permissions?.viewReports || false} onChange={(v) => updatePermission('viewReports', v)} icon={BarChart3} description="Exportable analytical datasets" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Registry & Asset Repository</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <PermissionToggle label="View Registry" checked={permissions?.viewMaster || false} onChange={(v) => updatePermission('viewMaster', v)} icon={Package} description="Read-only access to masters" />
                                    <PermissionToggle label="Manage Items" checked={permissions?.manageItem || false} onChange={(v) => updatePermission('manageItem', v)} icon={Layers} description="Configure Die/Pattern masters" />
                                    <PermissionToggle label="Manage Types" checked={permissions?.manageItemType || false} onChange={(v) => updatePermission('manageItemType', v)} icon={Search} description="Control asset classification" />
                                    <PermissionToggle label="Manage Materials" checked={permissions?.manageMaterial || false} onChange={(v) => updatePermission('manageMaterial', v)} icon={Layers} description="Material composition registry" />
                                    <PermissionToggle label="Manage Status" checked={permissions?.manageItemStatus || false} onChange={(v) => updatePermission('manageItemStatus', v)} icon={Activity} description="Asset lifecycle states" />
                                    <PermissionToggle label="Manage Location" checked={permissions?.manageLocation || false} onChange={(v) => updatePermission('manageLocation', v)} icon={MapPin} description="Site & Storage hierarchy" />
                                    <PermissionToggle label="Manage Party" checked={permissions?.manageParty || false} onChange={(v) => updatePermission('manageParty', v)} icon={Users} description="Vendor & Client interaction" />
                                    <PermissionToggle label="Manage Company" checked={permissions?.manageCompany || false} onChange={(v) => updatePermission('manageCompany', v)} icon={Building2} description="Organization entity control" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Procurement Pipeline (PI)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PermissionToggle label="View PI" checked={permissions?.viewPI || false} onChange={(v) => updatePermission('viewPI', v)} icon={FileText} description="Monitor Indents" />
                                    <PermissionToggle label="Create PI" checked={permissions?.createPI || false} onChange={(v) => updatePermission('createPI', v)} icon={Plus} description="Initiate Indent" />
                                    <PermissionToggle label="Edit PI" checked={permissions?.editPI || false} onChange={(v) => updatePermission('editPI', v)} icon={Edit} description="Modify Indent" />
                                    <PermissionToggle label="Approve PI" checked={permissions?.approvePI || false} onChange={(v) => updatePermission('approvePI', v)} icon={ShieldCheck} description="Authorize Indent" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Purchase Control (PO)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PermissionToggle label="View PO" checked={permissions?.viewPO || false} onChange={(v) => updatePermission('viewPO', v)} icon={ShoppingCart} description="Monitor Orders" />
                                    <PermissionToggle label="Create PO" checked={permissions?.createPO || false} onChange={(v) => updatePermission('createPO', v)} icon={Plus} description="Generate Order" />
                                    <PermissionToggle label="Edit PO" checked={permissions?.editPO || false} onChange={(v) => updatePermission('editPO', v)} icon={Edit} description="Modify Order" />
                                    <PermissionToggle label="Approve PO" checked={permissions?.approvePO || false} onChange={(v) => updatePermission('approvePO', v)} icon={ShieldCheck} description="Authorize Order" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Logistics & Inward Flow</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <PermissionToggle label="View Inwards" checked={permissions?.viewInward || false} onChange={(v) => updatePermission('viewInward', v)} icon={ArrowDownLeft} description="Monitor arrivals" />
                                    <PermissionToggle label="Record Inward" checked={permissions?.createInward || false} onChange={(v) => updatePermission('createInward', v)} icon={Plus} description="Process receipts" />
                                    <PermissionToggle label="Edit Inward" checked={permissions?.editInward || false} onChange={(v) => updatePermission('editInward', v)} icon={Edit} description="Correction logic" />
                                    <PermissionToggle label="Transit View" checked={permissions?.viewMovement || false} onChange={(v) => updatePermission('viewMovement', v)} icon={ArrowLeftRight} description="Logistics history" />
                                    <PermissionToggle label="Record Transit" checked={permissions?.createMovement || false} onChange={(v) => updatePermission('createMovement', v)} icon={ArrowUpRight} description="Execute movements" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-8">Quality Assurance (QC)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <PermissionToggle label="Audit Station" checked={permissions?.viewQC || false} onChange={(v) => updatePermission('viewQC', v)} icon={ClipboardCheck} description="View inspections" />
                                    <PermissionToggle label="Record Audit" checked={permissions?.createQC || false} onChange={(v) => updatePermission('createQC', v)} icon={Plus} description="Execute assessment" />
                                    <PermissionToggle label="Refine Audit" checked={permissions?.editQC || false} onChange={(v) => updatePermission('editQC', v)} icon={Edit} description="Modify assessment" />
                                    <PermissionToggle label="Certify Logic" checked={permissions?.approveQC || false} onChange={(v) => updatePermission('approveQC', v)} icon={ShieldAlert} description="Final authorization" />
                                </div>
                            </div>

                            <div className="col-span-full mt-8">
                                <h3 className="text-xs font-black text-rose-500/30 uppercase tracking-[0.3em] border-b border-rose-50 pb-4 mb-8">Administrative Override</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <PermissionToggle label="System Config" checked={permissions?.accessSettings || false} onChange={(v) => updatePermission('accessSettings', v)} icon={Settings} description="Global parameters" />
                                    <PermissionToggle label="Identity Gov" checked={permissions?.manageUsers || false} onChange={(v) => updatePermission('manageUsers', v)} icon={Users} description="Personnel control" />
                                    <PermissionToggle label="Change History" checked={permissions?.manageChanges || false} onChange={(v) => updatePermission('manageChanges', v)} icon={History} description="Audit trail oversight" />
                                    <PermissionToggle label="Strategic Revert" checked={permissions?.revertChanges || false} onChange={(v) => updatePermission('revertChanges', v)} icon={RotateCcw} description="Rollback capabilities" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-12 shrink-0 border-t border-gray-50 flex justify-between items-center bg-secondary-50/10">
                    <div className="flex items-center gap-3 text-amber-600 font-bold bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-widest">Changes affect real-time access</span>
                    </div>
                    <div className="flex gap-4">
                        <Button variant="ghost" onClick={onClose} className="h-16 px-8 rounded-[1.5rem] font-black text-gray-400">Abort</Button>
                        <Button
                            onClick={() => mutation.mutate(permissions!)}
                            disabled={mutation.isPending || !permissions}
                            className="h-16 px-12 rounded-[1.5rem] bg-gray-900 hover:bg-black text-white font-black shadow-2xl shadow-gray-900/30 flex items-center gap-3 transition-all active:scale-95"
                        >
                            <Save className="w-5 h-5" />
                            {mutation.isPending ? "FLASHING..." : "COMMIT REACH CONFIG"}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
