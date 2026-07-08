// Formatting helpers mirrored from the prototype (app.js).

export const months = [
  "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26",
  "Jul 26", "Aug 26", "Sep 26", "Oct 26", "Nov 26", "Dec 26",
];

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
