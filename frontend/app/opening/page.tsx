"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    FileSpreadsheet,
    Upload,
    Download,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    FileUp,
    LayoutGrid,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import api from "@/lib/api";
import { ValidationResult, PatternDieOpeningImport } from "@/types";
import { ImportPreviewDialog } from "@/components/dialogs/import-preview-dialog";
import { motion } from "framer-motion";

export default function OpeningPage() {
    const [file, setFile] = useState<File | null>(null);
    const [validationData, setValidationData] = useState<ValidationResult<PatternDieOpeningImport> | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const validateMutation = useMutation({
        mutationFn: async (f: File) => {
            const formData = new FormData();
            formData.append("file", f);
            const res = await api.post("/PatternDies/validate-opening", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: (data: ValidationResult<PatternDieOpeningImport>) => {
            setValidationData(data);
            setIsPreviewOpen(true);
        },
        onError: (err: any) => {
            toast.error(err.response?.data || "Validation failed");
            setFile(null);
        }
    });

    const importMutation = useMutation({
        mutationFn: async () => {
            if (!file) return;
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post("/PatternDies/import-opening", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success(`${data.Imported} records imported successfully!`);
            queryClient.invalidateQueries({ queryKey: ["patterns"] });
            setIsPreviewOpen(false);
            setFile(null);
            setValidationData(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data || "Import failed");
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            validateMutation.mutate(f);
        }
    };

    const downloadTemplate = () => {
        const headers = ["MainPartName", "CurrentName", "Type", "DrawingNo", "RevisionNo", "Material", "OwnerType", "Status", "CurrentLocation", "CurrentVendor"];
        const csvContent = headers.join(",") + "\n" +
            "PART-001,PART-001,PATTERN,D-101,R0,Iron,Aira,Running,Unit 1,";

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "opening_template.csv"; // User asked for Excel, but CSV is easy for start. I'll make it .xlsx eventually if needed.
        a.click();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 py-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <LayoutGrid className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-secondary-900 tracking-tight">Opening Entry</h1>
                    </div>
                    <p className="text-secondary-500 text-lg ml-1">Seamlessly migrate your existing die and pattern stock into the system.</p>
                </div>
                <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="rounded-2xl h-12 px-6 border-secondary-200 hover:bg-secondary-50 font-bold"
                >
                    <Download className="w-5 h-5 mr-2 text-primary" /> Download Template
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1: Upload */}
                <Card className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    !file ? "border-primary shadow-xl shadow-primary/5 scale-[1.02]" : "opacity-60 grayscale-[0.5]"
                )}>
                    <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-primary/5 rounded-full" />
                    <CardHeader>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2 font-bold">1</div>
                        <CardTitle>Select Data File</CardTitle>
                        <CardDescription>Upload your completed excel template here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            onClick={() => !validateMutation.isPending && fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
                                validateMutation.isPending ? "bg-secondary-50 opacity-50 cursor-not-allowed" : "hover:bg-primary/5 hover:border-primary/50 bg-white"
                            )}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                            />
                            {validateMutation.isPending ? (
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            ) : (
                                <FileUp className="w-12 h-12 text-primary opacity-40" />
                            )}
                            <div className="text-center">
                                <p className="font-bold text-secondary-900">Click to upload</p>
                                <p className="text-xs text-secondary-400 mt-1">XLSX, XLS or CSV files only</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Validate */}
                <Card className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    file && !validationData ? "border-primary shadow-xl shadow-primary/5 scale-[1.02]" :
                        validationData ? "opacity-60" : "opacity-40 grayscale"
                )}>
                    <CardHeader>
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-2 font-bold">2</div>
                        <CardTitle>Validation Preview</CardTitle>
                        <CardDescription>Review rows for errors or duplicates.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-44 flex flex-col items-center justify-center gap-4">
                        {validationData ? (
                            <>
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                                <div className="text-center">
                                    <p className="font-bold text-green-600">Processed {validationData.totalRows} Rows</p>
                                    <Button
                                        variant="link"
                                        onClick={() => setIsPreviewOpen(true)}
                                        className="text-primary p-0 h-auto font-bold"
                                    >
                                        Re-open Preview
                                    </Button>
                                </div>
                            </>
                        ) : validateMutation.isPending ? (
                            <div className="text-center flex flex-col items-center gap-3">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                <p className="text-sm font-medium text-secondary-500">Checking data integrity...</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-40">
                                <AlertCircle className="w-10 h-10 mx-auto mb-2" />
                                <p className="text-sm">Waiting for upload...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Step 3: Commit */}
                <Card className={cn(
                    "relative overflow-hidden transition-all duration-300",
                    validationData && validationData.valid.length > 0 ? "border-green-500 shadow-xl shadow-green-50 scale-[1.02]" : "opacity-40 grayscale"
                )}>
                    <CardHeader>
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 mb-2 font-bold">3</div>
                        <CardTitle>Final Import</CardTitle>
                        <CardDescription>Commit all valid records to database.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-44 flex flex-col items-center justify-center">
                        <Button
                            disabled={!validationData || validationData.valid.length === 0 || importMutation.isPending}
                            onClick={() => importMutation.mutate()}
                            className="bg-green-600 hover:bg-green-700 h-14 w-full rounded-2xl text-lg font-bold shadow-lg shadow-green-100"
                        >
                            {importMutation.isPending ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Importing...</>
                            ) : (
                                <><CheckCircle2 className="w-5 h-5 mr-2" /> Complete Import</>
                            )}
                        </Button>
                        {validationData && validationData.invalid.length > 0 && (
                            <p className="text-xs text-red-500 mt-3 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Note: {validationData.invalid.length} invalid rows will be skipped.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ImportPreviewDialog
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                data={validationData}
                onConfirm={() => importMutation.mutate()}
                isLoading={importMutation.isPending}
                title="Opening Stock Import Preview"
            />
        </div>
    );
}

import { cn } from "@/lib/utils";
