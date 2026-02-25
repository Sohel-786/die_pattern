/**
 * PO list filter state and API param builder.
 * Only includes keys when a filter is active.
 */
export interface POFiltersState {
  search: string;
  status: string;
  poDateFrom: string;
  poDateTo: string;
  vendorIds: number[];
  purchaseType: string;
  deliveryDateFrom: string;
  deliveryDateTo: string;
  itemIds: number[];
  rateMin: number | null;
  rateMax: number | null;
}

export const defaultPOFilters: POFiltersState = {
  search: "",
  status: "",
  poDateFrom: "",
  poDateTo: "",
  vendorIds: [],
  purchaseType: "",
  deliveryDateFrom: "",
  deliveryDateTo: "",
  itemIds: [],
  rateMin: null,
  rateMax: null,
};

export function buildPOFilterParams(f: POFiltersState): Record<string, string> {
  const params: Record<string, string> = {};
  const search = (f.search || "").trim();
  if (search) params.search = search;
  if (f.status) params.status = f.status;
  if (f.poDateFrom) params.poDateFrom = f.poDateFrom;
  if (f.poDateTo) params.poDateTo = f.poDateTo;
  if (f.vendorIds?.length) params.vendorIds = f.vendorIds.join(",");
  if (f.purchaseType) params.purchaseType = f.purchaseType;
  if (f.deliveryDateFrom) params.deliveryDateFrom = f.deliveryDateFrom;
  if (f.deliveryDateTo) params.deliveryDateTo = f.deliveryDateTo;
  if (f.itemIds?.length) params.itemIds = f.itemIds.join(",");
  if (f.rateMin != null && f.rateMin > 0) params.rateMin = String(f.rateMin);
  if (f.rateMax != null && f.rateMax > 0) params.rateMax = String(f.rateMax);
  return params;
}

export function hasActivePOFilters(f: POFiltersState): boolean {
  return (
    !!(f.search || "").trim() ||
    !!f.status ||
    !!f.poDateFrom ||
    !!f.poDateTo ||
    (f.vendorIds?.length ?? 0) > 0 ||
    !!f.purchaseType ||
    !!f.deliveryDateFrom ||
    !!f.deliveryDateTo ||
    (f.itemIds?.length ?? 0) > 0 ||
    (f.rateMin != null && f.rateMin > 0) ||
    (f.rateMax != null && f.rateMax > 0)
  );
}
