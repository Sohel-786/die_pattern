import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format as formatDateFns, isValid as isValidDateFns } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateInput = string | number | Date | null | undefined;

function toValidDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isValidDateFns(d) ? d : null;
}

/** UI date format: dd/MM/yyyy */
export function formatDate(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "dd/MM/yyyy");
}

/** UI date-time format: dd/MM/yyyy, hh:mm AM/PM */
export function formatDateTime(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "dd/MM/yyyy, hh:mm a");
}

/** UI time format: hh:mm AM/PM */
export function formatTime(date: DateInput): string {
  const d = toValidDate(date);
  if (!d) return "—";
  return formatDateFns(d, "hh:mm a");
}

/** For date-only strings (yyyy-MM-dd) stored in state, show with time at midnight. */
export function formatDateOnlyAsDateTime(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "—";
  const d = toValidDate(`${dateOnly}T00:00:00`);
  if (!d) return "—";
  return formatDateTime(d);
}

/** For date-only strings (yyyy-MM-dd) stored in state, show date only. */
export function formatDateOnly(dateOnly: string | null | undefined): string {
  if (!dateOnly) return "—";
  const d = toValidDate(`${dateOnly}T00:00:00`);
  if (!d) return "—";
  return formatDate(d);
}
