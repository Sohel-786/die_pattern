import { InwardSourceType } from "@/types";
import { QcStatus } from "@/types";
import { appendPaginationParams } from "@/lib/pagination";

export interface QCFiltersState {
    search: string;
    partyIds: number[];
    creatorIds: number[];
    /** Item filter: number = itemId (current name), string = "itemId_prev_N" for previous name; API receives numeric itemIds only. */
    itemIds: (number | string)[];
    sourceType: InwardSourceType | "";
    status: QcStatus | "";
    isActive: boolean | null;
    dateFrom: string;
    dateTo: string;
    page: number;
    pageSize: number;
}

export const initialQCFilters: QCFiltersState = {
    search: "",
    partyIds: [],
    creatorIds: [],
    itemIds: [],
    sourceType: "",
    status: "",
    isActive: null,
    dateFrom: "",
    dateTo: "",
    page: 1,
    pageSize: 25,
};

export function hasActiveQCFilters(f: QCFiltersState) {
    return (
        f.search !== "" ||
        f.partyIds.length > 0 ||
        f.creatorIds.length > 0 ||
        f.itemIds.length > 0 ||
        f.sourceType !== "" ||
        f.status !== "" ||
        f.isActive !== null ||
        f.dateFrom !== "" ||
        f.dateTo !== ""
    );
}

/** Extract numeric item IDs from itemIds (handles "itemId_prev_N" format for previous-name options). */
export function getItemIdsForApi(itemIds: (number | string)[]): number[] {
    const set = new Set<number>();
    itemIds.forEach((v) => {
        const n = typeof v === "number" ? v : parseInt(String(v).split("_")[0], 10);
        if (!Number.isNaN(n)) set.add(n);
    });
    return Array.from(set);
}

export function buildQCFilterParams(f: QCFiltersState): URLSearchParams {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    f.partyIds.forEach(id => params.append("partyIds", String(id)));
    f.creatorIds.forEach(id => params.append("creatorIds", String(id)));
    getItemIdsForApi(f.itemIds).forEach(id => params.append("itemIds", String(id)));
    if (f.sourceType !== "") params.set("sourceType", String(f.sourceType));
    if (f.status !== "") params.set("status", String(f.status));
    if (f.isActive !== null) params.set("isActive", String(f.isActive));
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);
    appendPaginationParams(params, f.page, f.pageSize);
    return params;
}
