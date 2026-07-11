"use client";

import { money, sum } from "@/lib/format";
import { toDeal } from "@/lib/adapters";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import {
  useGetDealsQuery,
  useCreateDealInvoiceMutation,
  useMarkDealInvoicedMutation,
  useMarkDealPaidMutation,
} from "@/redux/api/dealApi";
import { useGetXeroStatusQuery } from "@/redux/api/settingsApi";

export default function FinanceActionsView() {
  const { users } = useCreatorsTeam();
  const { data: dealData = [], isLoading } = useGetDealsQuery();
  const { data: xero } = useGetXeroStatusQuery();
  const [createInvoice] = useCreateDealInvoiceMutation();
  const [markInvoiced] = useMarkDealInvoicedMutation();
  const [markPaid] = useMarkDealPaidMutation();

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";
  const deals = dealData.map(toDeal);

  // Deals worth invoicing: has scheduled money and isn't fully paid.
  const toInvoice = deals.filter((d) => sum(d.monthValues) > 0 && !d.xeroInvoiceId && d.financeStatus !== "Paid");
  const inFlight = deals.filter((d) => d.xeroInvoiceId && d.financeStatus !== "Paid");
  const paid = deals.filter((d) => d.financeStatus === "Paid");

  const total = (list: typeof deals) => list.reduce((t, d) => t + sum(d.monthValues), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Finance Actions</h1>
        </div>
        <div className="asof">
          Xero invoicing · {xero?.connected ? "Connected to Xero" : "Simulated (connect Xero to go live)"}
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Ready to invoice</h2>
          <div className="section-actions">
            <span className="pill pipeline">{toInvoice.length} deals</span>
            <span className="pill confirmed">{money(total(toInvoice))}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {toInvoice.length ? (
            toInvoice.map((d) => (
              <article className="deal finance-action" key={d.id}>
                <div className="deal-line">
                  <strong>{d.talentName} {d.company ? `× ${d.company}` : ""}</strong>
                  <span>{money(sum(d.monthValues))}</span>
                </div>
                <div className="deal-line muted"><span>Manager</span><span>{managerName(d.managerId)}</span></div>
                <div className="deal-line muted"><span>Campaign</span><span>{d.campaignName || "-"}</span></div>
                <div className="deal-actions">
                  <button className="primary" type="button" onClick={() => createInvoice(d.id)}>
                    Create draft invoice in Xero
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="notice">{isLoading ? "Loading…" : "No deals ready to invoice right now."}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Xero invoice alerts</h2>
          <div className="section-actions">
            <span className="pill pipeline">{inFlight.length} in progress</span>
            <span className="pill confirmed">{money(total(inFlight))}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {inFlight.length ? (
            inFlight.map((d) => {
              const invoiced = d.financeStatus === "Invoiced in Xero";
              return (
                <article className="deal finance-action" key={d.id}>
                  <div className="deal-line">
                    <strong>{d.talentName} {d.company ? `× ${d.company}` : ""}</strong>
                    <span className={`pill ${invoiced ? "confirmed" : "pipeline"}`}>{invoiced ? "Invoiced" : "Draft in Xero"}</span>
                  </div>
                  <div className="deal-line muted"><span>Manager</span><span>{managerName(d.managerId)}</span></div>
                  <div className="deal-line muted"><span>Xero invoice</span><span>{d.xeroInvoiceId || "-"}</span></div>
                  <div className="deal-line muted"><span>Xero status</span><span>{d.xeroStatus || "-"}</span></div>
                  <div className="deal-actions">
                    {!invoiced ? (
                      <button className="secondary" type="button" onClick={() => markInvoiced(d.id)}>Mark invoiced</button>
                    ) : null}
                    <button className="primary" type="button" onClick={() => markPaid(d.id)}>Mark paid / reconciled</button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="notice">No Xero drafts or invoices in progress.</div>
          )}
        </div>
      </section>

      {paid.length ? (
        <section className="section soft-section">
          <div className="section-head">
            <h2>Paid</h2>
            <span className="pill confirmed">{paid.length} · {money(total(paid))}</span>
          </div>
          <div className="section-body manager-list">
            {paid.map((d) => (
              <article className="deal" key={d.id}>
                <div className="deal-line">
                  <strong>{d.talentName} {d.company ? `× ${d.company}` : ""}</strong>
                  <span className="pill confirmed">Paid</span>
                </div>
                <div className="deal-line muted"><span>Xero invoice</span><span>{d.xeroInvoiceId || "-"}</span></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
