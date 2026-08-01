"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money } from "@/lib/format";
import { type EmailLead } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import {
  useGetEmailLeadsQuery,
  useCreateEmailLeadMutation,
  useDelegateEmailLeadMutation,
  useDeleteEmailLeadMutation,
} from "@/redux/api/emailLeadApi";
import { useCreateDealMutation } from "@/redux/api/dealApi";
import { toEmailLead } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

export type LeadCategory = "Deal" | "PR" | "Event";

interface LeadsWorkspaceProps {
  category: LeadCategory;
  title: string;
  subtitle: string;
  /** Heading over the list, e.g. "Email intake". */
  listLabel: string;
  emptyMessage: string;
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function categoryPillClass(category: LeadCategory): string {
  if (category === "Deal") return "confirmed";
  if (category === "PR") return "pipeline";
  return "admin";
}

const emptyForm = {
  managerId: "",
  from: "",
  subject: "",
  talentName: "",
  company: "",
  campaignName: "",
  amount: "",
  monthIndex: 0,
  contactEmail: "",
  eventDate: "",
  actionPoint: "",
  body: "",
};

/**
 * Shared workspace behind Email Leads, PR Requests and Events — the three views
 * are the same records filtered by `category`, so they share one implementation.
 */
export default function LeadsWorkspace({
  category,
  title,
  subtitle,
  listLabel,
  emptyMessage,
}: LeadsWorkspaceProps) {
  const user = useSelector((s: RootState) => s.session.user);
  const { users, managers } = useCreatorsTeam();
  const managerId = user?.role === "manager" ? user.id : undefined;

  // `mine` returns what this manager owns plus anything delegated to them, and
  // hides what they have handed away.
  const { data = [], isLoading } = useGetEmailLeadsQuery({
    category,
    ...(managerId ? { mine: managerId } : {}),
  });
  const [createLead, { isLoading: creating }] = useCreateEmailLeadMutation();
  const [deleteLead] = useDeleteEmailLeadMutation();
  const [delegateLead] = useDelegateEmailLeadMutation();
  const [createDeal] = useCreateDealMutation();
  const confirm = useConfirm();
  const toast = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";
  const leads: EmailLead[] = data
    .map(toEmailLead)
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  const defaultManager = form.managerId || managerId || managers[0]?.id || "";
  // Anyone active on the Creators team can pick up a PR or Event request.
  const teamForDelegation = users.filter((u) => u.id !== user?.id || false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultManager) return toast.error("Add a talent manager to the team first.");
    if (!form.subject.trim()) return toast.error("Enter a subject so the lead can be identified.");
    try {
      await createLead({
        manager: defaultManager,
        category,
        from: form.from.trim(),
        subject: form.subject.trim(),
        talentName: form.talentName.trim(),
        company: form.company.trim(),
        campaignName: form.campaignName.trim(),
        amount: Number(form.amount) || 0,
        monthIndex: form.monthIndex,
        contactEmail: form.contactEmail.trim(),
        eventDate: form.eventDate || undefined,
        actionPoint: form.actionPoint.trim(),
        body: form.body.trim(),
      }).unwrap();
      toast.success(`${category === "Deal" ? "Lead" : category + " request"} added.`);
      setForm(emptyForm);
      setAddOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add that lead."));
    }
  };

  const handleDelete = async (lead: EmailLead) => {
    const ok = await confirm({
      tone: "danger",
      title: category === "Deal" ? "Delete lead?" : `Delete ${category} request?`,
      confirmLabel: "Delete",
      message: (
        <>
          <strong>{lead.subject || "This lead"}</strong>
          {lead.company ? ` from ${lead.company}` : ""} will be removed from the list. This cannot be
          undone.
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteLead(lead.id).unwrap();
      toast.success("Deleted.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete that lead."));
    }
  };

  // PR and Event requests can be handed to another team member, who then sees
  // them in their own portal.
  const handleDelegate = async (lead: EmailLead, targetId: string) => {
    const target = users.find((u) => u.id === targetId);
    if (targetId) {
      const ok = await confirm({
        tone: "default",
        title: `Delegate this ${category} request?`,
        confirmLabel: "Delegate",
        message: (
          <>
            <strong>{lead.subject || "This request"}</strong> moves to{" "}
            <strong>{target?.name || "that team member"}</strong>&rsquo;s portal and leaves your
            list. You can take it back at any time.
          </>
        ),
      });
      if (!ok) return;
    }
    try {
      await delegateLead({ id: lead.id, delegatedTo: targetId }).unwrap();
      toast.success(targetId ? `Delegated to ${target?.name || "team member"}.` : "Delegation removed.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delegate that request."));
    }
  };

  // Deal leads can be promoted straight into the CRM pipeline.
  const handleConvert = async (lead: EmailLead) => {
    if (!lead.talentName) return toast.error("Add a talent name to the lead before converting it.");
    const ok = await confirm({
      tone: "default",
      title: "Convert to CRM deal?",
      confirmLabel: "Create deal",
      message: (
        <>
          A new pipeline deal for <strong>{lead.talentName}</strong>
          {lead.company ? ` with ${lead.company}` : ""} will be created at{" "}
          <strong>{money(lead.amount || 0)}</strong> in {months[lead.monthIndex] || "January"}. The
          lead stays here until you dismiss it.
        </>
      ),
    });
    if (!ok) return;
    const monthValues = new Array(12).fill(0);
    monthValues[lead.monthIndex ?? 0] = Number(lead.amount || 0);
    try {
      await createDeal({
        manager: lead.managerId,
        talentName: lead.talentName,
        company: lead.company,
        companyName: lead.company,
        campaignName: lead.campaignName,
        emailAddresses: lead.contactEmail,
        stage: "Conversation",
        status: "Pipeline",
        inboundOrOutbound: "Inbound",
        monthValues,
      }).unwrap();
      toast.success(`${lead.talentName} added to the CRM pipeline.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not create the CRM deal."));
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>{title}</h1>
        </div>
        <div className="asof">{subtitle}</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>{listLabel}</h2>
          <div className="section-actions">
            <span className={`pill ${categoryPillClass(category)}`}>
              {leads.length} {leads.length === 1 ? "item" : "items"}
            </span>
            <button className="primary small" type="button" onClick={() => setAddOpen((o) => !o)}>
              {addOpen ? "Close" : `Add ${category === "Deal" ? "lead" : category.toLowerCase() + " request"}`}
            </button>
          </div>
        </div>

        {addOpen ? (
          <div className="section-body">
            <form className="form-grid" onSubmit={handleAdd}>
              <div className="field">
                <label htmlFor="leadManager">Talent manager</label>
                <select
                  id="leadManager"
                  value={defaultManager}
                  disabled={Boolean(managerId)}
                  onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                >
                  {managers.length ? (
                    managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No talent managers yet</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="leadFrom">From</label>
                <input
                  id="leadFrom"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  placeholder="sender@brand.com"
                />
              </div>
              <div className="field wide">
                <label htmlFor="leadSubject">Subject</label>
                <input
                  id="leadSubject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="What is the email about?"
                />
              </div>
              <div className="field">
                <label htmlFor="leadTalent">Talent</label>
                <input
                  id="leadTalent"
                  value={form.talentName}
                  onChange={(e) => setForm({ ...form, talentName: e.target.value })}
                  placeholder="Talent name"
                />
              </div>
              <div className="field">
                <label htmlFor="leadCompany">Brand / company</label>
                <input
                  id="leadCompany"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Brand or agency"
                />
              </div>
              <div className="field">
                <label htmlFor="leadCampaign">
                  {category === "Event" ? "Event name" : "Campaign / request"}
                </label>
                <input
                  id="leadCampaign"
                  value={form.campaignName}
                  onChange={(e) => setForm({ ...form, campaignName: e.target.value })}
                />
              </div>
              {category === "Deal" ? (
                <>
                  <div className="field">
                    <label htmlFor="leadAmount">Estimated amount</label>
                    <input
                      id="leadAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="leadMonth">Month</label>
                    <select
                      id="leadMonth"
                      value={form.monthIndex}
                      onChange={(e) => setForm({ ...form, monthIndex: Number(e.target.value) })}
                    >
                      {months.map((m, i) => (
                        <option key={m} value={i}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              {category === "Event" ? (
                <div className="field">
                  <label htmlFor="leadEventDate">Event date</label>
                  <input
                    id="leadEventDate"
                    type="date"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="leadContact">Contact email</label>
                <input
                  id="leadContact"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="field wide">
                <label htmlFor="leadAction">Manager action point</label>
                <input
                  id="leadAction"
                  value={form.actionPoint}
                  onChange={(e) => setForm({ ...form, actionPoint: e.target.value })}
                  placeholder="What needs doing next?"
                />
              </div>
              <div className="field wide">
                <label htmlFor="leadBody">Email body</label>
                <textarea
                  id="leadBody"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Paste the email content"
                />
              </div>
              <button className="primary wide" type="submit" disabled={creating}>
                {creating ? "Adding…" : "Add"}
              </button>
            </form>
          </div>
        ) : null}

        <div className="section-body manager-list">
          {leads.length ? (
            leads.map((lead) => (
              <article className="email-lead-card" key={lead.id}>
                <div className="email-lead-head">
                  <div>
                    <span className={`pill ${categoryPillClass(category)}`}>{lead.category}</span>
                    <h3>{lead.subject}</h3>
                    <small>
                      {lead.from || "No sender"} · {displayDate(String(lead.receivedAt))} ·{" "}
                      {managerName(lead.managerId)}
                    </small>
                    {lead.delegatedToId ? (
                      <span className="pill admin delegated-pill">
                        {lead.delegatedToId === user?.id
                          ? `Delegated to you by ${managerName(lead.delegatedById || lead.managerId)}`
                          : `Delegated to ${managerName(lead.delegatedToId)}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="form-grid compact-action-grid">
                  <div className="field">
                    <label>Talent</label>
                    <div className="read-field">{lead.talentName || "-"}</div>
                  </div>
                  <div className="field">
                    <label>Brand / company</label>
                    <div className="read-field">{lead.company || "-"}</div>
                  </div>
                  <div className="field">
                    <label>{category === "Event" ? "Event name" : "Campaign / request"}</label>
                    <div className="read-field">{lead.campaignName || "-"}</div>
                  </div>
                  {category === "Deal" ? (
                    <>
                      <div className="field">
                        <label>Amount</label>
                        <div className="read-field">{lead.amount ? money(lead.amount) : "-"}</div>
                      </div>
                      <div className="field">
                        <label>Month</label>
                        <div className="read-field">{months[lead.monthIndex] || "-"}</div>
                      </div>
                    </>
                  ) : null}
                  {category === "Event" ? (
                    <div className="field">
                      <label>Event date</label>
                      <div className="read-field">{lead.eventDate ? displayDate(lead.eventDate) : "-"}</div>
                    </div>
                  ) : null}
                  <div className="field">
                    <label>Contact email</label>
                    <div className="read-field">{lead.contactEmail || "-"}</div>
                  </div>
                  <div className="field wide">
                    <label>Manager action point</label>
                    <div className="read-field">{lead.actionPoint || "-"}</div>
                  </div>
                  <div className="field wide">
                    <label>Email body</label>
                    <div className="read-field">{lead.body || "No email body available."}</div>
                  </div>
                </div>
                <div className="row-actions">
                  {category === "Deal" ? (
                    <button className="primary small" type="button" onClick={() => handleConvert(lead)}>
                      Convert to CRM deal
                    </button>
                  ) : (
                    <label className="delegate-control">
                      <span>Assign to</span>
                      <select
                        className="compact-select"
                        value={lead.delegatedToId || ""}
                        onChange={(e) => handleDelegate(lead, e.target.value)}
                        aria-label={`Delegate ${lead.subject || "request"}`}
                      >
                        <option value="">Nobody (keep it)</option>
                        {teamForDelegation
                          .filter((m) => m.id !== lead.managerId)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <button
                    className="secondary danger-button small"
                    type="button"
                    onClick={() => handleDelete(lead)}
                    aria-label={`Delete ${lead.subject || "this item"}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="notice">{isLoading ? "Loading…" : emptyMessage}</div>
          )}
        </div>
      </section>
    </>
  );
}
