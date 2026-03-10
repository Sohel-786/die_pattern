import { InwardSourceType } from "@/types";
import { QcStatus } from "@/types";

export interface QCFiltersState {
    search: string;
    partyIds: number[];
    creatorIds: number[];
    itemIds: number[];
    sourceType: InwardSourceType | "";
    status: QcStatus | "";
    isActive: boolean | null;
    dateFrom: string;
    dateTo: string;
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

export function buildQCFilterParams(f: QCFiltersState): URLSearchParams {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    f.partyIds.forEach(id => params.append("partyIds", String(id)));
    f.creatorIds.forEach(id => params.append("creatorIds", String(id)));
    f.itemIds.forEach(id => params.append("itemIds", String(id)));
    if (f.sourceType !== "") params.set("sourceType", String(f.sourceType));
    if (f.status !== "") params.set("status", String(f.status));
    if (f.isActive !== null) params.set("isActive", String(f.isActive));
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);
    return params;
}
