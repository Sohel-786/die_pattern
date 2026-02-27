"use client";

import { useState, useCallback, useMemo, Fragment, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  ShoppingCart,
  Eye,
  Edit2,
  CheckCircle,
  ChevronRight,
  Minus,
  Ban,
  MoreVertical,
  XCircle,
} from "lucide-react";
import api from "@/lib/api";
import { PO, PoStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { Role } from "@/types";
import { PurchaseOrderPreviewModal } from "@/components/purchase-orders/purchase-order-preview-modal";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { POFilters } from "@/components/filters/po-filters";
import {
  defaultPOFilters,
  buildPOFilterParams,
  type POFiltersState,
} from "@/lib/po-filters";
import { cn } from "@/lib/utils";
import type { Party } from "@/types";
import type { Item } from "@/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function PurchaseOrdersPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<POFiltersState>(defaultPOFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 400);
  const [expandedPOId, setExpandedPOId] = useState<number | null>(null);
  const [previewPOId, setPreviewPOId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<PO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PO | null>(null);
  const [inactiveTarget, setInactiveTarget] = useState<PO | null>(null);
  const [activeTarget, setActiveTarget] = useState<PO | null>(null);
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [editPO, setEditPO] = useState<PO | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const openPoId = searchParams.get("openPoId");
    if (openPoId) {
      const id = parseInt(openPoId, 10);
      if (!Number.isNaN(id)) setPreviewPOId(id);
    }
  }, [searchParams]);

  const filterParams = useMemo(
    () => buildPOFilterParams({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );
  const queryKey = useMemo(
    () => ["purchase-orders", filterParams],
    [filterParams]
  );

  const { data: orders = [], isLoading } = useQuery<PO[]>({
    queryKey,
    queryFn: async () => {
      const res = await api.get("/purchase-orders", { params: filterParams });
      return res.data.data;
    },
  });

  const { data: vendors = [] } = useQuery<Party[]>({
    queryKey: ["parties", "active"],
    queryFn: async () => {
      const res = await api.get("/parties/active");
      return res.data.data ?? [];
    },
  });

  const { data: itemsList = [] } = useQuery<Item[]>({
    queryKey: ["items", "active"],
    queryFn: async () => {
      const res = await api.get("/items/active");
      return res.data.data ?? [];
    },
  });

  const partyOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: v.id,
        label: v.name,
      })),
    [vendors]
  );
  const itemOptions = useMemo(
    () =>
      itemsList.map((i) => ({
        value: i.id,
        label: [i.currentName, i.mainPartName].filter(Boolean).join(" – ") || `Item ${i.id}`,
      })),
    [itemsList]
  );

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Order approved successfully");
      setApproveTarget(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Approval failed"),
  });

  const inactiveMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/purchase-orders/${id}/inactive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("PO deactivated. Its PI items are available for other POs.");
      setInactiveTarget(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Deactivate failed"),
  });

  const activeMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/purchase-orders/${id}/active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("PO reactivated.");
      setActiveTarget(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Reactivate failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Purchase order rejected.");
      setRejectTarget(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Rejection failed"),
  });

  const resetFilters = useCallback(() => {
    setFilters(defaultPOFilters);
  }, []);

  const getStatusBadge = (status: PoStatus) => {
    switch (status) {
      case PoStatus.Approved:
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
            Approved
          </span>
        );
      case PoStatus.Rejected:
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">
            Rejected
          </span>
        );
      case PoStatus.Pending:
      default:
        return (
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border bg-amber-50 text-amber-700 border-amber-200">
            Approval Pending
          </span>
        );
    }
  };

  const canEdit = (po: PO) =>
    po.isActive !== false &&
    !po.hasInward &&
    (permissions?.editPO === true || user?.role === Role.ADMIN);
  const hasApprovalAccess = permissions?.approvePO === true || user?.role === Role.ADMIN;
  const canApproveOrReject = (po: PO) => po.isActive !== false && po.status === PoStatus.Pending && hasApprovalAccess;

  if (permissions && !permissions.viewPO) {
    return (
      <div className="flex h-[80vh] items-center justify-center font-sans px-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl border border-secondary-100 max-w-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-secondary-900 tracking-tight mb-2 uppercase">
            Access Restricted
          </h2>
          <p className="text-secondary-500 font-medium">
            You don&apos;t have the required clearance to view purchase orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-secondary-50/30 overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-secondary-500 text-sm">
            Official procurement and repair work orders
          </p>
        </div>
        {permissions?.createPO && (
          <Button
            onClick={() => {
              setEditPO(null);
              setPoDialogOpen(true);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold h-10 px-6 rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Issue New PO
          </Button>
        )}
      </div>

      <POFilters
        filters={filters}
        onFiltersChange={setFilters}
        partyOptions={partyOptions}
        itemOptions={itemOptions}
        onClear={resetFilters}
        className="shadow-sm"
      />

      <Card className="border-secondary-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-primary-200 bg-primary-100 text-primary-900">
                <TableHead className="w-10 h-11 text-center font-bold uppercase tracking-tight text-[11px]"></TableHead>
                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px]">SR.NO</TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">
                  PO NO.
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">
                  PO DATE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">
                  PARTY NAME
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap">
                  DELIVERY DATE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">
                  APPROVAL STATUS
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap">
                  ACTIVE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right whitespace-nowrap">
                  CREATED BY
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={8} className="h-16 px-6">
                      <div className="h-4 bg-secondary-100 rounded-full w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : orders.length > 0 ? (
                orders.map((po) => (
                  <Fragment key={po.id}>
                    <TableRow
                      className={cn(
                        "border-b border-secondary-100 hover:bg-secondary-50 transition-all font-sans whitespace-nowrap",
                        expandedPOId === po.id && "bg-primary-50/30"
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedPOId(
                              expandedPOId === po.id ? null : po.id
                            )
                          }
                          className="h-6 w-6 p-0 text-secondary-500"
                          aria-label={
                            expandedPOId === po.id ? "Collapse row" : "Expand row"
                          }
                        >
                          {expandedPOId === po.id ? (
                            <Minus className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-secondary-500 font-medium text-center text-sm">{orders.indexOf(po) + 1}</td>
                      <td className="px-4 py-3 font-bold text-secondary-900 text-sm">
                        {po.poNo}
                      </td>
                      <td className="px-4 py-3 text-secondary-700 text-sm">
                        {format(new Date(po.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 font-medium text-secondary-800 text-sm">
                        {po.vendorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-secondary-700 text-sm">
                        {po.deliveryDate
                          ? format(new Date(po.deliveryDate), "dd MMM yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs font-semibold",
                          po.isActive !== false ? "bg-green-100 text-green-700" : "bg-secondary-200 text-secondary-700"
                        )}>
                          {po.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-secondary-600 text-sm whitespace-nowrap">
                        {po.creatorName ?? "System"}
                      </td>
                      <td className="px-4 py-3 text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {hasApprovalAccess && po.isActive !== false && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-all"
                                  title="Approve or reject"
                                  aria-label="Open approval actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[11rem] py-1">
                                <DropdownMenuItem
                                  onClick={() => {
                                    const target = po;
                                    requestAnimationFrame(() => setApproveTarget(target));
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 cursor-pointer py-2",
                                    !canApproveOrReject(po) && "opacity-60"
                                  )}
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                  <span>Approve</span>
                                  {!canApproveOrReject(po) && (
                                    <span className="text-[10px] text-secondary-400 ml-auto">Pending only</span>
                                  )}
                                </DropdownMenuItem>
                                <div className="my-1 border-t border-secondary-100" role="separator" />
                                <DropdownMenuItem
                                  onClick={() => {
                                    const target = po;
                                    requestAnimationFrame(() => setRejectTarget(target));
                                  }}
                                  className={cn(
                                    "flex items-center gap-2 cursor-pointer py-2",
                                    !canApproveOrReject(po) && "opacity-60"
                                  )}
                                >
                                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>Reject</span>
                                  {!canApproveOrReject(po) && (
                                    <span className="text-[10px] text-secondary-400 ml-auto">Pending only</span>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {po.isActive !== false && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewPOId(po.id)}
                              className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {canEdit(po) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditPO(po);
                                setPoDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 rounded-lg transition-all"
                              title="Edit PO"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {(permissions?.editPO || user?.role === Role.ADMIN) && (
                            po.isActive !== false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInactiveTarget(po)}
                                className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Deactivate PO"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTarget(po)}
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Activate PO"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </TableRow>

                    <AnimatePresence>
                      {expandedPOId === po.id && (
                        <TableRow
                          key={`expand-${po.id}`}
                          className="bg-secondary-50/50 border-b border-secondary-100"
                        >
                          <td colSpan={9} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 py-4 bg-secondary-50/50 border-x border-secondary-100">
                                <div className="bg-white rounded-xl border border-secondary-200 overflow-hidden shadow-sm">
                                  <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider px-4 py-2 border-b border-secondary-100">
                                    Items
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-secondary-50 border-b border-secondary-100">
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-12">
                                          Sr.No
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">
                                          PI No.
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">
                                          Name
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap w-24">
                                          Type
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">
                                          Drawing No. / Rev
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider whitespace-nowrap">
                                          Material
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center whitespace-nowrap">
                                          GST %
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center whitespace-nowrap">
                                          Unit Rate (₹)
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center whitespace-nowrap">
                                          Tax
                                        </TableHead>
                                        <TableHead className="h-9 px-4 text-[10px] font-bold uppercase text-secondary-600 tracking-wider text-center whitespace-nowrap">
                                          Total
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {po.items?.map((i) => {
                                        const gstPct = po.gstPercent ?? 18;
                                        const tax =
                                          ((i.rate ?? 0) * gstPct) / 100;
                                        const total = (i.rate ?? 0) + tax;
                                        return (
                                          <TableRow
                                            key={i.id}
                                            className="border-b border-secondary-50 last:border-0 hover:bg-secondary-50/30"
                                          >
                                            <TableCell className="px-4 py-2 text-secondary-500 font-medium text-sm text-center">
                                              {po.items.indexOf(i) + 1}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-secondary-700 font-medium text-sm whitespace-nowrap">
                                              {i.piNo ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                              <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-secondary-900 text-sm truncate">
                                                  {i.currentName ?? "—"}
                                                </span>
                                                <span className="text-xs text-secondary-500 truncate">
                                                  {i.mainPartName ?? "—"}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-secondary-700 text-sm whitespace-nowrap">
                                              {i.itemTypeName ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-2">
                                              <div className="flex flex-col min-w-0">
                                                <span className="font-medium text-secondary-800 text-sm truncate">
                                                  {i.drawingNo ?? "N/A"}
                                                </span>
                                                <span className="text-xs text-secondary-500">
                                                  R{i.revisionNo ?? "0"}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-secondary-700 text-sm whitespace-nowrap">
                                              {i.materialName ?? "—"}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-center text-sm">
                                              {gstPct}%
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-center font-medium text-secondary-900 text-sm tabular-nums">
                                              {((i.rate ?? 0)).toLocaleString(
                                                undefined,
                                                { minimumFractionDigits: 2 }
                                              )}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-center text-secondary-600 text-sm tabular-nums">
                                              ₹ {tax.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="px-4 py-2 text-center font-semibold text-secondary-900 text-sm tabular-nums">
                                              ₹ {total.toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </TableRow>
                      )}
                    </AnimatePresence>
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-secondary-400 italic font-medium"
                  >
                    No purchase orders found.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {previewPOId != null && (
        <PurchaseOrderPreviewModal
          poId={previewPOId}
          onClose={() => setPreviewPOId(null)}
        />
      )}

      {poDialogOpen && (
        <PurchaseOrderDialog
          open={poDialogOpen}
          onOpenChange={setPoDialogOpen}
          po={editPO ?? undefined}
          onPreviewRequest={(poId) => setPreviewPOId(poId)}
        />
      )}

      <Dialog
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Approve Purchase Order"
        size="sm"
      >
        <div className="space-y-4 font-sans">
          <p className="text-secondary-600">
            Approve PO{" "}
            <span className="font-bold text-secondary-900">
              {approveTarget?.poNo}
            </span>
            ? This action cannot be undone.
          </p>
          {approveTarget && approveTarget.status !== PoStatus.Pending && (
            <p className="text-amber-600 text-sm font-medium">
              Only Pending POs can be approved. Current status: {approveTarget.status}.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setApproveTarget(null)}
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() =>
                approveTarget && approveMutation.mutate(approveTarget.id)
              }
              disabled={approveMutation.isPending || (approveTarget?.status !== PoStatus.Pending)}
            >
              {approveMutation.isPending
                ? "Processing..."
                : "Confirm Approve"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Purchase Order"
        size="sm"
      >
        <div className="space-y-4 font-sans">
          <p className="text-secondary-600">
            Reject PO{" "}
            <span className="font-bold text-secondary-900">
              {rejectTarget?.poNo}
            </span>
            ? This action cannot be undone.
          </p>
          {rejectTarget && rejectTarget.status !== PoStatus.Pending && (
            <p className="text-amber-600 text-sm font-medium">
              Only Pending POs can be rejected. Current status: {rejectTarget.status}.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold"
              onClick={() =>
                rejectTarget && rejectMutation.mutate(rejectTarget.id)
              }
              disabled={rejectMutation.isPending || (rejectTarget?.status !== PoStatus.Pending)}
            >
              {rejectMutation.isPending ? "Processing..." : "Confirm Reject"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Deactivate Purchase Order"
        size="sm"
      >
        <div className="space-y-4 font-sans">
          <p className="text-secondary-600">
            Deactivate PO{" "}
            <span className="font-bold text-secondary-900">
              {inactiveTarget?.poNo}
            </span>
            ? Its PI items will become available for selection in other POs. You cannot deactivate if any item from this PO has been inwarded.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setInactiveTarget(null)}
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() =>
                inactiveTarget && inactiveMutation.mutate(inactiveTarget.id)
              }
              disabled={inactiveMutation.isPending}
            >
              {inactiveMutation.isPending ? "Processing..." : "Deactivate"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!activeTarget}
        onClose={() => setActiveTarget(null)}
        title="Activate Purchase Order"
        size="sm"
      >
        <div className="space-y-4 font-sans">
          <p className="text-secondary-600">
            Reactivate PO{" "}
            <span className="font-bold text-secondary-900">
              {activeTarget?.poNo}
            </span>
            ? This is only allowed if none of its PI items have been used in another active PO.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setActiveTarget(null)}
              className="flex-1 font-bold"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              onClick={() =>
                activeTarget && activeMutation.mutate(activeTarget.id)
              }
              disabled={activeMutation.isPending}
            >
              {activeMutation.isPending ? "Processing..." : "Activate"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
