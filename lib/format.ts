// Formatting helpers mirrored from the prototype (app.js).

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// The first year the portal has data for. Year filter runs from here forward.
export const BASE_YEAR = 2025;

// Month column labels for a given calendar year, e.g. monthLabels(2027) → "Jan 27"…"Dec 27".
export function monthLabels(year: number): string[] {
  const yy = String(year % 100).padStart(2, "0");
  return MONTH_ABBR.map((m) => `${m} ${yy}`);
}

// Selectable years: BASE_YEAR up to the current calendar year (no future years).
export function availableYears(): number[] {
  const end = Math.max(new Date().getFullYear(), BASE_YEAR);
  const years: number[] = [];
  for (let y = BASE_YEAR; y <= end; y++) years.push(y);
  return years;
}

// Kept for backward compatibility — the fixed 2026 labels used by views not yet year-aware.
export const months = monthLabels(2026);

export const usdToGbpRate = 0.78;

export function money(value: number): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: Math.abs(amount) >= 10000 ? 0 : 2,
  }).format(amount);
}

export function currencyMoney(value: number, currency: "GBP" | "USD" = "GBP"): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: Math.abs(amount) >= 10000 ? 0 : 2,
  }).format(amount);
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

export function columnTotals(rows: { values: number[] }[]): number[] {
  return months.map((_, index) => rows.reduce((total, row) => total + Number(row.values[index] || 0), 0));
}

// The prototype fixes the model year to 2026; clamp the current month into range.
export function currentMonthIndex(): number {
  const now = new Date();
  if (now.getFullYear() !== 2026) return 6; // prototype demo default (July)
  return Math.min(11, Math.max(0, now.getMonth()));
}

export function slugify(value: string): string {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "item";
}

export function stageClass(stage: string): string {
  return `stage-${stage.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}
