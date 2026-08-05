"use client";

import Link from "next/link";
import { months, money } from "@/lib/format";
import type { CollectiveDeal } from "@/lib/mock";
import {
  collectiveDealTotal,
  collectivePaymentLabel,
  collectiveScheduledTotal,
  installmentDueLabel,
} from "@/lib/collective";

/**
 * Read-only view of a sales deal, used by Deals by month and Quarter view.
 * Those screens report on the schedule; editing happens in one place — the
 * Sales CRM — so nothing here pretends to be an input.
 */
export default function CollectiveDealSummary({
  deal,
  ownerName,
}: {
  deal: CollectiveDeal;
  ownerName: string;
}) {
  const scheduled = collectiveScheduledTotal(deal);
  const total = collectiveDealTotal(deal);
  const unscheduled = Math.round((total - scheduled) * 100) / 100;

  return (
    <div className="crm-detail-grid">
      <div className="crm-detail-title">
        <strong>{deal.dealName}</strong>
        <span>
          {money(total)} · {ownerName}
        </span>
      </div>

      <div className="detail-facts">
        <div>
          <span>Stage</span>
          <strong>{deal.stage}</strong>
        </div>
        <div>
          <span>Payment terms</span>
          <strong>{collectivePaymentLabel(deal)}</strong>
        </div>
        <div>
          <span>Business type</span>
          <strong>{deal.businessType || "New Business"}</strong>
        </div>
        <div>
          <span>Contact</span>
          <strong>{deal.contactName || "—"}</strong>
        </div>
        <div>
          <span>Email addresses</span>
          <strong>{deal.emailContact || "—"}</strong>
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
          <span>Scheduled</span>
          <strong>
            {money(scheduled)}
            {unscheduled ? ` (${money(unscheduled)} unscheduled)` : ""}
          </strong>
        </div>
      </div>

      <div className="field wide">
        <label>Invoices in this deal</label>
        {deal.installments.length ? (
          <ul className="installment-list">
            {deal.installments.map((installment) => (
              <li key={installment.monthIndex}>
                <strong>{months[installment.monthIndex]}</strong>
                <span>{money(installment.amount)}</span>
                <em>{installment.stage}</em>
                <small>
                  {installment.xeroInvoiceNumber ||
                    // This payment's own date and terms, not the deal's default.
                    installmentDueLabel(
                      installment.monthIndex,
                      installment.paymentTerm || deal.paymentTerm,
                      installment.customPaymentDays ?? deal.customPaymentDays,
                      installment.dueDate,
                    )}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <div className="notice">No payments scheduled yet.</div>
        )}
      </div>

      {deal.notes ? (
        <div className="field wide">
          <label>Notes</label>
          <p className="detail-note">{deal.notes}</p>
        </div>
      ) : null}

      <div className="field wide">
        <Link className="primary button-link" href="/collective/collective-crm">
          Edit this deal in the Sales CRM
        </Link>
      </div>
    </div>
  );
}
