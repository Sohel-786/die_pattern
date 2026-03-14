"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Printer } from "lucide-react";
import { registerDialog } from "@/lib/dialog-stack";
import api from "@/lib/api";
import type { TransferPrintData } from "@/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.77953;

interface TransferPreviewModalProps {
  transferId: number;
  onClose: () => void;
}

export function TransferPreviewModal({ transferId, onClose }: TransferPreviewModalProps) {
  const { data: printData, isLoading } = useQuery<TransferPrintData>({
    queryKey: ["transfer-print", transferId],
    queryFn: async () => {
      const res = await api.get(`/transfers/${transferId}/print`);
      const d = res.data?.data;
      if (!d) throw new Error("No data");
      return d as TransferPrintData;
    },
    enabled: !!transferId,
  });

  const onCloseRef = useRef(onClose);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!printData || !viewportRef.current) return;
    const el = viewportRef.current;
    const docW = A4_WIDTH_MM * MM_TO_PX;
    const docH = A4_HEIGHT_MM * MM_TO_PX;
    const padding = 24;
    const updateScale = () => {
      if (!el) return;
      const w = Math.max(1, el.clientWidth - padding * 2);
      const h = Math.max(1, el.clientHeight - padding * 2);
      const scale = Math.min(w / docW, h / docH, 1);
      setPreviewScale(scale > 0 ? scale : 1);
    };
    const raf = requestAnimationFrame(() => updateScale());
    const ro = new ResizeObserver(() => requestAnimationFrame(updateScale));
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [printData]);

  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (transferId) {
      return registerDialog(handleClose);
    }
  }, [transferId, handleClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!transferId) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tr-preview-title"
    >
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
        <h2 id="tr-preview-title" className="text-lg font-bold text-secondary-900">Transfer Entry – Preview</h2>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={onClose} className="border-secondary-300">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="flex-1 min-h-0 w-full overflow-auto p-4 print:p-0 print:overflow-visible print:bg-white flex items-start justify-center bg-secondary-100/30"
      >
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px] w-full">
            <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : printData ? (
          <div
            className="tr-preview-scaled print:scale-100"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            <div id="tr-print-document" className="tr-print-container">
            <div className="tr-page">
              <div className="tr-page-body">
                <div className="tr-header-row">
                  <div className="tr-header-left">
                    <h1 className="tr-company-name">{printData.companyName}</h1>
                    <p className="tr-company-address">{printData.companyAddress}</p>
                    <p className="tr-gst">GST NO : {printData.companyGstNo}</p>
                  </div>
                  <div className="tr-doc-box">
                    <div>Doc No. : {printData.documentNo}</div>
                    <div>Rev. No. : {printData.revisionNo}</div>
                    <div>Rev. Date : {printData.revisionDate ? formatDate(printData.revisionDate) : "-"}</div>
                    <div>Page No. : Page 1 of 1</div>
                  </div>
                </div>

                <h2 className="tr-title">TRANSFER ENTRY</h2>

                <div className="tr-to-order-row">
                  <div className="tr-to-block">
                    <p><strong>From:</strong> {printData.fromPartyName}</p>
                    <p><strong>To:</strong> {printData.toPartyName}</p>
                    <p><strong>Out For:</strong> {printData.outFor || "-"}</p>
                    <p><strong>Reason:</strong> {printData.reasonDetails || "-"}</p>
                    <p><strong>Vehicle No:</strong> {printData.vehicleNo || "-"}</p>
                    <p><strong>Person:</strong> {printData.personName || "-"}</p>
                  </div>
                  <div className="tr-order-details">
                    <div><strong>Transfer No. :</strong> {printData.transferNo}</div>
                    <div><strong>Date :</strong> {formatDate(printData.transferDate)}</div>
                    <div><strong>Remarks :</strong> {printData.remarks || "-"}</div>
                  </div>
                </div>

                <table className="tr-items-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Part No.</th>
                      <th>Product Name</th>
                      <th>Type</th>
                      <th>Material</th>
                      <th>Drawing No.</th>
                      <th>Rev</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.rows.map((row) => (
                      <tr key={row.srNo}>
                        <td>{row.srNo}</td>
                        <td>{row.partNo}</td>
                        <td>{row.productName}</td>
                        <td>{row.itemTypeName}</td>
                        <td>{row.materialName}</td>
                        <td>{row.drawingNo}</td>
                        <td>{row.revisionNo}</td>
                        <td>{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tr-signatures">
                <div className="tr-sig-cell">
                  <div className="tr-sig-line" />
                  <span>Prepared By</span>
                  <span className="tr-sig-name">{printData.preparedBy || "-"}</span>
                </div>
                <div className="tr-sig-cell">
                  <div className="tr-sig-line" />
                  <span>Authorised By</span>
                  <span className="tr-sig-name">&nbsp;</span>
                </div>
                <div className="tr-sig-cell">
                  <div className="tr-sig-line" />
                  <span>Receiver&apos;s Signature</span>
                  <span className="tr-sig-name">(Seal &amp; Sign)</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-500">Could not load transfer entry.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; min-height: 297mm !important; }
            body * { visibility: hidden !important; }
            #tr-print-document, #tr-print-document * { visibility: visible !important; }
            #tr-print-document {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; height: 297mm !important; min-height: 297mm !important;
              margin: 0 !important; padding: 0 !important;
              background: #fff !important; box-sizing: border-box !important;
            }
            .tr-preview-scaled { transform: none !important; }
          }
          .tr-preview-scaled { display: inline-block; }
          .tr-print-container {
            font-family: Arial, sans-serif; font-size: 11px; color: #000;
            width: 210mm; height: 297mm; max-width: 210mm; margin: 0 auto; background: #fff;
            display: flex; flex-direction: column;
          }
          .tr-page {
            display: flex; flex-direction: column; flex: 1; min-height: 0;
            padding: 12px 14px; border: 1px solid #000; box-sizing: border-box;
          }
          .tr-page-body { flex: 1 1 auto; min-height: 0; }
          .tr-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #000; }
          .tr-header-left { flex: 1; }
          .tr-company-name { margin: 0; font-size: 16px; font-weight: bold; }
          .tr-company-address { margin: 2px 0; font-size: 10px; }
          .tr-gst { margin: 0; font-size: 10px; }
          .tr-doc-box { border: 1px solid #000; padding: 6px 10px; font-size: 11px; min-width: 120px; }
          .tr-title { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }
          .tr-to-order-row { display: flex; gap: 24px; margin-bottom: 12px; }
          .tr-to-block { flex: 1; font-size: 10px; }
          .tr-to-block p { margin: 2px 0; }
          .tr-order-details { width: 200px; font-size: 10px; flex-shrink: 0; }
          .tr-order-details div { margin-bottom: 2px; }
          .tr-items-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 0; }
          .tr-items-table th, .tr-items-table td { border: 1px solid #000; padding: 4px 6px; }
          .tr-items-table th { background: #f2f2f2; font-weight: bold; }
          .tr-signatures {
            flex-shrink: 0; margin-top: auto;
            display: flex; justify-content: space-between; align-items: flex-end;
            padding: 14px 0 8px 0; border-top: 1px solid #000;
          }
          .tr-sig-cell { display: flex; flex-direction: column; align-items: center; width: 30%; text-align: center; }
          .tr-sig-line { border-top: 1px solid #000; width: 100%; height: 28px; margin-bottom: 4px; min-width: 80px; }
          .tr-sig-cell span { font-size: 9px; }
          .tr-sig-name { font-size: 10px; font-weight: bold; margin-top: 2px; }
        `
      }} />
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
