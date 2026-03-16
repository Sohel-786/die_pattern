"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Printer } from "lucide-react";
import { registerDialog } from "@/lib/dialog-stack";
import api from "@/lib/api";
import type { JobWorkPrintData } from "@/types";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDate, formatRate } from "@/lib/utils";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.77953;

interface JobWorkPreviewModalProps {
  jwId: number;
  onClose: () => void;
}

export function JobWorkPreviewModal({ jwId, onClose }: JobWorkPreviewModalProps) {
  const { data: printData, isLoading } = useQuery<JobWorkPrintData>({
    queryKey: ["job-work-print", jwId],
    queryFn: async () => {
      const res = await api.get(`/job-works/${jwId}/print`);
      const d = res.data?.data;
      if (!d) throw new Error("No data");
      return d as JobWorkPrintData;
    },
    enabled: !!jwId,
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
    if (jwId) {
      return registerDialog(handleClose);
    }
  }, [jwId, handleClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!jwId) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jw-preview-title"
    >
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
        <h2 id="jw-preview-title" className="text-lg font-bold text-secondary-900">Job Work Challan – Preview</h2>
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
            className="jw-preview-scaled print:scale-100"
            style={{
              transform: `scale(${previewScale})`,
              transformOrigin: "top center",
            }}
          >
            <div id="jw-print-document" className="jw-print-container">
            <div className="jw-page">
              <div className="jw-page-body">
                <div className="jw-header-row">
                  <div className="jw-header-left">
                    <h1 className="jw-company-name">{printData.companyName}</h1>
                    <p className="jw-company-address">{printData.companyAddress}</p>
                    <p className="jw-gst">GST NO : {printData.companyGstNo}</p>
                  </div>
                  <div className="jw-doc-box">
                    <div>Doc No. : {printData.documentNo}</div>
                    <div>Rev. No. : {printData.revisionNo}</div>
                    <div>Rev. Date : {printData.revisionDate ? formatDate(printData.revisionDate) : "-"}</div>
                    <div>Page No. : Page 1 of 1</div>
                  </div>
                </div>

                <h2 className="jw-title">JOB WORK CHALLAN</h2>

                <div className="jw-to-order-row">
                  <div className="jw-to-block">
                    <p className="jw-to-label">CONSIGNED TO,</p>
                    <p><strong>Party Code:</strong> {printData.toPartyCode || "-"}</p>
                    <p className="jw-party-name">{printData.toPartyName}</p>
                    <p className="jw-party-address">{printData.toPartyAddress}</p>
                    <p><strong>GST NO</strong> {printData.toPartyGstNo}</p>
                  </div>
                  <div className="jw-order-details">
                    <div><strong>JW NO. :</strong> {printData.jobWorkNo}</div>
                    <div><strong>Date :</strong> {formatDateTime(printData.createdAt)}</div>
                    <div><strong>Description :</strong> {printData.description || "-"}</div>
                    <div><strong>Remarks :</strong> {printData.remarks || "-"}</div>
                  </div>
                </div>

                <table className="jw-items-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Part No.</th>
                      <th>Product Name</th>
                      <th>Type</th>
                      <th>Material</th>
                      <th>Drawing No.</th>
                      <th>Rev</th>
                      <th>Rate (INR)</th>
                      <th>GST %</th>
                      <th>Remarks</th>
                      <th>Will Change Name</th>
                      <th>Proposed New Name</th>
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
                        <td style={{ textAlign: "right" }}>{row.rate != null ? formatRate(row.rate) : "—"}</td>
                        <td style={{ textAlign: "right" }}>{row.gstPercent != null ? row.gstPercent.toFixed(1) : "—"}</td>
                        <td>{row.remarks}</td>
                        <td>{row.willChangeName ? "Yes" : "No"}</td>
                        <td>{row.proposedNewName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="jw-signatures">
                <div className="jw-sig-cell">
                  <div className="jw-sig-line" />
                  <span>Prepared By</span>
                  <span className="jw-sig-name">{printData.preparedBy || "-"}</span>
                </div>
                <div className="jw-sig-cell">
                  <div className="jw-sig-line" />
                  <span>Authorised By</span>
                  <span className="jw-sig-name">&nbsp;</span>
                </div>
                <div className="jw-sig-cell">
                  <div className="jw-sig-line" />
                  <span>Receiver&apos;s Signature</span>
                  <span className="jw-sig-name">(Seal &amp; Sign)</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-500">Could not load job work challan.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; min-height: 297mm !important; }
            body * { visibility: hidden !important; }
            #jw-print-document, #jw-print-document * { visibility: visible !important; }
            #jw-print-document {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; height: 297mm !important; min-height: 297mm !important;
              margin: 0 !important; padding: 0 !important;
              background: #fff !important; box-sizing: border-box !important;
            }
            .jw-preview-scaled { transform: none !important; }
          }
          .jw-preview-scaled { display: inline-block; }
          .jw-print-container {
            font-family: Arial, sans-serif; font-size: 11px; color: #000;
            width: 210mm; height: 297mm; max-width: 210mm; margin: 0 auto; background: #fff;
            display: flex; flex-direction: column;
          }
          .jw-page {
            display: flex; flex-direction: column; flex: 1; min-height: 0;
            padding: 12px 14px; border: 1px solid #000; box-sizing: border-box;
          }
          .jw-page-body { flex: 1 1 auto; min-height: 0; }
          .jw-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #000; }
          .jw-header-left { flex: 1; }
          .jw-company-name { margin: 0; font-size: 16px; font-weight: bold; }
          .jw-company-address { margin: 2px 0; font-size: 10px; }
          .jw-gst { margin: 0; font-size: 10px; }
          .jw-doc-box { border: 1px solid #000; padding: 6px 10px; font-size: 11px; min-width: 120px; }
          .jw-title { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; }
          .jw-to-order-row { display: flex; gap: 24px; margin-bottom: 12px; }
          .jw-to-block { flex: 1; font-size: 10px; }
          .jw-to-label { font-weight: bold; margin: 0 0 4px 0; }
          .jw-party-name { font-weight: bold; margin: 4px 0; }
          .jw-party-address { margin: 2px 0; }
          .jw-order-details { width: 200px; font-size: 10px; flex-shrink: 0; }
          .jw-order-details div { margin-bottom: 2px; }
          .jw-items-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 0; }
          .jw-items-table th, .jw-items-table td { border: 1px solid #000; padding: 4px 6px; }
          .jw-items-table th { background: #f2f2f2; font-weight: bold; }
          .jw-signatures {
            flex-shrink: 0; margin-top: auto;
            display: flex; justify-content: space-between; align-items: flex-end;
            padding: 14px 0 8px 0; border-top: 1px solid #000;
          }
          .jw-sig-cell { display: flex; flex-direction: column; align-items: center; width: 30%; text-align: center; }
          .jw-sig-line { border-top: 1px solid #000; width: 100%; height: 28px; margin-bottom: 4px; min-width: 80px; }
          .jw-sig-cell span { font-size: 9px; }
          .jw-sig-name { font-size: 10px; font-weight: bold; margin-top: 2px; }
        `
      }} />
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
