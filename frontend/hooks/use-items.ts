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

export function useInfiniteItemsForFilter(search?: string, itemTypeId?: number | string | null) {
  return useInfiniteQuery({
    queryKey: ['items-for-filter-infinite', search, itemTypeId || null],
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
