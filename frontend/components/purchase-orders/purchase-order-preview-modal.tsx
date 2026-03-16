"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Printer } from "lucide-react";
import { registerDialog } from "@/lib/dialog-stack";
import api from "@/lib/api";
import type { PurchaseOrderPrintData } from "@/types";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDate, formatRate } from "@/lib/utils";

interface PurchaseOrderPreviewModalProps {
  poId: number;
  onClose: () => void;
}

export function PurchaseOrderPreviewModal({ poId, onClose }: PurchaseOrderPreviewModalProps) {
  const { data: printData, isLoading } = useQuery<PurchaseOrderPrintData>({
    queryKey: ["purchase-order-print", poId],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${poId}/print`);
      const d = res.data?.data;
      if (!d) throw new Error("No data");
      return d as PurchaseOrderPrintData;
    },
    enabled: !!poId,
  });

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (poId) {
      return registerDialog(handleClose);
    }
  }, [poId, handleClose]);

  const handlePrint = () => {
    window.print();
  };

  if (!poId) return null;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="po-preview-title"
    >
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-secondary-50 print:hidden">
        <h2 id="po-preview-title" className="text-lg font-bold text-secondary-900">Purchase Order – Preview</h2>
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

      <div className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible flex items-start justify-center min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center min-h-[400px] w-full">
            <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : printData ? (
          <div id="po-print-document" className="po-print-container">
            <div className="po-page">
              {/* Header: Company left, Doc box right */}
              <div className="po-header-row mb-0">
                <div className="po-header-left">
                  <h1 className="po-company-name">{printData.companyName}</h1>
                  <p className="po-company-address">{printData.companyAddress}</p>
                  <p className="po-gst">GST NO : {printData.companyGstNo}</p>
                </div>
                <div className="po-doc-box">
                  <div>Doc No. : {printData.documentNo}</div>
                  <div>Rev. No. : {printData.revisionNo}</div>
                  <div>Rev. Date : {printData.revisionDate ? formatDate(printData.revisionDate) : "-"}</div>
                  <div>Page No. : Page 1 of 1</div>
                </div>
              </div>

              <div className="w-full border border-black border-t-0">
              <h2 className="po-title">PURCHASE ORDER</h2>
              </div>

              {/* TO block and order details side by side */}
              <div className="po-to-order-row">
                <div className="po-to-block">
                  <p className="po-to-label">TO,</p>
                  <p><strong>Party Code:</strong> {printData.vendorPartyCode || "-"}</p>
                  <p className="po-vendor-name">{printData.vendorName}</p>
                  <p className="po-vendor-address">{printData.vendorAddress}</p>
                  <p><strong>GST NO</strong> {printData.vendorGstNo}</p>
                  <p>Kind Attn.:</p>
                  <p>Dear Sir,</p>
                  <p className="po-message">We are pleased to place our order for following item according to the following terms &amp; conditions. We request you to mention our P.O. No. in your delivery challan or Invoice.</p>
                </div>
                <div className="po-order-details">
                  <div><strong>Quot. No :</strong> {printData.quotationNo}</div>
                  <div><strong>Date :</strong> {printData.quotationDate ? formatDateTime(printData.quotationDate) : "-"}</div>
                  <div><strong>P.O. NO. :</strong> {printData.poNo}</div>
                  <div><strong>Date :</strong> {printData.poDate ? formatDate(printData.poDate) : "-"}</div>
                  <div><strong>P.I.No :</strong> {printData.piNo}</div>
                  <div><strong>Indent Date :</strong> {printData.indentDate ? formatDate(printData.indentDate) : "-"}</div>
                  <div><strong>Pur. Type :</strong> {printData.purchaseType}</div>
                  <div><strong>Ref. Wo. No. :</strong> {printData.refWoNo || "-"}</div>
                </div>
              </div>

              {/* Item table */}
              <table className="po-items-table">
                <thead>
                  <tr>
                    <th>Sr. No.</th>
                    <th>Part No.</th>
                    <th>Product Name with Size</th>
                    <th>Drawing No.</th>
                    <th>Rate(INR)</th>
                    <th>Net Weight</th>
                    <th>Amount</th>
                    <th>GST (%)</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printData.rows.map((row) => (
                    <tr key={row.srNo}>
                      <td>{row.srNo}</td>
                      <td>{row.partNo}</td>
                      <td>{row.productName}</td>
                      <td>{row.drawingNo}</td>
                      <td style={{ textAlign: "right" }}>{formatRate(row.rate)}</td>
                      <td style={{ textAlign: "right" }}>{row.netWeight != null ? row.netWeight.toFixed(3) : "—"}</td>
                      <td style={{ textAlign: "right" }}>{formatRate(row.amount)}</td>
                      <td style={{ textAlign: "right" }}>
                        {row.amount > 0 
                          ? Math.round(((row.sgstAmount + row.cgstAmount) / row.amount) * 100) 
                          : printData.gstPercent}%
                      </td>
                      <td style={{ textAlign: "right" }}>{formatRate(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary: totals aligned with item table columns */}
              <div className="po-summary-wrap">
                <span className="po-summary-gst">GST No.: {printData.companyGstNo}</span>
                <table className="po-summary-table">
                  <tbody>
                    <tr>
                      <td colSpan={4} className="po-summary-label">Total</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRate(printData.subtotal)}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRate(printData.gstAmount)}</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRate(printData.rows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>
                    <tr className="po-tcs-row">
                      <td colSpan={7}>TCS %</td>
                      <td colSpan={2} style={{ textAlign: "right" }}>{formatRate(0)}</td>
                    </tr>
                    <tr className="po-final-row">
                      <td colSpan={8} style={{ fontWeight: "bold" }}>Final Amount</td>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>{formatRate(printData.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms section */}
              <div className="po-terms-section">
                <div className="po-terms-grid">
                  <div>
                    <strong>Material Specification</strong>
                    <p>{printData.materialSpecification}</p>
                  </div>
                  <div>
                    <strong>Inspection Instruction (where applicable)</strong>
                    <table className="po-inspection-table">
                      <thead>
                        <tr>
                          <th>Visual</th>
                          <th>Dimensional</th>
                          <th>Chemical &amp; Physical</th>
                          <th>Instruction No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>W-P-21-01 R.3</td>
                          <td>W-P-21-03 R.0</td>
                          <td>Q-004 R.5</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <strong>Test Certificate (MTC):</strong> Required
                    <span className="ml-2">{printData.mtcReq ? "YES" : "NO"}</span>
                  </div>
                  <div>
                    <strong>Document Attachment:</strong>
                    <p>A Copy of Test Certificate Required with Material Delivery Otherwise Material will be Rejected.</p>
                  </div>
                </div>
                <div className="po-delivery-row">
                  <div><strong>Packing Specification:</strong> {printData.packingSpecification}</div>
                  <div><strong>Delivery Location:</strong> {printData.deliveryLocation}</div>
                  <div><strong>Delivery Date:</strong> {printData.deliveryDate ? formatDateTime(printData.deliveryDate) : "-"}</div>
                </div>
                <div><strong>Narration:</strong></div>
              </div>

              {/* Signatures */}
              <div className="po-signatures">
                <div className="po-sig-cell">
                  <div className="po-sig-line" />
                  <span>Prepared By</span>
                  <span className="po-sig-name">{printData.preparedBy}</span>
                </div>
                <div className="po-sig-cell">
                  <div className="po-sig-line" />
                  <span>Reviewed By</span>
                  <span className="po-sig-name">{printData.reviewedBy}</span>
                </div>
                <div className="po-sig-cell">
                  <div className="po-sig-line" />
                  <span>Authorised By</span>
                  <span className="po-sig-name">{printData.authorisedBy}</span>
                </div>
                <div className="po-sig-cell">
                  <div className="po-sig-line" />
                  <span>Accepted By</span>
                  <span className="po-sig-name">Sign Of Supplier</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-500">Could not load purchase order.</div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; min-height: 297mm !important; }
            body * { visibility: hidden !important; }
            #po-print-document, #po-print-document * { visibility: visible !important; }
            #po-print-document {
              position: absolute !important; left: 0 !important; top: 0 !important;
              width: 210mm !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
              background: #fff !important; box-sizing: border-box !important;
            }
            #po-print-document .po-print-container {
              width: 100% !important; max-width: none !important; margin: 0 !important;
            }
            #po-print-document .po-page {
              width: 100% !important; min-height: 275mm !important; box-sizing: border-box !important;
            }
          }
          .po-print-container {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #000;
            max-width: 210mm;
            margin: 0 auto;
            background: #fff;
          }
          .po-page {
            display: flex;
            flex-direction: column;
            min-height: 275mm;
            padding: 12px 14px;
            border: 1px solid #000;
            box-sizing: border-box;
          }
          .po-header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 6px;
            border-bottom: 1px solid #000;
          }
          .po-header-left {
            flex: 1;
          }
          .po-company-name {
            margin: 0;
            font-size: 16px;
            font-weight: bold;
          }
          .po-company-address { margin: 2px 0; font-size: 10px; }
          .po-gst { margin: 0; font-size: 10px; }
          .po-doc-box {
            border: 1px solid #000;
            padding: 6px 10px;
            font-size: 11px;
            min-width: 120px;
          }
          .po-title {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
          }
          .po-to-order-row {
            display: flex;
            gap: 24px;
            margin-bottom: 12px;
          }
          .po-to-block {
            flex: 1;
            font-size: 10px;
          }
          .po-to-label { font-weight: bold; margin: 0 0 4px 0; }
          .po-vendor-name { font-weight: bold; margin: 4px 0; }
          .po-vendor-address { margin: 2px 0; }
          .po-message { margin: 8px 0 0 0; font-size: 9px; }
          .po-order-details {
            width: 200px;
            font-size: 10px;
            flex-shrink: 0;
          }
          .po-order-details div { margin-bottom: 2px; }
          .po-items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 8px;
          }
          .po-items-table th, .po-items-table td {
            border: 1px solid #000;
            padding: 4px 6px;
          }
          .po-items-table th { background: #f2f2f2; font-weight: bold; }
          .po-summary-wrap {
            margin-bottom: 12px;
            font-size: 10px;
          }
          .po-summary-gst {
            display: block;
            margin-bottom: 4px;
          }
          .po-summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .po-summary-table td {
            border: 1px solid #000;
            padding: 4px 6px;
          }
          .po-summary-table .po-summary-label { border: none; padding-left: 0; }
          .po-summary-table .po-tcs-row td { border-top: none; }
          .po-summary-table .po-final-row td { font-weight: bold; border-top: 1px solid #000; }
          .po-terms-section { font-size: 10px; margin-bottom: 12px; }
          .po-terms-section p { margin: 2px 0; }
          .po-terms-grid { margin-bottom: 8px; }
          .po-inspection-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin-top: 4px;
          }
          .po-inspection-table th, .po-inspection-table td {
            border: 1px solid #000;
            padding: 2px 4px;
          }
          .po-delivery-row {
            display: flex;
            flex-wrap: wrap;
            gap: 16px 24px;
            margin: 12px 0 8px 0;
          }
          .po-delivery-row > div { min-width: 0; }
          .po-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: auto;
            padding-top: 24px;
            border-top: 1px solid #000;
          }
          .po-sig-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 22%;
            text-align: center;
          }
          .po-sig-line {
            border-top: 1px solid #000;
            width: 100%;
            height: 24px;
            margin-bottom: 4px;
          }
          .po-sig-cell span { font-size: 9px; }
          .po-sig-name { font-size: 10px; font-weight: bold; margin-top: 2px; }
        `
      }} />
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body);
  }
  return content;
}
