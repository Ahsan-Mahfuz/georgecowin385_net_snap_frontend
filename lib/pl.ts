// P&L computation mirrored from the prototype (app.js). Static/UI-only.
import { months, sum, columnTotals } from "./format";
import { allDeals, defaultOverheads, defaultTargets, Deal } from "./mock";

export type PlMode = "live" | "pipeline";

export function scopedDeals(mode: PlMode = "live", managerId: string | null = null): Deal[] {
  return allDeals.filter((deal) => {
    if (managerId && deal.managerId !== managerId) return false;
    if (mode === "pipeline") return deal.status === "Confirmed" || deal.status === "Pipeline";
    return deal.status === "Confirmed";
  });
}

export function dealRevenue(mode: PlMode = "live", managerId: string | null = null): number[] {
  return months.map((_, index) =>
    scopedDeals(mode, managerId).reduce((total, deal) => total + Number(deal.monthValues[index] || 0), 0)
  );
}

export function dealCost(mode: PlMode = "live", managerId: string | null = null): number[] {
  return months.map((_, index) =>
    scopedDeals(mode, managerId).reduce((total, deal) => {
      const revenueCost = Number(deal.monthValues[index] || 0) * (Number(deal.costRate || 0) / 100);
      return total + revenueCost;
    }, 0)
  );
}

export function computedOverheads() {
  return defaultOverheads;
}

export interface PlModel {
  target: number[];
  actual: number[];
  variation: number[];
  cos: number[];
  overheads: number[];
  netProfit: number[];
}

export function plModel(mode: PlMode = "live"): PlModel {
  const target = defaultTargets;
  const actual = dealRevenue(mode);
  const variation = months.map((_, index) => actual[index] - target[index]);
  const cos = dealCost(mode);
  const overheads = columnTotals(computedOverheads());
  const netProfit = months.map((_, index) => actual[index] - cos[index] - overheads[index]);
  return { target, actual, variation, cos, overheads, netProfit };
}

export function totalOf(values: number[]): number {
  return sum(values);
}
