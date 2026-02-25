"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { registerDialog } from "@/lib/dialog-stack";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface QuotationViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** URL path e.g. /storage/po-quotations/xxx.pdf or blob URL for pending files */
  url: string | null;
  /** When url is a blob (pending file), pass file name for type detection */
  fileName?: string | null;
}

function isPdf(url: string, fileName?: string | null): boolean {
  const name = (fileName ?? url).split("?")[0];
  return name.toLowerCase().endsWith(".pdf");
}

function isImage(url: string, fileName?: string | null): boolean {
  const name = (fileName ?? url).split("?")[0].toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => name.endsWith(ext));
}

export function QuotationViewerModal({ isOpen, onClose, url, fileName }: QuotationViewerModalProps) {
  if (!url) return null;

  const fullUrl = url.startsWith("http") || url.startsWith("blob:") ? url : `${API_BASE}${url}`;
  const showPdf = isPdf(url, fileName);
  const showImage = isImage(url, fileName);

  const onCloseRef = useRef(onClose);
  const unregisterRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    // Remove from dialog stack *before* closing so the next Esc closes the underlying dialog (Uploaded quotations), not this viewer again.
    unregisterRef.current?.();
    unregisterRef.current = null;
    onCloseRef.current();
    // Move focus back to main document so next Esc is received by window (Edit PO: PDF iframe can leave focus in wrong place).
    requestAnimationFrame(() => {
      if (document.body && typeof document.body.focus === "function") {
        document.body.setAttribute("tabindex", "-1");
        document.body.focus({ preventScroll: true });
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const cleanup = registerDialog(handleClose);
      unregisterRef.current = cleanup;
      return () => {
        unregisterRef.current = null;
        cleanup();
      };
    }
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen) {
      requestAnimationFrame(() => {
        if (document.body && typeof document.body.focus === "function") {
          document.body.setAttribute("tabindex", "-1");
          document.body.focus({ preventScroll: true });
        }
      });
    }
  }, [isOpen]);

  if (showImage) {
    return (
      <FullScreenImageViewer
        isOpen={isOpen}
        imageSrc={fullUrl}
        onClose={onClose}
        alt="Quotation"
        skipDialogStack
      />
    );
  }

  if (showPdf && isOpen) {
    const pdfContent = (
      <div
        className="fixed inset-0 z-[2000] flex flex-col bg-black/95"
        role="dialog"
        aria-modal="true"
        aria-label="View quotation PDF"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
          <span className="text-sm font-medium text-white truncate max-w-[60%]">{fileName || url.split("/").pop() || "Quotation"}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-lg" title="Close (Esc)">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
          <iframe src={fullUrl} title="Quotation PDF" className="w-full h-full min-h-[80vh] rounded-lg bg-white" />
        </div>
      </div>
    );
    if (typeof document !== "undefined") return createPortal(pdfContent, document.body);
    return pdfContent;
  }

  if (isOpen && !showPdf && !showImage) {
    const fallbackContent = (
      <div className="fixed inset-0 z-[2000] flex flex-col bg-black/95" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
          <span className="text-sm font-medium text-white truncate">{fileName || url.split("/").pop() || "Quotation"}</span>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-lg">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-white/80 text-center">
          <div>
            <p className="font-medium">Preview not available for this file type.</p>
            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary-400 hover:underline">
              Open in new tab
            </a>
          </div>
        </div>
      </div>
    );
    if (typeof document !== "undefined") return createPortal(fallbackContent, document.body);
    return fallbackContent;
  }

  return null;
}
