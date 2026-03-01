"use client";

import { useState, useEffect } from "react";
import { Eye, Trash2, FileText, Download } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QuotationViewerModal } from "../purchase-orders/quotation-viewer-modal";

function BlobAttachmentViewer({ file, onClose }: { file: File; onClose: () => void }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return (
        <QuotationViewerModal
            isOpen={!!objectUrl}
            onClose={onClose}
            url={objectUrl!}
            fileName={file.name}
        />
    );
}

export interface JobWorkAttachmentListDialogProps {
    open: boolean;
    onClose: () => void;
    /** Already-uploaded URLs (from server when editing) */
    urls: string[];
    /** URLs user chose to remove (still shown in urls but will be deleted on save) */
    urlsToDelete: string[];
    /** Files selected but not yet uploaded */
    pendingFiles: File[];
    onRemoveUrl: (url: string) => void;
    onRemovePending: (index: number) => void;
    isReadOnly?: boolean;
}

function fileNameFromUrl(url: string): string {
    const part = url.split("/").pop() || "";
    return decodeURIComponent(part);
}

export function JobWorkAttachmentListDialog({
    open,
    onClose,
    urls,
    urlsToDelete,
    pendingFiles,
    onRemoveUrl,
    onRemovePending,
    isReadOnly = false,
}: JobWorkAttachmentListDialogProps) {
    const [viewUrl, setViewUrl] = useState<string | null>(null);
    const [viewFile, setViewFile] = useState<File | null>(null);

    const displayUrls = urls.filter((u) => !urlsToDelete.includes(u));
    const total = displayUrls.length + pendingFiles.length;

    return (
        <>
            <Dialog isOpen={open} onClose={onClose} title="Job Work Attachments" size="md">
                <div className="space-y-3 max-h-[60vh] overflow-auto p-1">
                    {total === 0 ? (
                        <div className="py-12 text-center opacity-30">
                            <FileText className="w-12 h-12 mx-auto mb-2 text-secondary-400" />
                            <p className="font-black uppercase tracking-widest text-[10px]">No attachments found</p>
                        </div>
                    ) : (
                        <>
                            {displayUrls.map((url) => (
                                <div
                                    key={url}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-secondary-200 bg-secondary-50/30 px-4 py-3 group transition-all hover:bg-white hover:shadow-sm"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-secondary-100 flex items-center justify-center shrink-0">
                                            {url.toLowerCase().endsWith('.pdf') ? (
                                                <FileText className="w-5 h-5 text-rose-500" />
                                            ) : (
                                                <Eye className="w-5 h-5 text-primary-500" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-secondary-900 truncate tracking-tight" title={fileNameFromUrl(url)}>
                                                {fileNameFromUrl(url)}
                                            </span>
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Server File</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 text-primary-600 hover:bg-primary-50 rounded-lg"
                                            onClick={() => setViewUrl(url)}
                                            title="View"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {!isReadOnly && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                onClick={() => onRemoveUrl(url)}
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {pendingFiles.map((file, idx) => (
                                <div
                                    key={`${file.name}-${idx}`}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50/20 px-4 py-3 group transition-all"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-primary-100 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-primary-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-secondary-900 truncate tracking-tight" title={file.name}>
                                                    {file.name}
                                                </span>
                                                <span className="text-[10px] font-black bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded uppercase tracking-widest">Pending</span>
                                            </div>
                                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Local File</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0 text-primary-600 hover:bg-primary-50 rounded-lg"
                                            onClick={() => setViewFile(file)}
                                            title="Preview"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {!isReadOnly && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 w-9 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                onClick={() => onRemovePending(idx)}
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-secondary-100">
                    <Button variant="outline" onClick={onClose} className="h-10 px-8 font-black text-xs uppercase tracking-widest rounded-xl">
                        Close
                    </Button>
                </div>
            </Dialog>
            <QuotationViewerModal isOpen={!!viewUrl} onClose={() => setViewUrl(null)} url={viewUrl} />
            {viewFile && (
                <BlobAttachmentViewer file={viewFile} onClose={() => setViewFile(null)} />
            )}
        </>
    );
}
