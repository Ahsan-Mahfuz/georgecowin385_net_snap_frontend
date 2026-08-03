"use client";

import { useState } from "react";
import { months, money } from "@/lib/format";
import {
  useGetApprovalsQuery,
  useCreateApprovalMutation,
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} from "@/redux/api/approvalApi";
import type { ApiApproval } from "@/redux/api/types";

function refName(ref: ApiApproval["submittedBy"]): string {
  if (!ref) return "-";
  return typeof ref === "string" ? ref : ref.name;
}

function ApprovalCard({
  item,
  onApprove,
  onReject,
}: {
  item: ApiApproval;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = item.status === "pending";
  return (
    <article className="deal">
      <div className="deal-line">
        <strong>{item.title}</strong>
        <span className={`pill ${pending ? "pipeline" : item.status === "approved" ? "confirmed" : "rejected"}`}>
          {item.status === "pending" ? "Pending approval" : item.status === "approved" ? "Approved" : "Rejected"}
        </span>
      </div>
      <div className="deal-line muted"><span>Type</span><span>{item.kind === "deal" ? "Deal" : "Expense"}</span></div>
      <div className="deal-line muted"><span>Submitted by</span><span>{refName(item.submittedBy)}</span></div>
      {item.manager ? (
        <div className="deal-line muted"><span>Manager</span><span>{refName(item.manager)}</span></div>
      ) : null}
      <div className="deal-line muted"><span>Amount</span><span>{money(item.amount)}</span></div>
      <div className="deal-line muted"><span>Month</span><span>{months[item.monthIndex] || "-"}</span></div>
      {item.note ? <div className="deal-line muted"><span>Note</span><span>{item.note}</span></div> : null}
      {item.status === "rejected" && item.rejectionReason ? (
        <div className="notice">Rejected: {item.rejectionReason}</div>
      ) : null}
      {pending ? (
        <div className="deal-actions">
          <button className="primary" type="button" onClick={() => onApprove(item._id)}>Approve</button>
          <button className="secondary danger-button" type="button" onClick={() => onReject(item._id)}>Reject</button>
        </div>
      ) : null}
    </article>
  );
}

export default function ApprovalsView() {
  const { data = [], isLoading } = useGetApprovalsQuery();
  const [approve] = useApproveApprovalMutation();
  const [reject] = useRejectApprovalMutation();
  const [showArchive, setShowArchive] = useState(false);

  const onApprove = (id: string) => approve(id);
  const onReject = (id: string) => {
    const reason = typeof window !== "undefined" ? window.prompt("Reason for rejection (optional):") || "" : "";
    reject({ id, rejectionReason: reason });
  };

  const pending = data.filter((a) => a.status === "pending");
  const resolved = data.filter((a) => a.status !== "pending");

  const dealApprovals = pending.filter((a) => a.kind === "deal");
  const expenseApprovals = pending.filter((a) => a.kind === "expense");

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Approvals</h1>
        </div>
        <div className="asof">Review pending deals and expenses</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Pending deals</h2>
          <span className="pill pipeline">{dealApprovals.length} pending</span>
        </div>
        <div className="section-body manager-list">
          {dealApprovals.length ? (
            dealApprovals.map((item) => <ApprovalCard key={item._id} item={item} onApprove={onApprove} onReject={onReject} />)
          ) : (
            <div className="notice">{isLoading ? "Loading…" : "No deals waiting for approval."}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Pending expenses</h2>
          <span className="pill pipeline">{expenseApprovals.length} pending</span>
        </div>
        <div className="section-body manager-list">
          {expenseApprovals.length ? (
            expenseApprovals.map((item) => <ApprovalCard key={item._id} item={item} onApprove={onApprove} onReject={onReject} />)
          ) : (
            <div className="notice">No expenses waiting for approval.</div>
          )}
        </div>
      </section>

      <section className="section soft-section">
        <div className="section-head">
          <button className="archive-head archive-toggle" type="button" onClick={() => setShowArchive((o) => !o)} aria-expanded={showArchive}>
            <h3>History</h3>
            <span>
              <span className="pill">{resolved.length} resolved</span>
              <strong>{showArchive ? "Hide" : "Show"}</strong>
            </span>
          </button>
        </div>
        {showArchive ? (
          <div className="section-body manager-list">
            {resolved.length ? (
              resolved.map((item) => <ApprovalCard key={item._id} item={item} onApprove={onApprove} onReject={onReject} />)
            ) : (
              <div className="notice">No resolved approvals yet.</div>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
