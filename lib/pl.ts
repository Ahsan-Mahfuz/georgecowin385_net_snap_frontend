// P&L computation. Pure functions — the caller passes live deals/overheads/targets
// (fetched from the backend), so there is no dependency on any mock data.
import { months, sum, columnTotals } from "./format";
import { Deal, OverheadRow } from "./mock";

export type PlMode = "live" | "pipeline";

export function scopedDeals(deals: Deal[], mode: PlMode = "live", managerId: string | null = null): Deal[] {
  return deals.filter((deal) => {
    if (managerId && deal.managerId !== managerId) return false;
    if (mode === "pipeline") return deal.status === "Confirmed" || deal.status === "Pipeline";
    return deal.status === "Confirmed";
  });
}

export function dealRevenue(deals: Deal[], mode: PlMode = "live", managerId: string | null = null): number[] {
  const scoped = scopedDeals(deals, mode, managerId);
  return months.map((_, index) =>
    scoped.reduce((total, deal) => total + Number(deal.monthValues[index] || 0), 0),
  );
}

export function dealCost(deals: Deal[], mode: PlMode = "live", managerId: string | null = null): number[] {
  const scoped = scopedDeals(deals, mode, managerId);
  return months.map((_, index) =>
    scoped.reduce((total, deal) => {
      const revenueCost = Number(deal.monthValues[index] || 0) * (Number(deal.costRate || 0) / 100);
      return total + revenueCost;
    }, 0),
  );
}

export interface PlModel {
  target: number[];
  actual: number[];
  variation: number[];
  cos: number[];
  overheads: number[];
  netProfit: number[];
}

export function plModel(
  deals: Deal[],
  overheads: OverheadRow[],
  targets: number[],
  mode: PlMode = "live",
): PlModel {
  const target = months.map((_, i) => Number(targets[i] || 0));
  const actual = dealRevenue(deals, mode);
  const variation = months.map((_, index) => actual[index] - target[index]);
  const cos = dealCost(deals, mode);
  const overheadTotals = columnTotals(overheads);
  const netProfit = months.map((_, index) => actual[index] - cos[index] - overheadTotals[index]);
  return { target, actual, variation, cos, overheads: overheadTotals, netProfit };
}

export function totalOf(values: number[]): number {
  return sum(values);
}
