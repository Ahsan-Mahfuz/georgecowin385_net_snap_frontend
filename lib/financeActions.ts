/**
 * What Finance still has to do, defined once.
 *
 * The sidebar badge and the Finance Actions screen used to work this out
 * separately, and they disagreed: the badge counted every deal whose Xero draft
 * had failed, wherever it had got to, while the screen only listed failures
 * sitting at "To Be Invoiced". So the badge said 3, Finance opened the page, and
 * found nothing — "Finance actions is showing as having notifications, but we
 * can't seem to work out what they are for".
 *
 * Both now read these buckets, so the number on the badge is exactly the number
 * of cards on the page.
 */
import type { Deal } from "@/lib/mock";

export interface FinanceBuckets {
  /** At To Be Invoiced with no Xero draft raised yet. */
  needsDraft: Deal[];
  /** Xero refused the draft — it needs looking at before anything else happens. */
  draftFailed: Deal[];
  /** Draft exists in Xero but has not been sent to the brand. */
  awaitingSend: Deal[];
  /** Sent to the brand, money not in yet. */
  awaitingPayment: Deal[];
  /** Brand has paid; the talent has not been paid their share. */
  talentToPay: Deal[];
  /** Settled — no action left, kept for the record. */
  paidToTalent: Deal[];
}

export function financeBuckets(deals: Deal[]): FinanceBuckets {
  // A refused draft is its own problem: it is not "waiting for a draft", it is
  // waiting for a person, so it never appears in needsDraft as well.
  const draftFailed = deals.filter((d) => d.financeStatus === "Xero draft failed");
  const isFailed = (d: Deal) => d.financeStatus === "Xero draft failed";

  return {
    draftFailed,
    needsDraft: deals.filter((d) => d.stage === "To Be Invoiced" && !d.xeroInvoiceId && !isFailed(d)),
    awaitingSend: deals.filter(
      (d) =>
        d.xeroInvoiceId &&
        (d.xeroState === "DRAFT" || !d.xeroState) &&
        d.financeStatus !== "Paid" &&
        !isFailed(d),
    ),
    awaitingPayment: deals.filter(
      (d) =>
        d.xeroInvoiceId &&
        ["AUTHORISED", "SUBMITTED"].includes(d.xeroState || "") &&
        d.financeStatus !== "Paid",
    ),
    talentToPay: deals.filter((d) => d.financeStatus === "Paid" && d.remittanceStatus !== "Paid"),
    paidToTalent: deals
      .filter((d) => d.remittanceStatus === "Paid")
      .sort((a, b) => (b.remittancePaidAt || "").localeCompare(a.remittancePaidAt || "")),
  };
}

/**
 * The badge number. Only the buckets that need a person to *do* something —
 * "awaiting payment" is the brand's move, not Finance's, so it is shown on the
 * page but never nags from the sidebar.
 */
export function financeActionCount(deals: Deal[]): number {
  const b = financeBuckets(deals);
  return b.needsDraft.length + b.draftFailed.length + b.talentToPay.length;
}
