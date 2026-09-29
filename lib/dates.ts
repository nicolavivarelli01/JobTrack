/** Parses a YYYY-MM-DD string at local noon so it never shifts a day across time zones. */
export function parseLocalDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

export function formatDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseLocalDate(value));
}

export function formatDateTime(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toDateTimeInputValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function startOfLocalDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function subtractMonths(value: Date, months: number) {
  const target = new Date(value.getFullYear(), value.getMonth() - months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  target.setDate(Math.min(value.getDate(), lastDay));
  return target;
}
