"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum, stageClass } from "@/lib/format";
import {
  collectiveStages,
  paymentTerms,
  type CollectiveDeal,
  type Profile,
} from "@/lib/mock";
import { useCollectiveTeam } from "@/hooks/useCollectiveTeam";
import {
  useGetCollectiveDealsQuery,
  useCreateCollectiveInvoiceMutation,
  useMarkCollectiveInvoicedMutation,
  useMarkCollectivePaidMutation,
} from "@/redux/api/collectiveDealApi";
import { toCollectiveDeal } from "@/lib/adapters";

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function collectiveDealTotal(deal: CollectiveDeal): number {
  return Number(deal.amount || sum(deal.monthValues || []));
}

function collectiveScheduledTotal(deal: CollectiveDeal): number {
  return sum(deal.monthValues || []);
}

function collectivePaymentLabel(deal: CollectiveDeal): string {
  if (deal.paymentTerm === "custom") return `${Number(deal.customPaymentDays || 0)} days`;
  return (paymentTerms.find((term) => term.value === deal.paymentTerm) || paymentTerms[1]).label;
}

export default function CollectiveCrmView() {
  const sessionUser = useSelector((s: RootState) => s.session.collectiveUser);
  const { users: collectiveSalesUsers } = useCollectiveTeam();
  const { data: dealData = [] } = useGetCollectiveDealsQuery();
  const [createInvoice] = useCreateCollectiveInvoiceMutation();
  const [markInvoiced] = useMarkCollectiveInvoicedMutation();
  const [markPaid] = useMarkCollectivePaidMutation();

  // Fall back to the first sales user only until the session hydrates.
  const collectiveUser: Profile = sessionUser || collectiveSalesUsers[0] || {
    id: "",
    name: "",
    role: "manager",
    email: "",
  };
  const collectiveUserName = (id: string): string =>
    collectiveSalesUsers.find((user) => user.id === id)?.name || "Unassigned";

  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState<boolean>(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const allCollectiveDeals: CollectiveDeal[] = dealData.map(toCollectiveDeal);

  const visibleDeals =
    collectiveUser.role === "admin"
      ? allCollectiveDeals
      : allCollectiveDeals.filter((deal) => deal.ownerId === collectiveUser.id);

  const deals = visibleDeals
    .filter((deal) => ownerFilter === "all" || deal.ownerId === ownerFilter)
    .filter((deal) => stageFilter === "all" || deal.stage === stageFilter)
    .sort(
      (a, b) =>
        collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
        a.company.localeCompare(b.company)
    );

  const selectedDeal = allCollectiveDeals.find((deal) => deal.id === selectedDealId) || null;
  const visibleOwners: Profile[] =
    collectiveUser.role === "admin" ? collectiveSalesUsers : [collectiveUser];

  const summaryTotal = deals.reduce((total, deal) => total + collectiveDealTotal(deal), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Sales CRM</h1>
        </div>
        <div className="asof">Separate CRM and Xero flow for Cowshed Collective</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>CRM summary</h2>
          <span className="pill">{money(summaryTotal)}</span>
        </div>
        <div className="section-body earnings-grid">
          {collectiveStages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            return (
              <div className="earning" key={stage}>
                <span>{stage}</span>
                <strong>
                  {money(stageDeals.reduce((total, deal) => total + collectiveDealTotal(deal), 0))}
                </strong>
                <small>{stageDeals.length} deals</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section crm-board-section">
        <div className="section-head">
          <h2>Deals by stage</h2>
          <div className="section-actions">
            <button
              className="primary add-crm-toggle"
              type="button"
              onClick={() => setAddOpen((open) => !open)}
            >
              {addOpen ? "Close add deal" : "Add sales deal"}
            </button>
            {collectiveUser.role === "admin" ? (
              <select
                className="compact-select"
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
              >
                <option value="all">All salespeople</option>
                {collectiveSalesUsers.map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              className="compact-select"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="all">All stages</option>
              {collectiveStages.map((stage) => (
                <option value={stage} key={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-board collective-crm-board">
          {collectiveStages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            const stageTotal = stageDeals.reduce(
              (total, deal) => total + collectiveDealTotal(deal),
              0
            );
            return (
              <div className={`crm-column ${stageClass(stage)}`} key={stage}>
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>{money(stageTotal)}</strong>
                </div>
                <div className="crm-card-list">
                  {stageDeals.length ? (
                    stageDeals.map((deal) => (
                      <button
                        className={`crm-card ${selectedDealId === deal.id ? "active" : ""}`}
                        type="button"
                        key={deal.id}
                        draggable
                        onClick={() => setSelectedDealId(deal.id)}
                      >
                        <strong>{deal.company}</strong>
                        <span>
                          {deal.dealName} · {money(collectiveDealTotal(deal))}
                        </span>
                        <small>
                          {collectiveUserName(deal.ownerId)} ·{" "}
                          {deal.emailContact || "No email contact"}
                        </small>
                        <div className="crm-tags">
                          <em>{collectivePaymentLabel(deal)}</em>
                          {deal.xeroInvoiceId ? (
                            <em>{deal.xeroInvoiceId}</em>
                          ) : (
                            <em>Collective Xero</em>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="crm-empty">No deals</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {addOpen ? (
        <div className="crm-add-overlay">
          <section
            className="section crm-add-panel open"
            role="dialog"
            aria-modal="true"
            aria-label="Add Collective sales deal"
          >
            <button
              className="crm-detail-close"
              type="button"
              aria-label="Close add sales deal"
              onClick={() => setAddOpen(false)}
            >
              ×
            </button>
            <div className="section-head">
              <h2>Add sales deal</h2>
              <span className="pill confirmed">Collective Xero</span>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
                <div className="field">
                  <label htmlFor="collectiveOwnerId">Sales owner</label>
                  <select
                    id="collectiveOwnerId"
                    name="ownerId"
                    defaultValue={collectiveUser.id}
                    disabled={collectiveUser.role !== "admin"}
                  >
                    {visibleOwners.filter(Boolean).map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="collectiveStage">Stage</label>
                  <select id="collectiveStage" name="stage">
                    {collectiveStages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="collectiveCompany">Company</label>
                  <input id="collectiveCompany" name="company" required placeholder="Client name" />
                </div>
                <div className="field">
                  <label htmlFor="collectiveDealName">Deal name</label>
                  <input
                    id="collectiveDealName"
                    name="dealName"
                    required
                    placeholder="Campaign, retainer, project"
                  />
                </div>
                <div className="field">
                  <label htmlFor="collectiveAmount">Deal amount</label>
                  <input
                    id="collectiveAmount"
                    name="amount"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="field">
                  <label htmlFor="collectivePaymentTerm">Payment terms</label>
                  <select id="collectivePaymentTerm" name="paymentTerm">
                    {paymentTerms.map((term) => (
                      <option value={term.value} key={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="collectiveCustomDays">Own time in days</label>
                  <input
                    id="collectiveCustomDays"
                    name="customPaymentDays"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Only if custom"
                  />
                </div>
                <div className="field">
                  <label htmlFor="collectiveContactName">Contact name</label>
                  <input
                    id="collectiveContactName"
                    name="contactName"
                    placeholder="Client contact"
                  />
                </div>
                <div className="field">
                  <label htmlFor="collectiveEmail">Email addresses</label>
                  <input
                    id="collectiveEmail"
                    name="emailContact"
                    type="text"
                    placeholder="client@company.com, finance@company.com"
                  />
                </div>
                <div className="field wide">
                  <label htmlFor="collectiveNotes">Notes</label>
                  <textarea
                    id="collectiveNotes"
                    name="notes"
                    placeholder="Commercial notes, scope, Xero context"
                  />
                </div>
                <div className="field wide">
                  <label>Payment months</label>
                  <div className="collective-payment-grid">
                    {months.map((month, index) => (
                      <label key={month}>
                        <span>{month}</span>
                        <input
                          name={`month-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                        />
                      </label>
                    ))}
                  </div>
                  <small className="field-hint">
                    Enter the amount expected to land in each month. This drives Deals by month and
                    Quarter view.
                  </small>
                </div>
                <button className="primary wide" type="submit">
                  Add sales deal
                </button>
              </form>
            </div>
          </section>
        </div>
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
                    {money(collectiveDealTotal(selectedDeal))} ·{" "}
                    {collectiveUserName(selectedDeal.ownerId)}
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
                    disabled={collectiveUser.role !== "admin"}
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
                  <select
                    className="compact-select mini-select"
                    defaultValue={selectedDeal.paymentTerm}
                  >
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
                          defaultValue={
                            Number((selectedDeal.monthValues || [])[index] || 0) || ""
                          }
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
                      <button className="secondary" type="button" onClick={() => createInvoice(selectedDeal.id)}>
                        {selectedDeal.xeroInvoiceId
                          ? "Update draft in Collective Xero"
                          : "Create draft in Collective Xero"}
                      </button>
                      {selectedDeal.xeroInvoiceId ? (
                        <button className="secondary" type="button" onClick={() => markInvoiced(selectedDeal.id)}>
                          Mark invoiced
                        </button>
                      ) : null}
                      {selectedDeal.xeroInvoiceId ? (
                        <button className="secondary" type="button" onClick={() => markPaid(selectedDeal.id)}>
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
