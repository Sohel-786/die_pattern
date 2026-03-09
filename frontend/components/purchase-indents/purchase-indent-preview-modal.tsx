"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Loader2, FileDown } from "lucide-react";
import { registerDialog } from "@/lib/dialog-stack";
import api from "@/lib/api";
import { PurchaseIndentPrintData } from "@/types";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface PurchaseIndentPreviewModalProps {
  piId: number;
  onClose: () => void;
}

export function PurchaseIndentPreviewModal({ piId, onClose }: PurchaseIndentPreviewModalProps) {
  const printDocRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { data: printData, isLoading } = useQuery<PurchaseIndentPrintData>({
    queryKey: ["purchase-indent-print", piId],
    queryFn: async () => {
      const res = await api.get(`/purchase-indents/${piId}/print`);
      const d = res.data?.data;
      if (!d) throw new Error("No data");
      return d as PurchaseIndentPrintData;
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = useCallback(async () => {
    const el = printDocRef.current;
    if (!el || !printData) return;
    setPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      } as any);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentW = pageW - 2 * margin;
      const contentH = pageH - 2 * margin;
      pdf.addImage(imgData, "JPEG", margin, margin, contentW, contentH);
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("PDF opened in new tab");
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF. Try Print instead.");
    } finally {
      setPdfLoading(false);
    }
  }, [printData]);

  if (!piId) return null;

  const content = (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-gray-100" role="dialog" aria-modal="true" aria-labelledby="pi-preview-title">
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-white shadow-sm print:hidden">
        <h2 id="pi-preview-title" className="text-lg font-bold text-gray-900">Purchase Indent Register – Preview</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPDF}
            disabled={!printData || pdfLoading}
            variant="outline"
            className="border-gray-300 gap-2"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            View / Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-primary-600 hover:bg-primary-700 text-white font-semibold gap-2">
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" onClick={onClose} className="border-gray-300">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible flex items-start justify-center min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px] w-full">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
          </div>
        ) : printData ? (
          <div id="pi-print-document" ref={printDocRef} className="print-container">
            <div className="page">
              {/* HEADER ROW 1: 75% company/register + 25% doc box */}
              <div className="header-row-1">
                <div className="header-left">
                  <h1 className="company-name">{printData.companyName}{printData.locationName ? ` - ${printData.locationName}` : ""}</h1>
                  <h2 className="register-title">PURCHASE INDENT REGISTER</h2>
                </div>
                <div className="doc-box">
                  <div><strong>Document No :</strong> {printData.documentNo || "-"}</div>
                  <div><strong>Rev. No :</strong> {printData.revisionNo || "-"}</div>
                  <div><strong>Rev. Date :</strong> {printData.revisionDate ? format(new Date(printData.revisionDate), "dd.MM.yyyy") : "-"}</div>
                </div>
              </div>

              {/* HEADER ROW 2: Indent No and Indent Date - space between */}
              <div className="header-row-2">
                <span><strong>Indent No :</strong> {printData.indentNo}</span>
                <span><strong>Indent Date :</strong> {printData.indentDate ? format(new Date(printData.indentDate), "dd-MM-yyyy") : "-"}</span>
              </div>

              {/* TABLE - 5 columns, fixed height so footer stays at bottom */}
              <div className="table-wrap">
                <table className="indent-table">
                  <thead>
                    <tr>
                      <th>Sr. No.</th>
                      <th>Item Description</th>
                      <th>Item Type</th>
                      <th>Item Material</th>
                      <th>DRG No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center" }}>No Items</td>
                      </tr>
                    ) : (
                      printData.rows.map((row) => (
                        <tr key={row.srNo}>
                          <td>{row.srNo}</td>
                          <td>{row.itemDescription}</td>
                          <td>{row.itemType}</td>
                          <td>{row.itemMaterial}</td>
                          <td>{row.drgNo}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* SIGNATURE SECTION - 5 equal sections across full width */}
              <div className="footer">
                <div className="footer-cell">
                  <div className="footer-value">{printData.reqDateOfDelivery ? format(new Date(printData.reqDateOfDelivery), "dd-MM-yyyy") : ""}</div>
                  <div className="footer-line" />
                  <span className="footer-label">Req. Date of Delivery</span>
                </div>
                <div className="footer-cell">
                  <div className="footer-value">{printData.mtcReq ? "YES" : "NO"}</div>
                  <div className="footer-line" />
                  <span className="footer-label">MTC Req.</span>
                </div>
                <div className="footer-cell">
                  <div className="footer-value">{printData.indentedBy || ""}</div>
                  <div className="footer-line" />
                  <span className="footer-label">Indented By</span>
                </div>
                <div className="footer-cell">
                  <div className="footer-value">{printData.authorisedBy || ""}</div>
                  <div className="footer-line" />
                  <span className="footer-label">Authorised By</span>
                </div>
                <div className="footer-cell">
                  <div className="footer-value">{printData.receivedBy || ""}</div>
                  <div className="footer-line" />
                  <span className="footer-label">Received By</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">Could not load print data.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { size: A4 landscape; margin: 0; }
            html, body { width: 297mm !important; height: 210mm !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            #pi-print-document, #pi-print-document * { visibility: visible !important; }
            #pi-print-document.print-container {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 100% !important; margin: 0 !important; padding: 0 !important;
              border: none !important; background: #fff !important;
            }
            #pi-print-document .page {
              width: 277mm !important; min-height: 190mm !important;
              margin: 10mm !important; padding: 12px 14px !important;
              border: 1px solid #000 !important; box-sizing: border-box !important;
            }
          }
          #pi-print-document.print-container {
            width: 100%;
            display: flex;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
          #pi-print-document .page {
            width: 297mm;
            min-height: 210mm;
            display: flex;
            flex-direction: column;
            border: 1px solid #000;
            padding: 12px 14px;
            box-sizing: border-box;
            background: #fff;
            color: #000;
          }
          /* Header row 1: 75% left, 25% right */
          #pi-print-document .header-row-1 {
            display: flex;
            width: 100%;
            flex-shrink: 0;
          }
          #pi-print-document .header-left {
            width: 75%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          #pi-print-document .company-name {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
            text-align: center;
            line-height: 1.2;
          }
          #pi-print-document .register-title {
            margin: 4px 0 0 0;
            font-size: 1.1rem;
            font-weight: bold;
            text-decoration: underline;
            text-align: center;
          }
          #pi-print-document .doc-box {
            width: 25%;
            border: 1px solid #000;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
            box-sizing: border-box;
          }
          /* Header row 2: Indent No left, Indent Date right */
          #pi-print-document .header-row-2 {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #000;
            font-size: 13px;
            flex-shrink: 0;
          }
          /* Table wrapper: takes remaining space so footer stays at bottom */
          #pi-print-document .table-wrap {
            flex: 1;
            min-height: 0;
            margin-top: 8px;
            overflow: hidden;
          }
          #pi-print-document .indent-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            table-layout: fixed;
          }
          #pi-print-document .indent-table th,
          #pi-print-document .indent-table td {
            border: 1px solid #000;
            padding: 5px 6px;
          }
          #pi-print-document .indent-table th {
            background: #e5e5e5;
            text-align: center;
            font-weight: bold;
          }
          #pi-print-document .indent-table td { text-align: center; }
          #pi-print-document .indent-table td:nth-child(2) { text-align: left; }
          /* Signature section: 5 equal sections */
          #pi-print-document .footer {
            display: flex;
            width: 100%;
            flex-shrink: 0;
            margin-top: 10px;
            border-top: 1px solid #000;
            padding-top: 8px;
          }
          #pi-print-document .footer-cell {
            width: 20%;
            flex: 1 1 20%;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 0 4px;
          }
          #pi-print-document .footer-value {
            font-size: 11px;
            min-height: 14px;
          }
          #pi-print-document .footer-line {
            border-top: 1px solid #000;
            width: 100%;
            margin-top: 4px;
            min-height: 20px;
          }
          #pi-print-document .footer-label {
            font-size: 10px;
            font-weight: bold;
            margin-top: 2px;
          }
        `
      }} />
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
