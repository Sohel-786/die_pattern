import { InwardSourceType } from "@/types";
import { QcStatus } from "@/types";

export interface QCFiltersState {
    search: string;
    partyIds: number[];
    sourceType: InwardSourceType | "";
    status: QcStatus | "";
    isActive: boolean | null;
    dateFrom: string;
    dateTo: string;
}

export const initialQCFilters: QCFiltersState = {
    search: "",
    partyIds: [],
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
        f.sourceType !== "" ||
        f.status !== "" ||
        f.isActive !== null ||
        f.dateFrom !== "" ||
        f.dateTo !== ""
    );
}

export function buildQCFilterParams(f: QCFiltersState): Record<string, string | number | boolean | number[] | undefined> {
    const params: Record<string, string | number | boolean | number[] | undefined> = {};
    if (f.search) params.search = f.search;
    if (f.partyIds.length > 0) params.partyIds = f.partyIds;
    if (f.sourceType !== "") params.sourceType = Number(f.sourceType);
    if (f.status !== "") params.status = f.status;
    if (f.isActive !== null) params.isActive = f.isActive;
    if (f.dateFrom) params.startDate = f.dateFrom;
    if (f.dateTo) params.endDate = f.dateTo;
    return params;
}
