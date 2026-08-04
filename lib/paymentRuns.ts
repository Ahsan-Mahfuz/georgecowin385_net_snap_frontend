import type { ApiPaymentRun } from "@/redux/api/types";

/**
 * Payment run dates, shared by every screen that shows one.
 *
 * `toISOString()` converts to UTC first, so a date built from local parts comes
 * back a day early through British Summer Time — which is why the run date on
 * screen and the due date on the Xero bill used to disagree by a day. Everything
 * here formats from local parts instead.
 */
export function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The historic rule, kept only as a fallback if no runs are configured. */
function ruleRunDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  if (date.getDay() === 6) date.setDate(date.getDate() - 1);
  if (date.getDay() === 0) date.setDate(date.getDate() - 2);
  return isoDate(date);
}

export function runDatesFrom(runs: ApiPaymentRun[]): string[] {
  return runs.map((run) => run.date).sort();
}

/**
 * The run a payment falls into: the first configured date on or after the
 * reference date. Falls back to the 14th / 28th rule when the schedule has run
 * out, so a date is always returned.
 */
export function nextRunDate(dates: string[], reference: Date = new Date()): string {
  const today = isoDate(reference);
  const next = dates.find((date) => date >= today);
  if (next) return next;
  const thisMonth = [14, 28].map((day) =>
    ruleRunDate(reference.getFullYear(), reference.getMonth(), day),
  );
  const fallback = thisMonth.find((date) => date >= today);
  if (fallback) return fallback;
  const nextMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  return ruleRunDate(nextMonth.getFullYear(), nextMonth.getMonth(), 14);
}

export function displayRunDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
