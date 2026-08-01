"use client";

import Link from "next/link";
import { money, months, sum } from "@/lib/format";
import type { Deal } from "@/lib/mock";

function displayDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The whole CRM deal behind a finance action. Finance asked to be able to click
 * an action and see everything the manager entered, without leaving the screen.
 */
export default function DealDetailModal({
  deal,
  managerName,
  onClose,
}: {
  deal: Deal;
  managerName: string;
  onClose: () => void;
}) {
  const scheduled = (deal.monthValues || [])
    .map((value, index) => ({ value: Number(value || 0), index }))
    .filter((entry) => entry.value > 0);

  return (
    <div className="crm-detail-overlay" onClick={onClose}>
      <section
        className="crm-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${deal.talentName} deal details`}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="crm-detail-close" type="button" aria-label="Close deal details" onClick={onClose}>
          ×
        </button>
        <div className="section-head">
          <h2>{deal.talentName}</h2>
          <span className="pill confirmed">{deal.stage || "Conversation"}</span>
        </div>
        <div className="section-body">
          <div className="crm-detail-title">
            <strong>{deal.campaignName || "No campaign"}</strong>
            <span>
              {money(sum(deal.monthValues || []))} · {deal.companyName || deal.company || "No brand"} ·{" "}
              {managerName}
            </span>
          </div>

          <div className="detail-facts">
            <div>
              <span>Brand</span>
              <strong>{deal.companyName || deal.company || "—"}</strong>
            </div>
            <div>
              <span>Manager</span>
              <strong>{managerName}</strong>
            </div>
            <div>
              <span>Approval</span>
              <strong>{deal.approvalStatus || "—"}</strong>
            </div>
            <div>
              <span>Payment terms</span>
              <strong>{deal.paymentTerms || deal.paymentTerm || "—"}</strong>
            </div>
            <div>
              <span>Email addresses</span>
              <strong>{deal.emailAddresses || deal.contactEmail || "—"}</strong>
            </div>
            <div>
              <span>Company address</span>
              <strong>{deal.companyAddress || "—"}</strong>
            </div>
            <div>
              <span>PO number</span>
              <strong>{deal.noPoNumber ? "No PO" : deal.poNumber || "—"}</strong>
            </div>
            <div>
              <span>Contract</span>
              <strong>{deal.noContract ? "No contract" : deal.contractUrl || "Not uploaded"}</strong>
            </div>
            <div>
              <span>Xero contact</span>
              <strong>{deal.xeroContactId ? deal.xeroContactName || "Linked" : "New contact"}</strong>
            </div>
            <div>
              <span>Xero invoice</span>
              <strong>{deal.xeroInvoiceNumber || deal.xeroInvoiceId || "Not raised"}</strong>
            </div>
            <div>
              <span>Xero state</span>
              <strong>{deal.xeroState || deal.financeStatus || "—"}</strong>
            </div>
            <div>
              <span>Due date</span>
              <strong>{displayDate(deal.xeroDueDate)}</strong>
            </div>
            <div>
              <span>Talent bill</span>
              <strong>{deal.xeroBillNumber || (deal.xeroBillId ? "Drafted" : "Not raised")}</strong>
            </div>
            <div>
              <span>Talent paid</span>
              <strong>{deal.remittanceStatus || "Not yet"}</strong>
            </div>
          </div>

          <div className="field wide">
            <label>Revenue schedule</label>
            {scheduled.length ? (
              <ul className="installment-list">
                {scheduled.map((entry) => (
                  <li key={entry.index}>
                    <strong>{months[entry.index]}</strong>
                    <span>{money(entry.value)}</span>
                    <em>{deal.stage}</em>
                    <small>{deal.currency || "GBP"}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notice">Nothing scheduled on this deal yet.</div>
            )}
          </div>

          <div className="field wide">
            <Link className="primary button-link" href="/creators/crm">
              Open in the CRM
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
