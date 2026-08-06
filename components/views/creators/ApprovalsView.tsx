"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money } from "@/lib/format";
import { refId } from "@/lib/adapters";
import {
  useGetApprovalsQuery,
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} from "@/redux/api/approvalApi";
import type { ApiApproval } from "@/redux/api/types";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

function refName(ref: ApiApproval["submittedBy"]): string {
  if (!ref) return "-";
  return typeof ref === "string" ? ref : ref.name;
}

function ApprovalCard({
  item,
  canDecide,
  yours,
  busy,
  onApprove,
  onReject,
}: {
  item: ApiApproval;
  /** False when this request belongs to a different approver — see canDecideOn. */
  canDecide: boolean;
  /** True when this request names the signed-in user, rather than reaching them as an admin. */
  yours: boolean;
  busy: "approve" | "reject" | null;
  onApprove: (item: ApiApproval) => void;
  onReject: (item: ApiApproval) => void;
}) {
  const pending = item.status === "pending";
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

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
      {pending ? (
        <div className="deal-line muted">
          <span>Waiting on</span>
          <span>{yours ? "You" : item.approver ? refName(item.approver) : "an admin"}</span>
        </div>
      ) : null}
      {item.status === "rejected" && item.rejectionReason ? (
        <div className="notice">Rejected: {item.rejectionReason}</div>
      ) : null}

      {/* Approving is what puts the deal into the Live P&L and the manager's
          commission sheet, so it is said here rather than left to be discovered. */}
      {pending && canDecide ? (
        rejecting ? (
          <div className="approval-reject">
            <label htmlFor={`reject-${item._id}`}>Why is this being rejected?</label>
            <input
              id={`reject-${item._id}`}
              value={reason}
              autoFocus
              placeholder="Optional — the manager will see this"
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onReject({ ...item, rejectionReason: reason });
                if (e.key === "Escape") setRejecting(false);
              }}
            />
            <div className="deal-actions">
              <button
                className="secondary danger-button"
                type="button"
                disabled={busy !== null}
                onClick={() => onReject({ ...item, rejectionReason: reason })}
              >
                {busy === "reject" ? "Rejecting…" : "Confirm rejection"}
              </button>
              <button
                className="secondary"
                type="button"
                disabled={busy !== null}
                onClick={() => setRejecting(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="deal-actions">
            <button
              className="primary"
              type="button"
              disabled={busy !== null}
              onClick={() => onApprove(item)}
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              className="secondary danger-button"
              type="button"
              disabled={busy !== null}
              onClick={() => setRejecting(true)}
            >
              Reject
            </button>
          </div>
        )
      ) : null}
    </article>
  );
}

function Queue({
  title,
  items,
  emptyLabel,
  tone,
  ...card
}: {
  title: string;
  items: ApiApproval[];
  emptyLabel: string;
  tone: string;
  canDecideOn: (item: ApiApproval) => boolean;
  isYours: (item: ApiApproval) => boolean;
  busyFor: (id: string) => "approve" | "reject" | null;
  onApprove: (item: ApiApproval) => void;
  onReject: (item: ApiApproval) => void;
}) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <span className={`pill ${tone}`}>{items.length} pending</span>
      </div>
      <div className="section-body manager-list">
        {items.length ? (
          items.map((item) => (
            <ApprovalCard
              key={item._id}
              item={item}
              canDecide={card.canDecideOn(item)}
              yours={card.isYours(item)}
              busy={card.busyFor(item._id)}
              onApprove={card.onApprove}
              onReject={card.onReject}
            />
          ))
        ) : (
          <div className="notice">{emptyLabel}</div>
        )}
      </div>
    </section>
  );
}

export default function ApprovalsView() {
  const { data = [], isLoading, isFetching } = useGetApprovalsQuery();
  const user = useSelector((s: RootState) => s.session.user);
  const [approve] = useApproveApprovalMutation();
  const [reject] = useRejectApprovalMutation();
  const [showArchive, setShowArchive] = useState(false);
  const [busy, setBusy] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const toast = useToast();

  const isAdmin = user?.role === "admin" || user?.role === "operations";

  /**
   * Mirrors assertCanDecide in approval.service.ts. When a request names an
   * approver that person may decide it; an admin or operations may also step in
   * so nothing is ever stuck. Never the person who raised it.
   */
  const canDecideOn = (item: ApiApproval): boolean => {
    if (!user) return false;
    if (item.approver && refId(item.approver) === user.id) return true;
    if (refId(item.submittedBy) === user.id) return false;
    return Boolean(isAdmin);
  };

  /** Addressed to me by name, rather than reaching me because I am an admin. */
  const isYours = (item: ApiApproval): boolean =>
    Boolean(user && item.approver && refId(item.approver) === user.id);

  const busyFor = (id: string) => (busy?.id === id ? busy.action : null);

  const onApprove = async (item: ApiApproval) => {
    setBusy({ id: item._id, action: "approve" });
    try {
      await approve(item._id).unwrap();
      toast.success(
        item.kind === "deal"
          ? `${item.title} approved — it now counts towards the P&L and the commission sheet.`
          : `${item.title} approved.`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not approve that request."));
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (item: ApiApproval) => {
    setBusy({ id: item._id, action: "reject" });
    try {
      await reject({ id: item._id, rejectionReason: item.rejectionReason || "" }).unwrap();
      toast.success(`${item.title} rejected.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reject that request."));
    } finally {
      setBusy(null);
    }
  };

  const pending = data.filter((a) => a.status === "pending");
  const resolved = data.filter((a) => a.status !== "pending");

  /*
   * Split by who the request is actually addressed to. An admin used to see one
   * undivided list of everything in the organisation, so a deal genuinely
   * waiting on them was indistinguishable from thirty that were not — which
   * reads, from the other end, as "admin are not receiving the deal to approve".
   */
  const mine = pending.filter(isYours);
  const others = pending.filter((a) => !isYours(a));

  const loadingLabel = isLoading ? "Loading…" : isFetching ? "Refreshing…" : null;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Approvals</h1>
        </div>
        <div className="asof">
          {mine.length
            ? `${mine.length} waiting on you`
            : loadingLabel || "Nothing waiting on you"}
        </div>
      </div>

      <Queue
        title="Waiting on you"
        tone="admin"
        items={mine}
        emptyLabel={
          loadingLabel ||
          "Nothing is waiting on you. A deal arrives here when someone who reports to you moves it to Contract Signed."
        }
        canDecideOn={canDecideOn}
        isYours={isYours}
        busyFor={busyFor}
        onApprove={onApprove}
        onReject={onReject}
      />

      <Queue
        title={isAdmin ? "Waiting on someone else" : "Your submissions"}
        tone="pipeline"
        items={others}
        emptyLabel={
          loadingLabel ||
          (isAdmin
            ? "Nothing else is outstanding across the team."
            : "None of your deals are waiting for a decision.")
        }
        canDecideOn={canDecideOn}
        isYours={isYours}
        busyFor={busyFor}
        onApprove={onApprove}
        onReject={onReject}
      />

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
              resolved.map((item) => (
                <ApprovalCard
                  key={item._id}
                  item={item}
                  canDecide={false}
                  yours={isYours(item)}
                  busy={busyFor(item._id)}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))
            ) : (
              <div className="notice">No resolved approvals yet.</div>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
