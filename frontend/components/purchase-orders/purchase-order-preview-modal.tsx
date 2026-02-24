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

            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
              <div className="flex">
                <span className="font-bold text-secondary-500 w-28">PO No.</span>
                <span className="font-bold text-secondary-900">{po.poNo}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-28">Date</span>
                <span className="font-medium text-secondary-800">{format(new Date(po.createdAt), "dd MMM yyyy")}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-28">Vendor</span>
                <span className="font-medium text-secondary-800">{po.vendorName ?? "—"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-28">Delivery</span>
                <span className="font-medium text-secondary-800">{po.deliveryDate ? format(new Date(po.deliveryDate), "dd MMM yyyy") : "—"}</span>
              </div>
              <div className="flex">
                <span className="font-bold text-secondary-500 w-28">Rate</span>
                <span className="font-medium text-secondary-800">{po.rate != null ? `₹ ${Number(po.rate).toLocaleString()}` : "—"}</span>
              </div>
              {po.gstType != null && (
                <>
                  <div className="flex">
                    <span className="font-bold text-secondary-500 w-28">GST type</span>
                    <span className="font-medium text-secondary-800">{po.gstType === GstType.CGST_SGST ? "CGST + SGST" : po.gstType === GstType.IGST ? "IGST" : po.gstType === GstType.UGST ? "UGST" : po.gstType}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-secondary-500 w-28">GST %</span>
                    <span className="font-medium text-secondary-800">{po.gstPercent ?? "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-secondary-500 w-28">GST amount</span>
                    <span className="font-medium text-secondary-800">{po.gstAmount != null ? `₹ ${Number(po.gstAmount).toLocaleString()}` : "—"}</span>
                  </div>
                  <div className="flex">
                    <span className="font-bold text-secondary-500 w-28">Total</span>
                    <span className="font-bold text-secondary-900">{po.totalAmount != null ? `₹ ${Number(po.totalAmount).toLocaleString()}` : "—"}</span>
                  </div>
                </>
              )}
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

            <div className="border border-secondary-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary-100 border-b border-secondary-200">
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase w-12">#</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase">Main Part Name</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase">Current Name</th>
                    <th className="text-left py-3 px-4 font-black text-secondary-700 uppercase">PI Ref</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items?.map((item: { id: number; mainPartName?: string; currentName?: string; piNo?: string }, idx: number) => (
                    <tr key={item.id} className="border-b border-secondary-100 last:border-0">
                      <td className="py-2.5 px-4 font-medium text-secondary-600">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-secondary-900">{item.mainPartName ?? "—"}</td>
                      <td className="py-2.5 px-4 font-medium text-secondary-800">{item.currentName ?? "—"}</td>
                      <td className="py-2.5 px-4 text-secondary-600">{item.piNo ?? "—"}</td>
                    </tr>
                  ))}
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

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #po-document, #po-document * { visibility: visible !important; }
          #po-document { position: absolute !important; left: 0; top: 0; width: 100% !important; }
        }
      `}} />
    </div>
  );
}
