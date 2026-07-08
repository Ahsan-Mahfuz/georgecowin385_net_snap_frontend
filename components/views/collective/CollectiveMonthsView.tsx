"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import {
  collectiveSalesUsers,
  collectiveStages,
  paymentTerms,
  defaultCollectiveDeals,
  type CollectiveDeal,
} from "@/lib/mock";

function collectiveUserName(id: string): string {
  return (collectiveSalesUsers.find((user) => user.id === id) || ({} as { name?: string })).name || "Unassigned";
}

function collectiveDealTotal(deal: CollectiveDeal): number {
  return Number(deal.amount || sum(deal.monthValues || []));
}

function collectiveScheduledTotal(deal: CollectiveDeal): number {
  return sum(deal.monthValues || []);
}

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

// Admin view: all collective deals are visible. Owner/stage filters default to "all".
function collectiveFilteredDeals(): CollectiveDeal[] {
  return [...defaultCollectiveDeals].sort(
    (a, b) =>
      collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
      a.company.localeCompare(b.company),
  );
}

export default function CollectiveMonthsView() {
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const deals = collectiveFilteredDeals();
  const monthlyTotals = months.map((_, index) =>
    deals.reduce((total, deal) => total + Number((deal.monthValues || [])[index] || 0), 0),
  );
  const selectedMonth = monthFilter === "all" ? null : Number(monthFilter);
  const monthDeals =
    selectedMonth === null
      ? []
      : deals.filter((deal) => Number((deal.monthValues || [])[selectedMonth] || 0) > 0);

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) || null;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Deals by month</h1>
        </div>
        <div className="asof">Expected cash due to land by payment month</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Monthly cash view</h2>
          <div className="section-actions">
            <select
              className="compact-select"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">Show totals only</option>
              {months.map((month, index) => (
                <option key={month} value={String(index)}>
                  {month}
                </option>
              ))}
            </select>
            <span className="pill">{money(sum(monthlyTotals))}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {months.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTotals.map((total, index) => (
                  <td key={index}>
                    {total ? (
                      <button
                        className="table-link"
                        type="button"
                        onClick={() => setMonthFilter(String(index))}
                      >
                        {money(total)}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
                <td>{money(sum(monthlyTotals))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {selectedMonth !== null ? (
        <section className="section soft-section">
          <div className="section-head">
            <h2>{months[selectedMonth]} deal breakdown</h2>
            <span className="pill">{money(monthlyTotals[selectedMonth])}</span>
          </div>
          <div className="section-body manager-list">
            {monthDeals.length ? (
              monthDeals.map((deal) => (
                <button
                  key={deal.id}
                  className="deal-card"
                  type="button"
                  onClick={() => setSelectedDealId(deal.id)}
                >
                  <div>
                    <strong>{deal.company}</strong>
                    <small>
                      {deal.dealName} · {collectiveUserName(deal.ownerId)} · {deal.stage}
                    </small>
                  </div>
                  <strong>{money((deal.monthValues || [])[selectedMonth])}</strong>
                </button>
              ))
            ) : (
              <div className="notice">No scheduled cash for this month.</div>
            )}
          </div>
        </section>
      ) : null}

      {selectedDeal ? (
        <div className="crm-detail-overlay">
          <section
            className="crm-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedDeal.company} sales deal details`}
          >
            <button
              className="crm-detail-close"
              type="button"
              onClick={() => setSelectedDealId(null)}
              aria-label="Close deal details"
            >
              ×
            </button>
            <div className="section-head">
              <h2>{selectedDeal.company}</h2>
              <span className="pill confirmed">{selectedDeal.stage}</span>
            </div>
            <div className="section-body">
              <div className="crm-detail-grid">
                <div className="crm-detail-title">
                  <strong>{selectedDeal.dealName}</strong>
                  <span>
                    {money(collectiveDealTotal(selectedDeal))} · {collectiveUserName(selectedDeal.ownerId)}
                  </span>
                </div>
                <div className="field">
                  <label>Company</label>
                  <input defaultValue={selectedDeal.company} />
                </div>
                <div className="field">
                  <label>Deal name</label>
                  <input defaultValue={selectedDeal.dealName} />
                </div>
                <div className="field">
                  <label>Sales owner</label>
                  <select className="compact-select mini-select" defaultValue={selectedDeal.ownerId}>
                    {collectiveSalesUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Stage</label>
                  <select className="compact-select mini-select" defaultValue={selectedDeal.stage}>
                    {collectiveStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Deal amount</label>
                  <input defaultValue={currencyInput(selectedDeal.amount)} />
                </div>
                <div className="field">
                  <label>Payment terms</label>
                  <select className="compact-select mini-select" defaultValue={selectedDeal.paymentTerm}>
                    {paymentTerms.map((term) => (
                      <option key={term.value} value={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Own time in days</label>
                  <input defaultValue={selectedDeal.customPaymentDays || ""} />
                </div>
                <div className="field">
                  <label>Contact name</label>
                  <input defaultValue={selectedDeal.contactName || ""} />
                </div>
                <div className="field">
                  <label>Email addresses</label>
                  <input defaultValue={selectedDeal.emailContact || ""} />
                </div>
                <div className="field wide">
                  <label>Notes</label>
                  <textarea defaultValue={selectedDeal.notes || ""} />
                </div>
                <div className="field wide">
                  <label>Payment schedule</label>
                  <div className="collective-payment-grid">
                    {months.map((month, index) => (
                      <label key={month}>
                        <span>{month}</span>
                        <input
                          defaultValue={Number((selectedDeal.monthValues || [])[index] || 0) || ""}
                          inputMode="decimal"
                        />
                      </label>
                    ))}
                  </div>
                  <small className="field-hint">
                    Scheduled total: {money(collectiveScheduledTotal(selectedDeal))}
                  </small>
                </div>
                <div className="field wide">
                  <label>Collective Xero</label>
                  <div className="xero-status-card">
                    <strong>{selectedDeal.xeroInvoiceId || "No draft invoice yet"}</strong>
                    <span>
                      {selectedDeal.xeroStatus ||
                        "Uses the separate Cowshed Collective Xero connection in the real build."}
                    </span>
                    <div className="section-actions">
                      <button className="secondary" type="button">
                        {selectedDeal.xeroInvoiceId
                          ? "Update draft in Collective Xero"
                          : "Create draft in Collective Xero"}
                      </button>
                      {selectedDeal.xeroInvoiceId ? (
                        <button className="secondary" type="button">
                          Mark invoiced
                        </button>
                      ) : null}
                      {selectedDeal.xeroInvoiceId ? (
                        <button className="secondary" type="button">
                          Mark paid/reconciled
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
