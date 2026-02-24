"use client";

import { useQuery } from "@tanstack/react-query";
import { X, Printer } from "lucide-react";
import api from "@/lib/api";
import { PO, PoStatus, GstType } from "@/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface PurchaseOrderPreviewModalProps {
  poId: number;
  onClose: () => void;
}

export function PurchaseOrderPreviewModal({ poId, onClose }: PurchaseOrderPreviewModalProps) {
  const { data: po, isLoading } = useQuery<PO>({
    queryKey: ["purchase-order", poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}`);
      return res.data.data;
    },
    enabled: !!poId,
  });

  const handlePrint = () => {
    window.print();
  };

  if (!poId) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col bg-white">
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
        <h2 className="text-lg font-bold text-secondary-900">Purchase Order – Preview</h2>
        <div className="flex items-center gap-2">
          {po?.status === PoStatus.Approved && (
            <Button onClick={handlePrint} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
          {po?.status !== PoStatus.Approved && (
            <span className="text-xs text-amber-600 font-medium px-3 py-1.5 bg-amber-50 rounded-lg">
              Print available only after approval
            </span>
          )}
          <Button variant="outline" onClick={onClose} className="border-secondary-300">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-10 print:p-0">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : po ? (
          <div id="po-document" className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none">
            <div className="border-b-2 border-secondary-800 pb-4 mb-6">
              <h1 className="text-2xl font-black text-secondary-900 uppercase tracking-tight">Purchase Order</h1>
              <p className="text-sm font-semibold text-secondary-600 mt-1">{po.poNo}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Order No</span>
                <span className="font-bold text-secondary-900">{po.poNo}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Date of Issue</span>
                <span className="font-bold text-secondary-900">{format(new Date(po.createdAt), "dd MMM yyyy")}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Work Priority</span>
                <span className="font-bold text-primary-600 uppercase italic">{po.purchaseType || "Regular"}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Expected Delivery</span>
                <span className="font-bold text-secondary-900">{po.deliveryDate ? format(new Date(po.deliveryDate), "dd MMM yyyy") : "TBD"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Supplier / Vendor</span>
                <span className="font-bold text-secondary-900">{po.vendorName ?? "—"}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black text-secondary-500 uppercase tracking-widest">Quotation Ref No</span>
                <span className="font-bold text-secondary-900 uppercase">{po.quotationNo || "N/A"}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8 py-4 border-y border-secondary-100 italic">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Taxable Value</span>
                <span className="text-lg font-bold text-secondary-900 tracking-tight">₹ {po.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col text-center">
                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">GST ({po.gstPercent}%)</span>
                <span className="text-lg font-bold text-secondary-900 tracking-tight">₹ {po.gstAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">PO Grand Total</span>
                <span className="text-xl font-black text-primary-700 tracking-tighter">₹ {po.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            {(po.quotationUrls?.length ?? 0) > 0 && (
              <div className="mb-6 p-4 bg-secondary-50 rounded-lg border border-secondary-100">
                <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-2">Quotation attachments</p>
                <ul className="text-sm text-secondary-700 space-y-1">
                  {po.quotationUrls!.map((url, i) => {
                    const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || window.location.origin) : "";
                    return (
                      <li key={i}>
                        <a href={url.startsWith("http") ? url : `${base}${url}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                          {url.split("/").pop() ?? url}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="border border-secondary-200 rounded-2xl overflow-hidden mb-8 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary-50 border-b border-secondary-200">
                    <th className="text-left py-4 px-6 font-black text-secondary-500 uppercase tracking-widest w-12">#</th>
                    <th className="text-left py-4 px-6 font-black text-secondary-500 uppercase tracking-widest">Nomenclature & Technical Specs</th>
                    <th className="text-right py-4 px-4 font-black text-secondary-500 uppercase tracking-widest w-28">Rate (₹)</th>
                    <th className="text-right py-4 px-6 font-black text-secondary-500 uppercase tracking-widest w-32">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {po.items?.map((item: any, idx: number) => {
                    const rate = item.rate ?? 0;
                    return (
                      <tr key={item.id} className="hover:bg-secondary-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-secondary-400">{idx + 1}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-secondary-900 uppercase">{item.currentName ?? "—"}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-secondary-500 uppercase tracking-tight">{item.mainPartName ?? "—"}</span>
                              <span className="text-[10px] text-primary-600 font-black italic uppercase">{item.materialName}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-secondary-400">
                              <span className="uppercase">DWG: {item.drawingNo || "N/A"}</span>
                              <span>•</span>
                              <span className="uppercase">REV: {item.revisionNo || "0"}</span>
                              <span>•</span>
                              <span className="uppercase">PI Reference: {item.piNo || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-secondary-600 tabular-nums">{rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-6 text-right font-black text-secondary-900 tabular-nums">
                          {rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {po.remarks && (
              <div className="mb-6 p-4 bg-secondary-50 rounded-lg border border-secondary-100">
                <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Remarks</p>
                <p className="text-sm text-secondary-800">{po.remarks}</p>
              </div>
            )}

            {po.status === PoStatus.Approved && (po.approverName || po.approvedAt) && (
              <div className="mt-8 pt-6 border-t-2 border-secondary-200">
                <div className="flex justify-end">
                  <div className="text-center">
                    <p className="text-xs font-bold text-secondary-500 uppercase tracking-wider mb-1">Approved by</p>
                    <p className="text-sm font-semibold text-secondary-900">{po.approverName ?? "—"}</p>
                    {po.approvedAt && (
                      <p className="text-xs text-secondary-500 mt-0.5">{format(new Date(po.approvedAt), "dd MMM yyyy HH:mm")}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-500">Could not load purchase order.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden !important; }
          #po-document, #po-document * { visibility: visible !important; }
          #po-document { position: absolute !important; left: 0; top: 0; width: 100% !important; }
        }
      `}} />
    </div>
  );
}
