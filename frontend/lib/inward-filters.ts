import { InwardSourceType } from "@/types";
import { appendPaginationParams } from "@/lib/pagination";

export interface InwardFiltersState {
    search: string;
    vendorIds: number[];
    creatorIds: number[];
    itemIds: number[];
    sourceType: InwardSourceType | "";
    sourceNo: string;
    isActive: boolean | null;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
}

export const initialInwardFilters: InwardFiltersState = {
    search: "",
    vendorIds: [],
    creatorIds: [],
    itemIds: [],
    sourceType: "",
    sourceNo: "",
    isActive: null,
    dateFrom: "",
    dateTo: "",
    page: 1,
    pageSize: 25,
};

export function hasActiveInwardFilters(f: InwardFiltersState) {
    return (
        f.search !== "" ||
        f.vendorIds.length > 0 ||
        f.creatorIds.length > 0 ||
        f.itemIds.length > 0 ||
        f.sourceType !== "" ||
        f.sourceNo !== "" ||
        f.isActive !== null ||
        f.dateFrom !== "" ||
        f.dateTo !== ""
    );
}

export function buildInwardFilterParams(f: InwardFiltersState): URLSearchParams {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    if (f.sourceType !== "") params.set("sourceType", String(f.sourceType));
    if (f.sourceNo) params.set("sourceNo", f.sourceNo);
    if (f.isActive !== null) params.set("isActive", String(f.isActive));
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);

    f.vendorIds.forEach(id => params.append("vendorIds", String(id)));
    f.creatorIds.forEach(id => params.append("creatorIds", String(id)));
    f.itemIds.forEach(id => params.append("itemIds", String(id)));

    appendPaginationParams(params, f.page, f.pageSize);
    return params;
}
