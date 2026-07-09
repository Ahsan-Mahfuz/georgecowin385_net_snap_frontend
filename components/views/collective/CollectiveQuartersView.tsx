"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum } from "@/lib/format";
import {
  collectiveStages,
  paymentTerms,
  type CollectiveDeal,
  type Profile,
} from "@/lib/mock";
import { useCollectiveTeam } from "@/hooks/useCollectiveTeam";
import { useGetCollectiveDealsQuery } from "@/redux/api/collectiveDealApi";
import { toCollectiveDeal } from "@/lib/adapters";

function collectiveDealTotal(deal: CollectiveDeal): number {
  return Number(deal.amount || sum(deal.monthValues || []));
}

function collectiveScheduledTotal(deal: CollectiveDeal): number {
  return sum(deal.monthValues || []);
}

function currencyInput(value: number | string | undefined): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CollectiveQuartersView() {
  const sessionUser = useSelector((s: RootState) => s.session.collectiveUser);
  const { users: collectiveSalesUsers } = useCollectiveTeam();
  const { data: dealData = [] } = useGetCollectiveDealsQuery();
  const collectiveUser: Profile | null = sessionUser;
  const collectiveUserName = (id: string): string =>
    collectiveSalesUsers.find((user) => user.id === id)?.name || "Unassigned";

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const visibleDeals =
    collectiveUser?.role === "admin"
      ? dealData.map(toCollectiveDeal)
      : dealData.map(toCollectiveDeal).filter((deal) => deal.ownerId === collectiveUser?.id);
  const deals = [...visibleDeals].sort(
    (a, b) =>
      collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
      a.company.localeCompare(b.company),
  );
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const quarterValues = [0, 1, 2, 3].map((quarterIndex) =>
    deals.reduce((total, deal) => {
      const start = quarterIndex * 3;
      return total + sum((deal.monthValues || []).slice(start, start + 3));
    }, 0)
  );

  const selectedDeal = deals.find((item) => item.id === selectedDealId) || null;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Quarter view</h1>
        </div>
        <div className="asof">Quarterly sales and expected payment timing</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Quarter totals</h2>
          <span className="pill">{money(sum(quarterValues))}</span>
        </div>
        <div className="quarter-grid">
          {quarterLabels.map((label, index) => (
            <div className="quarter-tile" key={label}>
              <span>{label}</span>
              <strong>{money(quarterValues[index])}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Deals by quarter</h2>
          <span className="pill">{deals.length} deals</span>
        </div>
        <div className="section-body collective-quarter-list">
          {quarterLabels.map((label, index) => {
            const start = index * 3;
            const quarterDeals = deals.filter(
              (deal) => sum((deal.monthValues || []).slice(start, start + 3)) > 0
            );
            return (
              <div className="quarter-column" key={label}>
                <h3>{label}</h3>
                {quarterDeals.length ? (
                  quarterDeals.map((deal) => (
                    <button
                      className="deal-card"
                      type="button"
                      key={deal.id}
                      onClick={() => setSelectedDealId(deal.id)}
                    >
                      <div>
                        <strong>{deal.company}</strong>
                        <small>
                          {deal.dealName} · {deal.stage}
                        </small>
                      </div>
                      <strong>{money(sum((deal.monthValues || []).slice(start, start + 3)))}</strong>
                    </button>
                  ))
                ) : (
                  <div className="notice">No payments scheduled.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
              aria-label="Close deal details"
              onClick={() => setSelectedDealId(null)}
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
                  <select
                    className="compact-select mini-select"
                    defaultValue={selectedDeal.ownerId}
                    disabled={collectiveUser?.role !== "admin"}
                  >
                    {collectiveSalesUsers.map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Stage</label>
                  <select className="compact-select mini-select" defaultValue={selectedDeal.stage}>
                    {collectiveStages.map((stage) => (
                      <option value={stage} key={stage}>
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
                      <option value={term.value} key={term.value}>
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
                  <textarea defaultValue={selectedDeal.notes} />
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
