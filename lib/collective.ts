// Shared rules for the Cowshed Collective sales deals. The CRM, Deals by month
// and Quarter view all import from here so the three screens can never disagree
// about what counts as live, what blocks a stage move, or when a payment
// schedule is fully allocated.

import { months, sum } from "./format";
import {
  collectiveLiveStages,
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

/**
 * When an installment is actually due: end of its scheduled month plus the
 * payment terms. This is what makes the terms "align with the schedule" —
 * every month gets its own due date rather than one date for the whole deal.
 */
export function installmentDueLabel(
  monthIndex: number,
  paymentTerm: string,
  customPaymentDays: number,
): string {
  const days = paymentTermDays(paymentTerm, customPaymentDays);
  if (days === 0) return `Due in ${months[monthIndex]}`;
  // Month labels are "Mon YY" for the portal's working year.
  const year = 2000 + Number(String(months[monthIndex]).split(" ")[1] || 26);
  const due = new Date(year, monthIndex + 1, 0); // last day of that month
  due.setDate(due.getDate() + days);
  return `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}`;
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
