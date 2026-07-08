"use client";

import { months, money, sum } from "@/lib/format";
import { managers, users } from "@/lib/mock";

// Static UI rebuild of the prototype `approvalsView`.
// On first load every approval collection is empty, so the view renders as
// the admin sees it: pending deals + pending expenses, both showing their
// empty-state notices. Role-specific "Submitted by me" and "Rejection
// messages" sections only appear for non-admin roles (empty here as well).

type Role = "admin" | "manager" | "operations" | "production" | "finance";

interface PendingDeal {
  id: string;
  talentName: string;
  campaignName: string;
  managerId: string;
  approverId: string;
  submittedBy: string;
  monthValues: number[];
  crmDealId?: string;
}

interface PendingExpense {
  id: string;
  category: string;
  managerId: string;
  approverId: string;
  submittedBy: string;
  amount: number;
  monthIndex: number;
  note: string;
  receiptData?: string;
  receiptName?: string;
}

interface RejectionMessage {
  id: string;
  subject: string;
  body: string;
  readAt: string | null;
  crmDealId?: string;
  toManagerId: string;
}

function managerName(id: string): string {
  const person =
    managers.find((m) => m.id === id) || users.find((u) => u.id === id);
  return person ? person.name : id;
}

function PendingDealCard({
  deal,
  allowAction = true,
}: {
  deal: PendingDeal;
  allowAction?: boolean;
}) {
  const totalRevenue = sum(deal.monthValues);
  const monthLabel =
    months.find((_, index) => Number(deal.monthValues[index] || 0) > 0) ||
    "Multi-month";
  return (
    <article className="deal">
      <div className="deal-line">
        <strong>{deal.talentName}</strong>
        <span className="pill pipeline">Pending approval</span>
      </div>
      <div className="deal-line muted">
        <span>Campaign</span>
        <span>{deal.campaignName}</span>
      </div>
      <div className="deal-line muted">
        <span>Submitting manager</span>
        <span>{managerName(deal.managerId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Approver</span>
        <span>{managerName(deal.approverId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Amount</span>
        <span>{money(totalRevenue)}</span>
      </div>
      <div className="deal-line muted">
        <span>Month</span>
        <span>{monthLabel}</span>
      </div>
      <div className="deal-line muted">
        <span>Contract</span>
        <span>
          <span className="missing-contract">No contract attached</span>
        </span>
      </div>
      <div className="deal-actions">
        {deal.crmDealId ? (
          <button className="secondary" type="button">
            See deal
          </button>
        ) : null}
        {allowAction ? (
          <>
            <button className="primary" type="button">
              Approve
            </button>
            <button className="secondary danger-button" type="button">
              Reject
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function PendingExpenseCard({
  expense,
  allowAction = true,
}: {
  expense: PendingExpense;
  allowAction?: boolean;
}) {
  return (
    <article className="deal">
      <div className="deal-line">
        <strong>{expense.category}</strong>
        <span className="pill pipeline">Pending approval</span>
      </div>
      <div className="deal-line muted">
        <span>Submitting manager</span>
        <span>{managerName(expense.managerId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Approver</span>
        <span>{managerName(expense.approverId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Amount</span>
        <span>{money(expense.amount)}</span>
      </div>
      <div className="deal-line muted">
        <span>Month</span>
        <span>{months[expense.monthIndex]}</span>
      </div>
      <div className="deal-line muted">
        <span>Note</span>
        <span>{expense.note}</span>
      </div>
      <div className="deal-line muted">
        <span>Receipt</span>
        <span>
          {expense.receiptData ? (
            <a href={expense.receiptData} target="_blank" rel="noopener">
              {expense.receiptName || "Open receipt"}
            </a>
          ) : (
            "No file attached"
          )}
        </span>
      </div>
      {allowAction ? (
        <div className="deal-actions">
          <button className="primary" type="button">
            Approve
          </button>
          <button className="secondary danger-button" type="button">
            Reject
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default function ApprovalsView() {
  // Static viewer role — admin by default (matches the empty first-load state).
  const role: Role = "admin";

  // First-load collections are empty in the prototype.
  const allPendingDeals: PendingDeal[] = [];
  const allPendingExpenses: PendingExpense[] = [];
  const allRejectionMessages: RejectionMessage[] = [];
  const currentUserId = "admin";

  const pendingDeals =
    role === "admin"
      ? allPendingDeals
      : allPendingDeals.filter((deal) => deal.approverId === currentUserId);
  const pendingExpenses =
    role === "admin"
      ? allPendingExpenses
      : allPendingExpenses.filter(
          (expense) => expense.approverId === currentUserId,
        );
  const submittedDeals =
    role === "admin"
      ? []
      : allPendingDeals.filter((deal) => deal.submittedBy === currentUserId);
  const submittedExpenses =
    role === "admin"
      ? []
      : allPendingExpenses.filter(
          (expense) => expense.submittedBy === currentUserId,
        );
  const rejectionMessages =
    role === "admin"
      ? []
      : allRejectionMessages.filter((m) => m.toManagerId === currentUserId);
  const unreadRejectionCount = rejectionMessages.filter(
    (m) => !m.readAt,
  ).length;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Approvals</h1>
        </div>
        <div className="asof">
          {role === "admin"
            ? "Review pending deals and expenses"
            : "Review items waiting for your approval"}
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Pending deals</h2>
          <span className="pill pipeline">{pendingDeals.length} pending</span>
        </div>
        <div className="section-body manager-list">
          {pendingDeals.length ? (
            pendingDeals.map((deal) => (
              <PendingDealCard key={deal.id} deal={deal} />
            ))
          ) : (
            <div className="notice">No deals waiting for approval.</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Pending expenses</h2>
          <span className="pill pipeline">{pendingExpenses.length} pending</span>
        </div>
        <div className="section-body manager-list">
          {pendingExpenses.length ? (
            pendingExpenses.map((expense) => (
              <PendingExpenseCard key={expense.id} expense={expense} />
            ))
          ) : (
            <div className="notice">No expenses waiting for approval.</div>
          )}
        </div>
      </section>

      {role !== "admin" ? (
        <>
          <section className="section soft-section">
            <div className="section-head">
              <h2>Submitted by me</h2>
              <span className="pill pipeline">
                {submittedDeals.length + submittedExpenses.length} waiting
              </span>
            </div>
            <div className="section-body manager-list">
              {submittedDeals.length ? (
                submittedDeals.map((deal) => (
                  <PendingDealCard
                    key={deal.id}
                    deal={deal}
                    allowAction={false}
                  />
                ))
              ) : (
                <div className="notice">
                  No submitted deals are waiting for approval.
                </div>
              )}
              {submittedExpenses.length
                ? submittedExpenses.map((expense) => (
                    <PendingExpenseCard
                      key={expense.id}
                      expense={expense}
                      allowAction={false}
                    />
                  ))
                : null}
            </div>
          </section>

          <section className="section soft-section">
            <div className="section-head">
              <h2>Rejection messages</h2>
              <span className="pill pipeline">{unreadRejectionCount} new</span>
            </div>
            <div className="section-body manager-list">
              {rejectionMessages.length ? (
                rejectionMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`deal rejection-message ${
                      message.readAt ? "" : "unread"
                    }`}
                  >
                    <div className="deal-line">
                      <strong>{message.subject}</strong>
                      <span>{message.readAt ? "Seen" : "New"}</span>
                    </div>
                    <div className="deal-line muted">
                      <span>Message</span>
                      <span>{message.body}</span>
                    </div>
                    <div className="deal-actions">
                      {message.crmDealId ? (
                        <button className="primary" type="button">
                          See deal
                        </button>
                      ) : null}
                      <button className="secondary" type="button">
                        Dismiss
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="notice">No rejection messages yet.</div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
