"use client";

import { useState } from "react";
import { money, sum } from "@/lib/format";
import { toDeal } from "@/lib/adapters";
import type { Deal } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import {
  useGetDealsQuery,
  useCreateDealInvoiceMutation,
  useMarkDealInvoicedMutation,
  useMarkDealPaidMutation,
  useSyncXeroMutation,
} from "@/redux/api/dealApi";
import { useGetXeroStatusQuery } from "@/redux/api/settingsApi";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import DealDetailModal from "./DealDetailModal";

const dealTotal = (deal: Deal) => sum(deal.monthValues || []);

export default function FinanceActionsView() {
  const { users } = useCreatorsTeam();
  const { data: dealData = [], isLoading } = useGetDealsQuery();
  const { data: xero } = useGetXeroStatusQuery();
  const [createInvoice] = useCreateDealInvoiceMutation();
  const [markInvoiced] = useMarkDealInvoicedMutation();
  const [markPaid] = useMarkDealPaidMutation();
  const [syncXero, { isLoading: syncing }] = useSyncXeroMutation();
  const toast = useToast();
  const confirm = useConfirm();

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  // Finished work, kept collapsed so it does not push the open actions down.
  const [showPaidToTalent, setShowPaidToTalent] = useState(false);

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";
  const deals = dealData.map(toDeal);
  const openDeal = deals.find((d) => d.id === openDealId) || null;

  // The four things Finance actually does, in the order the money moves.
  const needsDraft = deals.filter((d) => d.stage === "To Be Invoiced" && !d.xeroInvoiceId);
  const awaitingSend = deals.filter(
    (d) => d.xeroInvoiceId && (d.xeroState === "DRAFT" || !d.xeroState) && d.financeStatus !== "Paid",
  );
  const awaitingPayment = deals.filter(
    (d) => d.xeroInvoiceId && ["AUTHORISED", "SUBMITTED"].includes(d.xeroState || "") && d.financeStatus !== "Paid",
  );
  const talentToPay = deals.filter((d) => d.financeStatus === "Paid" && d.remittanceStatus !== "Paid");
  // Settled with the talent — nothing left to do, but Finance still wants the record.
  const paidToTalent = deals
    .filter((d) => d.remittanceStatus === "Paid")
    .sort((a, b) => (b.remittancePaidAt || "").localeCompare(a.remittancePaidAt || ""));

  const total = (list: Deal[]) => list.reduce((t, d) => t + dealTotal(d), 0);

  const runSync = async () => {
    try {
      const result = await syncXero().unwrap();
      const moved = result.invoiced.length + result.paid.length + (result.billsPaid?.length || 0);
      if (!result.checked) {
        toast.info("Nothing in Xero to check yet — raise a draft first.");
      } else if (!moved) {
        toast.success(`Checked ${result.checked} invoice(s) in Xero. Nothing has changed.`);
      } else {
        toast.success(
          `${moved} deal(s) moved: ${[...result.invoiced, ...result.paid, ...(result.billsPaid || [])].join(", ")}`,
        );
      }
      if (result.errors.length) toast.error(result.errors[0]);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reach Xero."));
    }
  };

  const raiseDraft = async (deal: Deal) => {
    try {
      await createInvoice(deal.id).unwrap();
      toast.success(`Draft raised in Xero for ${deal.talentName}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create that draft."));
    }
  };

  const confirmMarkPaid = async (deal: Deal) => {
    const ok = await confirm({
      tone: "default",
      title: "Mark as paid?",
      confirmLabel: "Mark paid",
      message: (
        <>
          <strong>
            {deal.talentName} · {deal.campaignName || "Deal"}
          </strong>{" "}
          moves to <strong>On Next Payment Run</strong> and a talent invoice appears for the next run.
          Normally Xero does this automatically once the invoice is reconciled — only do it by hand if
          the money has definitely landed.
        </>
      ),
    });
    if (!ok) return;
    try {
      await markPaid(deal.id).unwrap();
      toast.success("Marked paid — the talent invoice is now on the next payment run.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update that deal."));
    }
  };

  const card = (deal: Deal, actions: React.ReactNode, right?: React.ReactNode) => (
    <article className="deal finance-action" key={deal.id}>
      {/* Clicking anywhere on the card opens the full CRM deal behind it. */}
      <button className="finance-action-open" type="button" onClick={() => setOpenDealId(deal.id)}>
        <div className="deal-line">
          <strong>
            {deal.talentName}
            {deal.companyName || deal.company ? ` × ${deal.companyName || deal.company}` : ""}
          </strong>
          {right || <span>{money(dealTotal(deal))}</span>}
        </div>
        <div className="deal-line muted">
          <span>Manager</span>
          <span>{managerName(deal.managerId)}</span>
        </div>
        <div className="deal-line muted">
          <span>Campaign</span>
          <span>{deal.campaignName || "—"}</span>
        </div>
        <div className="deal-line muted">
          <span>Xero</span>
          <span>{deal.xeroInvoiceNumber || deal.xeroInvoiceId || "No invoice yet"}</span>
        </div>
        {deal.xeroDueDate ? (
          <div className="deal-line muted">
            <span>Due Date</span>
            <span>{deal.xeroDueDate}</span>
          </div>
        ) : null}
      </button>
      <div className="deal-actions">{actions}</div>
    </article>
  );

  const section = (
    title: string,
    note: string,
    list: Deal[],
    body: (deal: Deal) => React.ReactNode,
    empty: string,
  ) => (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <div className="section-actions">
          <span className={`pill ${list.length ? "pipeline" : ""}`}>{list.length} to action</span>
          <span className="pill confirmed">{money(total(list))}</span>
        </div>
      </div>
      <div className="section-body">
        <small className="field-hint">{note}</small>
      </div>
      <div className="section-body manager-list">
        {list.length ? list.map((deal) => body(deal)) : <div className="notice">{isLoading ? "Loading…" : empty}</div>}
      </div>
    </section>
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Finance Actions</h1>
        </div>
        <div className="asof">
          {xero?.connected ? "Connected to Xero" : "Simulated (connect Xero to go live)"}
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Xero</h2>
          <div className="section-actions">
            <span className="pill">
              {needsDraft.length + awaitingSend.length + awaitingPayment.length + talentToPay.length} open
              actions
            </span>
            <button className="primary" type="button" onClick={runSync} disabled={syncing}>
              {syncing ? "Checking Xero…" : "Check Xero now"}
            </button>
          </div>
        </div>
        <div className="section-body">
          <small className="field-hint">
            The portal checks Xero on a timer. When an invoice is <strong>sent</strong> the deal moves to
            Invoiced; when it is <strong>paid</strong> it moves to On Next Payment Run and the talent
            invoice appears. Use the button to check straight away.
          </small>
        </div>
      </section>

      {section(
        "Waiting for a draft",
        "These reached To Be Invoiced but no draft exists in Xero — usually because Xero rejected it. Raise it here.",
        needsDraft,
        (deal) =>
          card(
            deal,
            <button className="primary" type="button" onClick={() => raiseDraft(deal)}>
              Create draft in Xero
            </button>,
          ),
        "Every deal at To Be Invoiced already has its draft in Xero.",
      )}

      {section(
        "Draft in Xero — send it",
        "The draft is sitting in Xero. Approve and send it there; the deal moves to Invoiced on its own.",
        awaitingSend,
        (deal) =>
          card(
            deal,
            <button className="secondary" type="button" onClick={() => markInvoiced(deal.id)}>
              Mark invoiced by hand
            </button>,
            <span className="pill pipeline">Draft</span>,
          ),
        "No drafts waiting to be sent.",
      )}

      {section(
        "Sent — awaiting payment",
        "Sent from Xero and waiting for the brand. Reconciling the payment in Xero moves it on automatically.",
        awaitingPayment,
        (deal) =>
          card(
            deal,
            <button className="secondary" type="button" onClick={() => confirmMarkPaid(deal)}>
              Mark paid by hand
            </button>,
            <span className="pill admin">{deal.xeroState}</span>,
          ),
        "Nothing outstanding with a brand.",
      )}

      {section(
        "Brand paid — talent to pay",
        "The brand has paid. These are on the next payment run; raise the talent bill from Talent Invoices.",
        talentToPay,
        (deal) =>
          card(
            deal,
            <span className="pill confirmed">{deal.xeroBillNumber || deal.remittanceStatus || "Not billed"}</span>,
            <span className="pill confirmed">Paid</span>,
          ),
        "No talent payments outstanding.",
      )}

      {/* Everything already settled with the talent. Collapsed by default — it
          only grows, and none of it needs actioning. */}
      <section className="section soft-section">
        <div className="section-head">
          <button
            className="collapse-head"
            type="button"
            onClick={() => setShowPaidToTalent((open) => !open)}
            aria-expanded={showPaidToTalent}
          >
            <h2>Paid to talent</h2>
            <span className="section-actions">
              <span className="pill confirmed">{paidToTalent.length} settled</span>
              <span className="pill">{money(total(paidToTalent))}</span>
              <span className="collapse-hint">{showPaidToTalent ? "Hide" : "Show"}</span>
            </span>
          </button>
        </div>
        {showPaidToTalent ? (
          <div className="section-body manager-list">
            {paidToTalent.length ? (
              paidToTalent.map((deal) =>
                card(
                  deal,
                  <span className="pill confirmed">
                    {deal.xeroBillNumber ? `Bill ${deal.xeroBillNumber}` : "Paid"}
                  </span>,
                  <span className="pill confirmed">
                    {deal.remittancePaidAt ? `Paid ${deal.remittancePaidAt}` : "Paid"}
                  </span>,
                ),
              )
            ) : (
              <div className="notice">Nothing has been paid out to talent yet.</div>
            )}
          </div>
        ) : null}
      </section>

      {openDeal ? (
        <DealDetailModal
          deal={openDeal}
          managerName={managerName(openDeal.managerId)}
          onClose={() => setOpenDealId(null)}
        />
      ) : null}
    </>
  );
}
