"use client";

import { money } from "@/lib/format";

// ---------------------------------------------------------------------------
// Static data. The prototype builds these two lists from live state
// (state.talentExpenses and state.crmDeals). Both collections are empty on
// first load, so this view renders the prototype's empty states verbatim.
// ---------------------------------------------------------------------------

interface CrmDeal {
  id: string;
  talentName: string;
  company: string;
  campaignName?: string;
  managerId: string;
  stage?: string;
  financeStatus?: string;
  xeroInvoiceId?: string;
  xeroStatus?: string;
  xeroInvoiceStatus?: string;
  amount?: number;
}

interface TalentExpenseAction {
  id: string;
  talentName: string;
  amount: number;
  crmDealId?: string;
  campaignName?: string;
  managerId: string;
  submittedBy: string;
  note?: string;
  receiptData?: string;
  receiptName?: string;
}

// Empty on first load (see prototype: state.crmDeals = [], state.talentExpenses = []).
const talentExpenseActions: TalentExpenseAction[] = [];
const actionDeals: CrmDeal[] = [];

function managerName(managerId: string): string {
  // These action lists are empty until wired to live finance data; kept as a
  // passthrough so the (unrendered) cards still compile.
  return managerId || "Unassigned";
}

function dealInvoiceTotal(deal: CrmDeal): number {
  return Number(deal.amount || 0);
}

function dealTalentExpenseTotal(_dealId: string): number {
  return 0;
}

function crmPaymentLabel(_deal: CrmDeal): string {
  return "-";
}

function crmDueDate(_deal: CrmDeal): string {
  return "-";
}

function TalentExpenseActionCard({ expense }: { expense: TalentExpenseAction }) {
  const deal = actionDeals.find((item) => item.id === expense.crmDealId);
  return (
    <article className="deal finance-action">
      <div className="deal-line">
        <strong>
          {expense.talentName}
          {deal?.company ? ` x ${deal.company}` : ""}
        </strong>
        <span>{money(expense.amount)}</span>
      </div>
      <div className="notice">
        Manager has added a talent expense. Finance needs to add this amount onto
        the job invoice.
      </div>
      <div className="deal-line muted">
        <span>Campaign</span>
        <span>{deal?.campaignName || "No campaign name"}</span>
      </div>
      <div className="deal-line muted">
        <span>Manager</span>
        <span>{managerName(expense.managerId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Added by</span>
        <span>{managerName(expense.submittedBy)}</span>
      </div>
      <div className="deal-line muted">
        <span>Note</span>
        <span>{expense.note || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Receipt</span>
        <span>
          {expense.receiptData ? (
            <a href={expense.receiptData} target="_blank" rel="noopener">
              {expense.receiptName || "Open receipt"}
            </a>
          ) : (
            "No receipt attached"
          )}
        </span>
      </div>
      <div className="deal-line muted">
        <span>Current invoice total</span>
        <span>{deal ? money(dealInvoiceTotal(deal)) : money(expense.amount)}</span>
      </div>
      <div className="deal-actions">
        {deal ? (
          <button className="secondary" data-finance-create-xero={deal.id}>
            {deal.xeroInvoiceId
              ? "Update draft invoice in Xero"
              : "Create draft invoice in Xero"}
          </button>
        ) : null}
        <button className="primary" data-talent-expense-actioned={expense.id}>
          Mark added to invoice
        </button>
      </div>
    </article>
  );
}

function FinanceActionCard({ deal }: { deal: CrmDeal }) {
  const isInvoiced =
    deal.financeStatus === "Invoiced in Xero" || deal.stage === "Invoiced";
  return (
    <article className="deal finance-action" data-finance-card={deal.id}>
      <div className="deal-line">
        <strong>
          {deal.talentName} x {deal.company}
        </strong>
        <span className={`pill ${isInvoiced ? "confirmed" : "pipeline"}`}>
          {isInvoiced ? "Invoiced" : "Draft in Xero"}
        </span>
      </div>
      <div className="deal-line muted">
        <span>Manager</span>
        <span>{managerName(deal.managerId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Campaign</span>
        <span>{deal.campaignName || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Talent expenses on invoice</span>
        <span>{money(dealTalentExpenseTotal(deal.id))}</span>
      </div>
      <div className="deal-line muted">
        <span>Invoice total</span>
        <span>{money(dealInvoiceTotal(deal))}</span>
      </div>
      <div className="deal-line muted">
        <span>Payment terms</span>
        <span>
          {crmPaymentLabel(deal)} · due {crmDueDate(deal)}
        </span>
      </div>
      <div className="deal-line muted">
        <span>Xero invoice</span>
        <span>{deal.xeroInvoiceId || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Xero status</span>
        <span>{deal.xeroStatus || deal.xeroInvoiceStatus || "-"}</span>
      </div>
      <div className={`notice ${isInvoiced ? "success-notice" : ""}`}>
        {isInvoiced
          ? "Xero has confirmed this invoice. The CRM deal has moved to Invoiced."
          : "A draft invoice has been created in Xero. Finance can view it there; no portal approval is needed."}
      </div>
      <div className="deal-actions">
        <button className="primary" data-finance-see-xero={deal.id}>
          See invoice in Xero
        </button>
        {isInvoiced ? (
          <button className="secondary" data-dismiss-finance-alert={deal.id}>
            Dismiss
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function FinanceActionsView() {
  const totalValue = actionDeals.reduce(
    (total, deal) => total + Number(deal.amount || 0),
    0
  );
  const talentExpenseTotal = talentExpenseActions.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Finance Actions</h1>
        </div>
        <div className="asof">Xero draft and invoice alerts</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Talent expenses to add to invoices</h2>
          <div className="section-actions">
            <span className="pill pipeline">
              {talentExpenseActions.length} actions
            </span>
            <span className="pill confirmed">{money(talentExpenseTotal)}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {talentExpenseActions.length ? (
            talentExpenseActions.map((expense) => (
              <TalentExpenseActionCard key={expense.id} expense={expense} />
            ))
          ) : (
            <div className="notice">
              No talent expense invoice updates waiting right now.
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Xero invoice alerts</h2>
          <div className="section-actions">
            <span className="pill pipeline">{actionDeals.length} actions</span>
            <span className="pill confirmed">{money(totalValue)}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {actionDeals.length ? (
            actionDeals.map((deal) => (
              <FinanceActionCard key={deal.id} deal={deal} />
            ))
          ) : (
            <div className="notice">
              No Xero draft or invoice alerts waiting right now.
            </div>
          )}
        </div>
      </section>
    </>
  );
}
