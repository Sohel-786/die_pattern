/**
 * PI list filter state and API param builder.
 */
export interface PIFiltersState {
  search: string;
  status: string;
  createdDateFrom: string;
  createdDateTo: string;
  itemIds: number[];
}

export const defaultPIFilters: PIFiltersState = {
  search: "",
  status: "",
  createdDateFrom: "",
  createdDateTo: "",
  itemIds: [],
};

export function buildPIFilterParams(f: PIFiltersState): Record<string, string> {
  const params: Record<string, string> = {};
  const search = (f.search || "").trim();
  if (search) params.search = search;
  if (f.status) params.status = f.status;
  if (f.createdDateFrom) params.createdDateFrom = f.createdDateFrom;
  if (f.createdDateTo) params.createdDateTo = f.createdDateTo;
  if (f.itemIds?.length) params.itemIds = f.itemIds.join(",");
  return params;
}

export function hasActivePIFilters(f: PIFiltersState): boolean {
  return (
    !!(f.search || "").trim() ||
    !!f.status ||
    !!f.createdDateFrom ||
    !!f.createdDateTo ||
    (f.itemIds?.length ?? 0) > 0
  );
}
