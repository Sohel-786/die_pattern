'use client';

import * as React from 'react';
import { MultiSelectSearch } from '@/components/ui/multi-select-search';
import { useInfiniteItemsForFilter, ItemFilterRow } from '@/hooks/use-items';
import { useDebounce } from '@/hooks/use-debounce';

interface ItemInfiniteSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ItemInfiniteSelect({
  value,
  onChange,
  label = "Item",
  placeholder = "All items",
  className,
}: ItemInfiniteSelectProps) {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading
  } = useInfiniteItemsForFilter(debouncedSearch);

  const options = React.useMemo(() => {
    if (!data) return [];
    
    // Flatten all pages into a single list of options
    const allItems = data.pages.flatMap(page => (page.data as ItemFilterRow[]) || []);
    
    // Convert to MultiSelectSearchOption format
    return allItems.map(item => ({
      value: item.id,
      label: [item.currentName, item.mainPartName].filter(Boolean).join(" – ") || `Item ${item.id}`
    }));
  }, [data]);

  return (
    <MultiSelectSearch
      label={label}
      placeholder={placeholder}
      options={options}
      value={value}
      onChange={(v) => onChange(v as number[])}
      onSearchChange={setSearch}
      onLoadMore={fetchNextPage}
      hasNextPage={hasNextPage}
      isLoadingMore={isFetchingNextPage}
      className={className}
      searchPlaceholder="Search item…"
    />
  );
}
