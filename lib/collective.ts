// Shared rules for the Cowshed Collective sales deals. The CRM, Deals by month
// and Quarter view all import from here so the three screens can never disagree
// about what counts as live, what blocks a stage move, or when a payment
// schedule is fully allocated.

import { months, sum } from "./format";
import {
  collectiveLiveStages,
  collectiveStages,
  paymentTerms,
  type CollectiveDeal,
  type Installment,
} from "./mock";

export type CollectiveScope = "all" | "live" | "pipeline";

export function collectiveDealTotal(deal: CollectiveDeal): number {
  return Number(deal.amount || sum(deal.monthValues || []));
}

export function collectiveScheduledTotal(deal: CollectiveDeal): number {
  return sum(deal.monthValues || []);
}

/** Contract signed onwards is committed revenue; before that it is pipeline. */
export function isCollectiveLive(deal: CollectiveDeal): boolean {
  return collectiveLiveStages.includes(deal.stage);
}

export function scopedCollectiveDeals(
  deals: CollectiveDeal[],
  scope: CollectiveScope,
): CollectiveDeal[] {
  if (scope === "all") return deals;
  return deals.filter((deal) => (scope === "live" ? isCollectiveLive(deal) : !isCollectiveLive(deal)));
}

export function collectivePaymentLabel(deal: CollectiveDeal): string {
  if (deal.paymentTerm === "custom") return `${Number(deal.customPaymentDays || 0)} days`;
  return (paymentTerms.find((term) => term.value === deal.paymentTerm) || paymentTerms[1]).label;
}

/** Days a payment is due after the month it lands in, from the deal's terms. */
export function paymentTermDays(paymentTerm: string, customPaymentDays: number): number {
  if (paymentTerm === "custom") return Number(customPaymentDays || 0);
  return paymentTerms.find((term) => term.value === paymentTerm)?.days ?? 30;
}

/** The year the portal's month labels ("Mon YY") belong to. */
function scheduleYear(monthIndex: number): number {
  return 2000 + Number(String(months[monthIndex]).split(" ")[1] || 26);
}

const shortDate = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

/**
 * When an installment is due, as a yyyy-mm-dd date.
 *
 * A date picked on the schedule calendar wins outright — that is the whole point
 * of picking one, and it is what drives the "move this to To Be Invoiced"
 * reminder. Otherwise it falls back to the old rule: end of the scheduled month
 * plus that payment's own terms.
 */
export function installmentDueDate(
  monthIndex: number,
  paymentTerm: string,
  customPaymentDays: number,
  exactDate?: string,
): string {
  if (exactDate) return exactDate;
  const days = paymentTermDays(paymentTerm, customPaymentDays);
  const due = new Date(scheduleYear(monthIndex), monthIndex + 1, 0); // last day of that month
  due.setDate(due.getDate() + days);
  const month = String(due.getMonth() + 1).padStart(2, "0");
  const day = String(due.getDate()).padStart(2, "0");
  return `${due.getFullYear()}-${month}-${day}`;
}

/**
 * When an installment is actually due, as a label. This is what makes the terms
 * "align with the schedule" — every month gets its own due date rather than one
 * date for the whole deal.
 */
export function installmentDueLabel(
  monthIndex: number,
  paymentTerm: string,
  customPaymentDays: number,
  exactDate?: string,
): string {
  if (exactDate) {
    const picked = new Date(`${exactDate}T00:00:00`);
    return Number.isNaN(picked.getTime()) ? `Due ${exactDate}` : `Due ${shortDate(picked)}`;
  }
  const days = paymentTermDays(paymentTerm, customPaymentDays);
  if (days === 0) return `Due in ${months[monthIndex]}`;
  const due = new Date(scheduleYear(monthIndex), monthIndex + 1, 0);
  due.setDate(due.getDate() + days);
  return `Due ${shortDate(due)}`;
}

/** Whole days from today until a yyyy-mm-dd date; negative once it has passed. */
export function daysUntil(isoDay: string, today = new Date()): number | null {
  if (!isoDay) return null;
  const target = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/**
 * The chase label on a payment card. Xero's own overdue count wins once the
 * invoice exists there; before that it is worked out from the due date, which is
 * what tells a rep a payment needs moving to "To Be Invoiced".
 */
export function overdueLabel(installment: Installment, deal: CollectiveDeal): string {
  const fromXero = Number(installment.overdueDays || 0);
  if (fromXero > 0) return `${fromXero} day${fromXero === 1 ? "" : "s"} overdue`;

  if (installment.stage !== "Scheduled") return "";
  const due = installmentDueDate(
    installment.monthIndex,
    installment.paymentTerm || deal.paymentTerm,
    installment.customPaymentDays ?? deal.customPaymentDays,
    installment.dueDate,
  );
  const days = daysUntil(due);
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late to invoice`;
  if (days === 0) return "Invoice today";
  if (days <= 7) return `Invoice in ${days} day${days === 1 ? "" : "s"}`;
  return "";
}

/** How many deals and how much money sit in each stage. */
export interface StageTally {
  stage: string;
  count: number;
  total: number;
}

/**
 * Deals grouped by stage, with a money total each. Shared by the CRM, Deals by
 * month and Quarter view so the three screens can never disagree about what a
 * stage is worth. `valueOf` lets each screen count what it cares about — the
 * whole deal on the CRM, only the months in view on the other two.
 */
export function dealsByStage(
  deals: CollectiveDeal[],
  valueOf: (deal: CollectiveDeal) => number = collectiveDealTotal,
): StageTally[] {
  return collectiveStages
    .map((stage) => {
      const inStage = deals.filter((deal) => deal.stage === stage);
      return {
        stage,
        count: inStage.length,
        total: inStage.reduce((running, deal) => running + valueOf(deal), 0),
      };
    })
    .filter((tally) => tally.count > 0);
}

/** The fields Finance needs before anything can be invoiced. */
export function invoiceBlockReason(deal: Partial<CollectiveDeal>): string | null {
  const missing: string[] = [];
  if (!deal.paymentTerm) missing.push("Payment terms");
  if (!deal.dealName?.trim()) missing.push("Campaign name");
  if (!deal.emailContact?.trim()) missing.push("Email addresses");
  if (!deal.companyAddress?.trim()) missing.push("Company address");
  if (!deal.poNumber?.trim() && !deal.noPoNumber) missing.push("PO number (or tick “No PO”)");
  return missing.length ? missing.join(", ") : null;
}

/**
 * Client-side mirror of assertStageAllowed in collectiveDeal.service.ts, so a
 * blocked drop explains itself immediately instead of bouncing off a 400. The
 * server stays the authority.
 */
export function collectiveStageBlockReason(
  deal: Partial<CollectiveDeal>,
  stage: string,
): string | null {
  if (collectiveLiveStages.includes(stage) && !deal.contractUrl && !deal.noContract) {
    return `Upload the signed contract, or tick “No contract”, before moving this deal to ${stage}.`;
  }
  if (stage === "To Be Invoiced") {
    const missing = invoiceBlockReason(deal);
    if (missing) return `Add ${missing} before moving this deal to To Be Invoiced.`;
  }
  return null;
}

/** Same gate, applied to a single scheduled payment. */
export function installmentBlockReason(
  deal: CollectiveDeal,
  installment: Installment,
  stage: string,
): string | null {
  if (stage === "Scheduled") return null;
  if (!deal.contractUrl && !deal.noContract) {
    return `Upload the signed contract, or tick “No contract”, before invoicing the ${months[installment.monthIndex]} payment.`;
  }
  const missing = invoiceBlockReason(deal);
  return missing ? `Add ${missing} before invoicing the ${months[installment.monthIndex]} payment.` : null;
}

/**
 * A percentage of the deal, as money. Rounded to the penny so the schedule adds
 * back up to the deal amount rather than drifting by fractions.
 */
export function amountFromPercent(dealAmount: number, percent: number): number {
  const value = (Number(dealAmount || 0) * Number(percent || 0)) / 100;
  return Math.round(value * 100) / 100;
}

/** The reverse — what share of the deal an amount represents. */
export function percentFromAmount(dealAmount: number, amount: number): number {
  const total = Number(dealAmount || 0);
  if (!total) return 0;
  return Math.round((Number(amount || 0) / total) * 10000) / 100;
}

export interface Allocation {
  total: number;
  scheduled: number;
  remaining: number;
  monthsUsed: number;
  tone: "ok" | "under" | "over" | "empty";
  message: string;
}

/**
 * How much of the deal amount has been placed into the payment schedule. Shown
 * under the schedule so a rep can see at a glance what is still unaccounted for.
 */
export function scheduleAllocation(amount: number, monthValues: number[]): Allocation {
  const total = Number(amount || 0);
  const scheduled = sum(monthValues.map((value) => Number(value || 0)));
  const remaining = Math.round((total - scheduled) * 100) / 100;
  const monthsUsed = monthValues.filter((value) => Number(value || 0) > 0).length;

  const gbp = (value: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.abs(value));

  if (!total) {
    return {
      total,
      scheduled,
      remaining,
      monthsUsed,
      tone: "empty",
      message: "Enter the deal amount to see how much is left to schedule.",
    };
  }
  if (remaining > 0.005) {
    return {
      total,
      scheduled,
      remaining,
      monthsUsed,
      tone: "under",
      message: `${gbp(scheduled)} of ${gbp(total)} scheduled — ${gbp(remaining)} still to add so all money is accounted for.`,
    };
  }
  if (remaining < -0.005) {
    return {
      total,
      scheduled,
      remaining,
      monthsUsed,
      tone: "over",
      message: `${gbp(scheduled)} scheduled against a ${gbp(total)} deal — ${gbp(remaining)} too much. Reduce a month or raise the deal amount.`,
    };
  }
  return {
    total,
    scheduled,
    remaining,
    monthsUsed,
    tone: "ok",
    message: `All ${gbp(total)} accounted for across ${monthsUsed} ${monthsUsed === 1 ? "month" : "months"} — ${monthsUsed} ${monthsUsed === 1 ? "invoice" : "separate invoices"} to raise.`,
  };
}
