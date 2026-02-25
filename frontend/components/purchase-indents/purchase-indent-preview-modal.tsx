"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Loader2 } from "lucide-react";
import { registerDialog, isTopDialog } from "@/lib/dialog-stack";
import api from "@/lib/api";
import { PurchaseIndent, PurchaseIndentStatus, PurchaseIndentType } from "@/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const TYPE_LABELS: Record<PurchaseIndentType, string> = {
  [PurchaseIndentType.New]: "New",
  [PurchaseIndentType.Repair]: "Repair",
  [PurchaseIndentType.Correction]: "Correction",
  [PurchaseIndentType.Modification]: "Modification",
};

interface PurchaseIndentPreviewModalProps {
  piId: number;
  onClose: () => void;
}

export function PurchaseIndentPreviewModal({ piId, onClose }: PurchaseIndentPreviewModalProps) {
  const { data: pi, isLoading } = useQuery<PurchaseIndent>({
    queryKey: ["purchase-indent", piId],
    queryFn: async () => {
      const res = await api.get(`/purchase-indents/${piId}`);
      return res.data.data;
    },
    enabled: !!piId,
  });

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (piId) {
      return registerDialog(handleClose);
    }
  }, [piId, handleClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTopDialog(handleClose)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose, onClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!piId) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-white">
      {/* Toolbar - hidden when printing */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
        <h2 className="text-lg font-bold text-secondary-900">Purchase Indent – Preview</h2>
        <div className="flex items-center gap-2">
          {pi?.status === PurchaseIndentStatus.Approved && (
            <Button
              onClick={handlePrint}
              className="bg-primary-600 hover:bg-primary-700 text-white font-semibold"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
          {pi?.status !== PurchaseIndentStatus.Approved && (
            <span className="text-xs text-amber-600 font-medium px-3 py-1.5 bg-amber-50 rounded-lg">
              Print is available only after approval
            </span>
          )}
          <Button variant="outline" onClick={onClose} className="border-secondary-300">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      {/* Document area - print-optimized */}
      <div className="flex-1 overflow-auto p-6 md:p-10 print:p-0 print:overflow-visible">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          </div>
        ) : pi ? (
          <div id="pi-document" className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none print:max-w-none">
            {/* Header */}
            <div className="border-b-2 border-secondary-800 pb-4 mb-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl font-black text-secondary-900 uppercase tracking-tight">
                    {pi.companyName || "Company Name"}
                  </h1>
                  {pi.locationName && (
                    <p className="text-sm font-semibold text-secondary-600 mt-1">{pi.locationName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider">Document</p>
                  <p className="text-lg font-black text-secondary-900">PURCHASE INDENT</p>
                </div>
              </div>
            </div>

            {/* PI details */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
              <div className="flex">
                <span className="font-bold text-secondary-500 w-32">PI No.</span>
                <span className="font-bold text-secondary-900">{pi.piNo}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-32">Date</span>
                <span className="font-medium text-secondary-800">{format(new Date(pi.createdAt), "dd MMM yyyy")}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-32">Type</span>
                <span className="font-medium text-secondary-800">{TYPE_LABELS[pi.type] ?? pi.type}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-32">Created by</span>
                <span className="font-medium text-secondary-800">{pi.creatorName}</span>
              </div>
            </div>

            {/* Items table */}
            <div className="border border-secondary-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary-100 border-b border-secondary-200">
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase tracking-tight w-12">#</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase tracking-tight">Main Part Name</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase tracking-tight">Current Name</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase tracking-tight">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {pi.items?.map((item: { id: number; mainPartName?: string; currentName?: string; itemTypeName?: string }, idx: number) => (
                    <tr key={item.id} className="border-b border-secondary-100 last:border-0 hover:bg-secondary-50/50">
                      <td className="py-2.5 px-4 font-medium text-secondary-600">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-secondary-900">{item.mainPartName ?? "—"}</td>
                      <td className="py-2.5 px-4 font-medium text-secondary-800">{item.currentName ?? "—"}</td>
                      <td className="py-2.5 px-4 text-secondary-600">{item.itemTypeName ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remarks */}
            {pi.remarks && (
              <div className="mb-6 p-4 bg-secondary-50 rounded-lg border border-secondary-100">
                <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Remarks</p>
                <p className="text-sm text-secondary-800">{pi.remarks}</p>
              </div>
            )}

            {/* Approval section - show when Approved */}
            {pi.status === PurchaseIndentStatus.Approved && (pi.approverName || pi.approvedAt) && (
              <div className="mt-8 pt-6 border-t-2 border-secondary-200">
                <div className="flex justify-end gap-12">
                  <div className="text-center">
                    <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Approved by</p>
                    <p className="text-sm font-semibold text-secondary-900">{pi.approverName ?? "—"}</p>
                    {pi.approvedAt && (
                      <p className="text-xs text-secondary-500 mt-0.5">{format(new Date(pi.approvedAt), "dd MMM yyyy HH:mm")}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Status badge for non-approved (visible on screen only) */}
            {pi.status !== PurchaseIndentStatus.Approved && (
              <div className="mt-6 pt-4 border-t border-secondary-100 print:border-0">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Status: {pi.status === PurchaseIndentStatus.Draft ? "Draft" : pi.status === PurchaseIndentStatus.Pending ? "Pending Approval" : "Rejected"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-500">Could not load purchase indent.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden !important; }
          #pi-document, #pi-document * { visibility: visible !important; }
          #pi-document { position: absolute !important; left: 0; top: 0; width: 100% !important; }
        }
      `}} />
    </div>
  );
}
