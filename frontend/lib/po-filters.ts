import { appendPaginationParams } from "@/lib/pagination";

/**
 * PO list filter state and API param builder.
 * Only includes keys when a filter is active.
 * page/pageSize are for pagination (not filters).
 */
export interface POFiltersState {
  search: string;
  status: string;
  poDateFrom: string;
  poDateTo: string;
  vendorIds: number[];
  creatorIds: number[];
  purchaseType: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  itemIds: number[];
  rateMin: number | null;
  rateMax: number | null;
  isActive: boolean | null;
  page: number;
  pageSize: number;
}

export const defaultPOFilters: POFiltersState = {
  search: "",
  status: "",
  poDateFrom: "",
  poDateTo: "",
  vendorIds: [],
  creatorIds: [],
  purchaseType: "",
  deliveryDateFrom: "",
  deliveryDateTo: "",
  itemIds: [],
  rateMin: null,
  rateMax: null,
  isActive: null,
  page: 1,
  pageSize: 25,
};

export function buildPOFilterParams(f: POFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  const search = (f.search || "").trim();
  if (search) params.set("search", search);
  if (f.status) params.set("status", f.status);
  if (f.poDateFrom) params.set("poDateFrom", f.poDateFrom);
  if (f.poDateTo) params.set("poDateTo", f.poDateTo);
  if (f.purchaseType) params.set("purchaseType", f.purchaseType);
  if (f.deliveryDateFrom) params.set("deliveryDateFrom", f.deliveryDateFrom);
  if (f.deliveryDateTo) params.set("deliveryDateTo", f.deliveryDateTo);
  if (f.rateMin != null && f.rateMin > 0) params.set("rateMin", String(f.rateMin));
  if (f.rateMax != null && f.rateMax > 0) params.set("rateMax", String(f.rateMax));
  if (f.isActive !== null) params.set("isActive", String(f.isActive));

  (f.vendorIds || []).forEach(id => params.append("vendorIds", String(id)));
  (f.creatorIds || []).forEach(id => params.append("creatorIds", String(id)));
  (f.itemIds || []).forEach(id => params.append("itemIds", String(id)));

  appendPaginationParams(params, f.page, f.pageSize);
  return params;
}

export function hasActivePOFilters(f: POFiltersState): boolean {
  return (
    !!(f.search || "").trim() ||
    !!f.status ||
    !!f.poDateFrom ||
    !!f.poDateTo ||
    (f.vendorIds?.length ?? 0) > 0 ||
    (f.creatorIds?.length ?? 0) > 0 ||
    !!f.purchaseType ||
    !!f.deliveryDateFrom ||
    !!f.deliveryDateTo ||
    (f.itemIds?.length ?? 0) > 0 ||
    (f.rateMin != null && f.rateMin > 0) ||
    (f.rateMax != null && f.rateMax > 0) ||
    f.isActive !== null
  );
}
