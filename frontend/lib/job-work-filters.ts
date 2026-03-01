import { JobWorkStatus } from "@/types";

export interface JobWorkFiltersState {
    search: string;
    partyIds: number[];
    status: JobWorkStatus | "";
    dateFrom: string;
    dateTo: string;
    isActive: boolean | null;
}

export const initialJobWorkFilters: JobWorkFiltersState = {
    search: "",
    partyIds: [],
    status: "",
    dateFrom: "",
    dateTo: "",
    isActive: null,
};

export function hasActiveJobWorkFilters(f: JobWorkFiltersState) {
    return (
        f.search !== "" ||
        f.partyIds.length > 0 ||
        f.status !== "" ||
        f.dateFrom !== "" ||
        f.dateTo !== "" ||
        f.isActive !== null
    );
}
