"use client";

import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";
const selectClass =
  "h-9 w-full min-w-0 rounded-lg border border-secondary-200 bg-white pl-2 pr-7 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 appearance-none cursor-pointer transition-colors";

export interface PageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
  label?: string;
  className?: string;
}

/**
 * Compact row count selector (25, 50, 75, 100, ALL). Stays narrow so it never forces a new row.
 */
export function PageSizeSelect({ value, onChange, label = "Rows", className }: PageSizeSelectProps) {
  return (
    <div className={cn("min-w-0 w-20 shrink-0 max-w-[5.5rem]", className)}>
      <label className={filterLabelClass}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={selectClass}
        aria-label={label}
      >
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };
