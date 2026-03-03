export interface TransferFiltersState {
    search: string;
    fromPartyId: number | null;
    toPartyId: number | null;
    dateFrom: string;
    dateTo: string;
    isActive: boolean | null;
}

export const initialTransferFilters: TransferFiltersState = {
    search: "",
    fromPartyId: null,
    toPartyId: null,
    dateFrom: "",
    dateTo: "",
    isActive: true,
};
