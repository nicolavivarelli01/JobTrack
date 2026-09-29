import type { DateOrder } from "@/lib/import/types";

/** Lowercase, trimmed, single-spaced: the key used to compare cell values. */
export function normalizeValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const isoDatePattern = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[T\s])/;
const numericDatePattern =
  /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:$|[T\s,])/;

/**
 * Parses ISO, numeric (in the given day/month order), Excel serial, and
 * written-out dates. Returns YYYY-MM-DD, or null when the value isn't a date.
 */
export function parseDateValue(raw: string, order: DateOrder): string | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(isoDatePattern);
  if (iso) {
    const [year, month, day] = iso.slice(1, 4).map(Number);
    return isValidDate(year, month, day)
      ? formatDateParts(year, month, day)
      : null;
  }

  const numeric = value.match(numericDatePattern);
  if (numeric) {
    const [first, second, rawYear] = numeric.slice(1, 4).map(Number);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const [month, day] = order === "mdy" ? [first, second] : [second, first];
    return isValidDate(year, month, day)
      ? formatDateParts(year, month, day)
      : null;
  }

  // Excel date serials count days from 1899-12-30, e.g. 45566.
  if (/^\d{5}$/.test(value)) {
    const serial = Number(value);
    if (serial <= 20000 || serial >= 80000) return null;
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
    return formatDateParts(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  // "Sep 5, 2025" or "5 September 2025". Requiring a letter keeps plain
  // numbers from being read as timestamps.
  if (/[a-z]/i.test(value) && /\d{4}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return formatDateParts(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );
    }
  }

  return null;
}

/**
 * Decides whether 03/04/2025 means March 4 or April 3 by looking for a value
 * where one side is above 12. `ambiguous` means every value fits both, so the
 * user should choose.
 */
export function detectDateOrder(values: string[]): {
  order: DateOrder;
  ambiguous: boolean;
} {
  let monthFirst = false;
  let dayFirst = false;
  let hasNumericDates = false;

  for (const value of values) {
    const match = value.trim().match(numericDatePattern);
    if (!match) continue;
    hasNumericDates = true;
    if (Number(match[1]) > 12) dayFirst = true;
    if (Number(match[2]) > 12) monthFirst = true;
  }

  if (dayFirst && !monthFirst) return { order: "dmy", ambiguous: false };
  if (monthFirst && !dayFirst) return { order: "mdy", ambiguous: false };
  return { order: "mdy", ambiguous: hasNumericDates };
}

/** Date plus optional time ("3:30 pm"), as an ISO timestamp. Defaults to 9:00. */
export function parseDateTimeValue(
  raw: string,
  order: DateOrder,
): string | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const day = parseDateValue(value, order);
  if (!day) return null;

  const time = value.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  let hours = time ? Number(time[1]) : 9;
  const minutes = time ? Number(time[2]) : 0;
  const meridiem = time?.[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date, hours, minutes).toISOString();
}

export function parseBoolean(raw: string) {
  return /^(yes|y|true|1|x|si|sì|✓|✔)$/i.test(raw.trim());
}

/** Adds https:// to bare domains like "acme.com/jobs" so they work as links. */
export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value || /^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value) ? `https://${value}` : value;
}
