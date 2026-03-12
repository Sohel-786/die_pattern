import { JobWorkStatus } from "@/types";
import { appendPaginationParams } from "@/lib/pagination";

export interface JobWorkFiltersState {
    search: string;
    partyIds: number[];
    creatorIds: number[];
    itemIds: number[];
    status: JobWorkStatus | "";
    dateFrom: string;
    dateTo: string;
    isActive: boolean | null;
    page: number;
    pageSize: number;
}

export const initialJobWorkFilters: JobWorkFiltersState = {
    search: "",
    partyIds: [],
    creatorIds: [],
    itemIds: [],
    status: "",
    dateFrom: "",
    dateTo: "",
    isActive: null,
    page: 1,
    pageSize: 25,
};

export function hasActiveJobWorkFilters(f: JobWorkFiltersState) {
    return (
        f.search !== "" ||
        f.partyIds.length > 0 ||
        f.creatorIds.length > 0 ||
        f.itemIds.length > 0 ||
        f.status !== "" ||
        f.dateFrom !== "" ||
        f.dateTo !== "" ||
        f.isActive !== null
    );
}

export function buildJobWorkFilterParams(f: JobWorkFiltersState): URLSearchParams {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    f.partyIds.forEach(id => params.append("partyIds", String(id)));
    f.creatorIds.forEach(id => params.append("creatorIds", String(id)));
    f.itemIds.forEach(id => params.append("itemIds", String(id)));
    if (f.status !== "") params.set("status", String(f.status));
    if (f.isActive !== null) params.set("isActive", String(f.isActive));
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);
    appendPaginationParams(params, f.page, f.pageSize);
    return params;
}
