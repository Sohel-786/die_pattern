"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog-legacy";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    AlertCircle,
    Copy,
    Database,
    XCircle,
    Info,
    Loader2,
    FileSpreadsheet
} from "lucide-react";
import { ValidationResult } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImportPreviewDialogProps<T> {
    isOpen: boolean;
    onClose: () => void;
    data: ValidationResult<T> | null;
    onConfirm: () => void;
    isLoading: boolean;
    title?: string;
}

type TabType = "valid" | "duplicates" | "alreadyExists" | "invalid";

export function ImportPreviewDialog<T extends Record<string, any>>({
    isOpen,
    onClose,
    data,
    onConfirm,
    isLoading,
    title = "Excel Import Preview",
}: ImportPreviewDialogProps<T>) {
    const [activeTab, setActiveTab] = useState<TabType>("valid");

    useEffect(() => {
        if (isOpen) {
            setActiveTab("valid");
        }
    }, [isOpen]);

    if (!data) return null;

    const tabs: { id: TabType; label: string; count: number; icon: any; color: string; bgColor: string }[] = [
        {
            id: "valid",
            label: "Valid Records",
            count: data.valid.length,
            icon: CheckCircle2,
            color: "text-green-600",
            bgColor: "bg-green-50",
        },
        {
            id: "duplicates",
            label: "Duplicates (File)",
            count: data.duplicates.length,
            icon: Copy,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
        },
        {
            id: "alreadyExists",
            label: "Already Exists",
            count: data.alreadyExists.length,
            icon: Database,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
        },
        {
            id: "invalid",
            label: "Invalid Records",
            count: data.invalid.length,
            icon: XCircle,
            color: "text-red-600",
            bgColor: "bg-red-50",
        },
    ];

    const getRecordsForTab = () => {
        switch (activeTab) {
            case "valid": return data.valid;
            case "duplicates": return data.duplicates;
            case "alreadyExists": return data.alreadyExists;
            case "invalid": return data.invalid;
            default: return [];
        }
    };

    const records = getRecordsForTab();

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">{title}</DialogTitle>
                            <DialogDescription>Review the processed records before confirming the import.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex px-6 border-b bg-secondary-50/50">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all",
                                    activeTab === tab.id
                                        ? tab.color
                                        : "text-secondary-400 hover:text-secondary-600"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                <span className={cn(
                                    "ml-1 px-2 py-0.5 rounded-full text-[10px]",
                                    activeTab === tab.id ? tab.bgColor : "bg-secondary-100"
                                )}>
                                    {tab.count}
                                </span>
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className={cn("absolute bottom-0 left-0 right-0 h-0.5", tab.id === 'valid' ? 'bg-green-600' :
                                            tab.id === 'invalid' ? 'bg-red-600' :
                                                tab.id === 'duplicates' ? 'bg-amber-600' : 'bg-blue-600')}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Table Area */}
                    <div className="flex-1 overflow-auto p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="border rounded-2xl overflow-hidden bg-white shadow-sm"
                            >
                                {records.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-secondary-50 border-b sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-4 py-4 font-bold text-secondary-900 w-16 text-center">Row</th>
                                                    {Object.keys(records[0].data).map((key) => (
                                                        <th key={key} className="px-4 py-4 font-bold text-secondary-900 capitalize min-w-[120px]">
                                                            {key.replace(/([A-Z])/g, " $1")}
                                                        </th>
                                                    ))}
                                                    {activeTab !== "valid" && (
                                                        <th className="px-4 py-4 font-bold text-red-600 min-w-[200px]">Validation Issue</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {records.map((entry, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-secondary-50/50 transition-colors">
                                                        <td className="px-4 py-4 text-secondary-400 text-center font-medium">#{entry.row}</td>
                                                        {Object.values(entry.data).map((val: any, vIdx) => (
                                                            <td key={vIdx} className="px-4 py-4 text-secondary-700 font-medium">
                                                                {typeof val === "boolean" ? (
                                                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", val ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                        {val ? "Yes" : "No"}
                                                                    </span>
                                                                ) : val || "—"}
                                                            </td>
                                                        ))}
                                                        {activeTab !== "valid" && (
                                                            <td className="px-4 py-4 text-red-500 font-bold text-xs italic">
                                                                <div className="flex items-center gap-1.5">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    {entry.message}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-secondary-400">
                                        <Info className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="text-xl font-medium">No records to display here.</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-secondary-50 border-t flex items-center justify-between sm:justify-between">
                    <div className="text-sm font-medium text-secondary-600">
                        Total rows: <span className="text-secondary-900 font-bold">{data.totalRows}</span>
                        <span className="mx-3 text-secondary-300">|</span>
                        Ready to import: <span className="text-green-600 font-bold">{data.valid.length}</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6">Cancel</Button>
                        <Button
                            onClick={onConfirm}
                            disabled={data.valid.length === 0 || isLoading}
                            className="bg-green-600 hover:bg-green-700 rounded-xl h-11 px-8 shadow-lg shadow-green-200"
                        >
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Import Valid Records ({data.valid.length})</>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
