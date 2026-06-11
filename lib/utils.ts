import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Number of nights between two ISO YYYY-MM-DD dates (minimum 0, null if either date is missing/invalid). */
export function nightsBetween(stayStart?: string | null, stayEnd?: string | null): number | null {
  if (!stayStart || !stayEnd) return null;
  const start = new Date(`${stayStart}T00:00:00Z`).getTime();
  const end = new Date(`${stayEnd}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/**
 * Format a timestamp for display in the hotel's local timezone.
 * Defaults to Asia/Bangkok per §0.1 (Thailand resort deployment).
 */
export function formatDateTime(
  value: string | Date,
  timeZone: string = "Asia/Bangkok",
  locale: string = "en-US"
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Format a date-only value (e.g. stay dates) without a time component. */
export function formatDate(
  value: string | Date,
  timeZone: string = "Asia/Bangkok",
  locale: string = "en-US"
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(
  value: string | Date,
  timeZone: string = "Asia/Bangkok",
  locale: string = "en-US"
) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Compact relative time for the Notifications feed, e.g. "2m ago",
 * "3h ago", "5d ago". Falls back to a short date for older items.
 */
export function formatRelativeTime(value: string | Date, timeZone: string = "Asia/Bangkok") {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date, timeZone);
}

/**
 * Format an ISO timestamp as a "YYYY-MM-DDTHH:mm" string representing that
 * instant's wall-clock time in `timeZone`, suitable for the value of an
 * `<input type="datetime-local">`.
 */
export function toDatetimeLocalValue(value: string | Date, timeZone: string = "Asia/Bangkok"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * Parse a "YYYY-MM-DDTHH:mm" wall-clock string (from an
 * `<input type="datetime-local">`) as a moment in `timeZone`, returning the
 * equivalent ISO UTC timestamp, or `null` if the value is malformed.
 */
export function fromDatetimeLocalValue(value: string, timeZone: string = "Asia/Bangkok"): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  const guessUtcMs = Date.UTC(year, month - 1, day, hour, minute);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guessUtcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  const offsetMs = asIfUtc - guessUtcMs;

  const result = new Date(guessUtcMs - offsetMs);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/** Returns initials from a full name, e.g. "David Morrison" -> "DM" */
export function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * Deterministic color assignment for avatars, based on the chart palette
 * tokens so it always matches the active hotel theme.
 */
const AVATAR_COLOR_VARS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
];

export function getAvatarColorVar(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLOR_VARS.length;
  return `var(${AVATAR_COLOR_VARS[index]})`;
}
