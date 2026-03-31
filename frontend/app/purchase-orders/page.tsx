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
  RotateCcw,
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
import { AccessDenied } from "@/components/ui/access-denied";
import { Role } from "@/types";
import { PurchaseOrderPreviewModal } from "@/components/purchase-orders/purchase-order-preview-modal";
import { PurchaseOrderDialog } from "@/components/purchase-orders/purchase-order-dialog";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { POFilters } from "@/components/filters/po-filters";
import {
  defaultPOFilters,
  buildPOFilterParams,
  type POFiltersState,
} from "@/lib/po-filters";
import { cn, formatDateTime, formatDate, formatRate } from "@/lib/utils";
import { TablePagination } from "@/components/ui/table-pagination";
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
  const [revertTarget, setRevertTarget] = useState<PO | null>(null);
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

  const { data: poData, isLoading } = useQuery<{ list: PO[]; totalCount: number }>({
    queryKey: ["purchase-orders", filterParams.toString()],
    queryFn: async () => {
      const res = await api.get("/purchase-orders?" + filterParams.toString());
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
  });
  const orders = poData?.list ?? [];
  const totalCount = poData?.totalCount ?? 0;

  const { data: vendors = [] } = useQuery<Party[]>({
    queryKey: ["parties", "active"],
    queryFn: async () => {
      const res = await api.get("/parties/active");
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


  const { data: locationUsers = [] } = useQuery<any[]>({
    queryKey: ["location-users"],
    queryFn: async () => {
      const res = await api.get("/users/location-users");
      return res.data.data ?? [];
    },
  });

  const creatorOptions = useMemo(
    () =>
      locationUsers.map((u) => ({
        label: `${u.firstName} ${u.lastName}`,
        value: u.id,
      })),
    [locationUsers]
  );

  const isAdmin = user?.role === Role.ADMIN;

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

  const revertToPendingMutation = useMutation({
    mutationFn: (id: number) => api.post(`/purchase-orders/${id}/revert-to-pending`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-indents"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("PO reverted to Pending.");
      setRevertTarget(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Revert failed"),
  });

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({ ...defaultPOFilters, pageSize: prev.pageSize, page: 1 }));
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
    permissions?.editPO === true;
  const hasApprovalAccess = permissions?.approvePO === true;
  const canApproveOrReject = (po: PO) => po.isActive !== false && po.status === PoStatus.Pending && hasApprovalAccess;

  if (permissions && !permissions.viewPO) {
    return <AccessDenied actionLabel="Go to Purchase Orders" actionHref="/purchase-orders" />;
  }

  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-4 bg-background overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground text-sm">
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
        creatorOptions={creatorOptions}
        onClear={resetFilters}
        isAdmin={isAdmin}
        className="shadow-sm"
      />

      <Card className="shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40">
                <TableHead className="w-14 min-w-[3.5rem] max-w-[3.5rem] h-11 px-0 text-center"></TableHead>
                <TableHead className="w-12 h-11 text-center font-bold uppercase tracking-tight text-[11px] text-primary-900 dark:!text-white">SR.NO</TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap text-primary-900 dark:!text-white">
                  PO NO.
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  PO DATE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  PARTY NAME
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  DELIVERY DATE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  APPROVAL STATUS
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-center whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  ACTIVE
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  CREATED BY
                </TableHead>
                <TableHead className="h-11 font-bold uppercase tracking-tight text-[11px] text-right pr-6 whitespace-nowrap text-secondary-700 dark:text-secondary-400">
                  ACTIONS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell colSpan={10} className="h-16 px-6">
                      <div className="h-4 bg-secondary-100 rounded-full w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : orders.length > 0 ? (
                orders.map((po) => (
                  <Fragment key={po.id}><TableRow
                      key={po.id}
                      className={cn(
                        "border-b border-border transition-colors font-sans whitespace-nowrap group cursor-pointer",
                        expandedPOId === po.id ? "bg-primary-50/60 dark:bg-primary-900/20" : "hover:bg-primary-50/30 dark:hover:bg-primary-900/10"
                      )}
                      onClick={() => setExpandedPOId(expandedPOId === po.id ? null : po.id)}
                    >
                      <TableCell className="p-0 w-14 min-w-[3.5rem] max-w-[3.5rem] text-center">
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: expandedPOId === po.id ? 90 : 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            style={{ originX: "50%", originY: "50%" }}
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                              expandedPOId === po.id ? "bg-primary-100/60 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400" : "text-muted-foreground group-hover:bg-primary-100/70 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400"
                            )}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </motion.div>
                        </div>
                      </TableCell>
                      <td className="px-4 py-3 text-muted-foreground font-medium text-center text-sm">{orders.length - orders.indexOf(po)}</td>
                      <td className="px-4 py-3 font-bold text-foreground text-sm">
                        {po.poNo}
                      </td>
                      <td className="px-4 py-3 text-foreground/80 text-sm">
                        {formatDateTime(po.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground/90 text-sm">
                        {po.vendorName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-foreground/80 text-sm">
                        {po.deliveryDate ? formatDate(po.deliveryDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(po.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs font-semibold",
                          po.isActive !== false
                            ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {po.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-sm whitespace-nowrap">
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
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
                                  title="Approve or reject"
                                  aria-label="Open approval actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[11rem] py-1">
                                {po.status === PoStatus.Pending ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const target = po;
                                        requestAnimationFrame(() => setApproveTarget(target));
                                      }}
                                      className="flex items-center gap-2 cursor-pointer py-2"
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                      <span>Approve</span>
                                    </DropdownMenuItem>
                                    <div className="my-1 border-t border-border" role="separator" />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const target = po;
                                        requestAnimationFrame(() => setRejectTarget(target));
                                      }}
                                      className="flex items-center gap-2 cursor-pointer py-2"
                                    >
                                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                      <span>Reject</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : (po.status === PoStatus.Approved || po.status === PoStatus.Rejected) && !po.hasInward ? (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const target = po;
                                      requestAnimationFrame(() => setRevertTarget(target));
                                    }}
                                    className="flex items-center gap-2 cursor-pointer py-2 text-amber-700 dark:text-amber-300 font-medium"
                                  >
                                    <RotateCcw className="w-4 h-4 shrink-0" />
                                    <span>Revert to Pending</span>
                                  </DropdownMenuItem>
                                ) : (
                                  <div className="px-3 py-2 text-xs text-muted-foreground italic">
                                    No approval actions available
                                  </div>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {po.isActive !== false && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPreviewPOId(po.id)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 hover:bg-muted border border-transparent hover:border-primary-100 dark:hover:border-primary-900/30 rounded-lg transition-all"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {po.isActive !== false && (
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
                          {user?.role === Role.ADMIN && (
                            po.isActive !== false ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!!(po.hasInward || po.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-")))}
                                onClick={() => setInactiveTarget(po)}
                                className={cn(
                                  "h-8 w-8 p-0 border border-transparent rounded-lg transition-all text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-100 dark:hover:border-amber-900/30",
                                  (po.hasInward || po.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-"))) && "opacity-30 cursor-not-allowed"
                                )}
                                title={po.hasInward || po.items?.some(i => i.isInwarded || (i.inwardNo && i.inwardNo !== "-")) ? "Cannot deactivate because some items have been inwarded in active entries" : "Deactivate PO"}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTarget(po)}
                                className="h-8 w-8 p-0 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg transition-all"
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
                          className="hover:bg-transparent border-b border-border"
                        >
                          <td colSpan={11} className="p-0 border-none max-w-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden bg-muted/20 w-full"
                            >
                              <div className="px-4 pb-4 pt-4">
                                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm w-full">
                                  <div className="bg-muted/40 px-4 py-2 border-b border-border flex items-center justify-between">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                      Purchase Order Items
                                    </p>
                                    <span className="text-[10px] font-medium text-muted-foreground">
                                      Total Items: {po.items?.length || 0}
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-secondary-50/50 dark:bg-card border-b border-secondary-100 dark:border-border hover:bg-secondary-50/50 dark:hover:bg-card">
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap w-12 text-center">
                                            SR.NO
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            PI NO.
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            PI DATE
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            ITEM DESCRIPTION
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            TYPE
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            DRAWING / REV
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            INWARD NO.
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            INWARD DATE
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap text-center">
                                            QC NO.
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            QC DATE
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider whitespace-nowrap">
                                            MATERIAL
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider text-center whitespace-nowrap">
                                            GST %
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider text-right whitespace-nowrap">
                                            UNIT RATE (₹)
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider text-right whitespace-nowrap">
                                            TAX
                                          </TableHead>
                                          <TableHead className="h-9 px-4 text-[10px] font-black uppercase text-secondary-500 dark:text-secondary-400 tracking-wider text-right whitespace-nowrap pr-6">
                                            TOTAL
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
                                              className="border-b border-border/40 last:border-0 hover:bg-muted/40 whitespace-nowrap"
                                            >
                                              <TableCell className="px-4 py-2 text-muted-foreground font-medium text-[13px] text-center">
                                                {po.items.indexOf(i) + 1}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-foreground/85 font-semibold text-[13px]">
                                                {i.piNo ?? "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-muted-foreground font-medium text-[13px]">
                                                {i.piDate ? formatDateTime(i.piDate) : "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2">
                                                <div className="flex flex-col min-w-0">
                                                  <span className="font-bold text-foreground text-[13px] tracking-tight">
                                                    {i.currentName ?? "—"}
                                                  </span>
                                                  <span className="text-[11px] text-muted-foreground font-medium tracking-tight">
                                                    {i.mainPartName ?? "—"}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-muted-foreground text-[13px] font-medium">
                                                {i.itemTypeName ?? "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2">
                                                <div className="flex flex-col min-w-0">
                                                  <span className="font-bold text-foreground/90 text-[13px] tracking-tight">
                                                    {i.drawingNo ?? "N/A"}
                                                  </span>
                                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                                    {i.revisionNo ? `R${i.revisionNo}` : "R0"}
                                                  </span>
                                                </div>
                                              </TableCell>
                                              <TableCell className="px-4 py-2">
                                                {i.inwardNo ? (
                                                  <span className="inline-flex px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:text-primary-300 dark:border-primary-900/30 font-bold text-[11px]">
                                                    {i.inwardNo}
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground text-[11px] italic font-medium">Not Inwarded</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-muted-foreground font-medium text-[13px]">
                                                {i.inwardNo && i.inwardDate ? formatDateTime(i.inwardDate) : "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-center">
                                                {i.qcNo ? (
                                                  <span className="inline-flex px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900/30 font-bold text-[11px]">
                                                    {i.qcNo}
                                                  </span>
                                                ) : i.inwardNo ? (
                                                  <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30 font-bold text-[11px]">
                                                    Pending QC
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground/60 text-[11px]">—</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-muted-foreground font-medium text-[13px]">
                                                {i.qcNo && i.qcDate ? formatDateTime(i.qcDate) : "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-muted-foreground text-[13px] font-medium">
                                                {i.materialName ?? "—"}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-center text-[13px] font-medium text-muted-foreground tabular-nums">
                                                {gstPct}%
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-right font-bold text-foreground text-[13px] tabular-nums">
                                                ₹{formatRate(i.rate ?? 0)}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-right text-muted-foreground text-[13px] font-medium tabular-nums">
                                                ₹{formatRate(tax)}
                                              </TableCell>
                                              <TableCell className="px-4 py-2 text-right font-black text-foreground text-[13px] tabular-nums pr-6">
                                                ₹{formatRate(total)}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </TableRow>
                      )}
                    </AnimatePresence></Fragment>
                ))
              ) : (
                <TableRow key="empty">
                  <td
                    colSpan={10}
                    className="py-16 text-center text-muted-foreground italic font-medium"
                  >
                    No purchase orders found.
                  </td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          page={filters.page}
          pageSize={filters.pageSize}
          totalCount={totalCount}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
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
          readOnly={!!editPO && !permissions?.editPO}
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
          <p className="text-muted-foreground">
            Approve PO{" "}
            <span className="font-bold text-foreground">
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
          <p className="text-muted-foreground">
            Reject PO{" "}
            <span className="font-bold text-foreground">
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
          <p className="text-muted-foreground">
            Deactivate PO{" "}
            <span className="font-bold text-foreground">
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
          <p className="text-muted-foreground">
            Reactivate PO{" "}
            <span className="font-bold text-foreground">
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
              {activeMutation.isPending ? "Processing..." : "Confirm Activate"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        title="Revert Purchase Order"
        size="sm"
      >
        <div className="space-y-4 font-sans text-sm">
          <p className="text-muted-foreground leading-relaxed">
            Revert PO <span className="font-bold text-foreground">{revertTarget?.poNo}</span> back to Pending?
          </p>
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800 text-[12px] font-medium leading-relaxed dark:bg-amber-950/30 dark:border-amber-900/30 dark:text-amber-200">
            This will allow editing the order again. Items will be reverted to &apos;PI Issued&apos; state. You cannot revert if any inward entry exists.
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setRevertTarget(null)}
              className="flex-1 font-bold h-10"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold h-10"
              onClick={() =>
                revertTarget && revertToPendingMutation.mutate(revertTarget.id)
              }
              disabled={revertToPendingMutation.isPending}
            >
              {revertToPendingMutation.isPending ? "Reverting..." : "Confirm Revert"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
