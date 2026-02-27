import { InwardSourceType } from "@/types";

export interface InwardFiltersState {
    search: string;
    vendorIds: number[];
    sourceType: InwardSourceType | "";
    sourceNo: string;
    isActive: boolean | null;
    dateFrom: string;
    dateTo: string;
}

export const initialInwardFilters: InwardFiltersState = {
    search: "",
    vendorIds: [],
    sourceType: "",
    sourceNo: "",
    isActive: null,
    dateFrom: "",
    dateTo: "",
};

export function hasActiveInwardFilters(f: InwardFiltersState) {
    return (
        f.search !== "" ||
        f.vendorIds.length > 0 ||
        f.sourceType !== "" ||
        f.sourceNo !== "" ||
        f.isActive !== null ||
        f.dateFrom !== "" ||
        f.dateTo !== ""
    );
}
