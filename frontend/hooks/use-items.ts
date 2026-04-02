'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface ItemFilterRow {
  id: number;
  mainPartName: string;
  currentName?: string | null;
  itemTypeName?: string | null;
  previousNames?: string[];
}

function getSelectedLocationId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('selectedOrgContext');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.locationId === 'number' ? parsed.locationId : null;
  } catch {
    return null;
  }
}

export function useInfiniteItemsForFilter(search?: string, itemTypeId?: number | string | null) {
  const locationId = getSelectedLocationId();
  return useInfiniteQuery({
    queryKey: ['items-for-filter-infinite', locationId, search, itemTypeId || null],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get('/items/for-filter', {
        params: {
          search: search || undefined,
          itemTypeId: itemTypeId || undefined,
          page: pageParam,
          pageSize: 20,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalCount = lastPage.totalCount || 0;
      const loadedSoFar = allPages.length * 20;
      return loadedSoFar < totalCount ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
