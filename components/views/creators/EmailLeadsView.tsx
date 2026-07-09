"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months } from "@/lib/format";
import { type EmailLead } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetEmailLeadsQuery } from "@/redux/api/emailLeadApi";
import { toEmailLead } from "@/lib/adapters";

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function categoryPillClass(category: EmailLead["category"]): string {
  if (category === "Deal") return "confirmed";
  if (category === "PR") return "pipeline";
  return "admin";
}

function EmailLeadCard({ lead, managerName }: { lead: EmailLead; managerName: (id: string) => string }) {
  return (
    <article className="email-lead-card">
      <div className="email-lead-head">
        <div>
          <span className={`pill ${categoryPillClass(lead.category)}`}>{lead.category}</span>
          <h3>{lead.subject}</h3>
          <small>
            {lead.from} · {displayDate(String(lead.receivedAt))} · {managerName(lead.managerId)}
          </small>
        </div>
      </div>
      <div className="form-grid compact-action-grid">
        <div className="field"><label>Talent</label><div className="read-field">{lead.talentName || "-"}</div></div>
        <div className="field"><label>Brand / company</label><div className="read-field">{lead.company || "-"}</div></div>
        <div className="field"><label>Campaign / request</label><div className="read-field">{lead.campaignName || "-"}</div></div>
        <div className="field"><label>Month</label><div className="read-field">{months[lead.monthIndex] || "-"}</div></div>
        <div className="field"><label>Contact email</label><div className="read-field">{lead.contactEmail || "-"}</div></div>
        <div className="field wide"><label>Manager action point</label><div className="read-field">{lead.actionPoint || "-"}</div></div>
        <div className="field wide"><label>Email body</label><div className="read-field">{lead.body || "No email body available."}</div></div>
      </div>
    </article>
  );
}

export default function EmailLeadsView() {
  const user = useSelector((s: RootState) => s.session.user);
  const { users } = useCreatorsTeam();
  const managerId = user?.role === "manager" ? user.id : undefined;
  const { data = [], isLoading } = useGetEmailLeadsQuery(managerId ? { manager: managerId } : undefined);

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";
  const leads = data.map(toEmailLead).sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Email Leads</h1>
        </div>
        <div className="asof">Scanned manager emails ready to review, edit, and route</div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Email intake</h2>
          <span className="pill pipeline">{leads.length} leads</span>
        </div>
        <div className="section-body manager-list">
          {leads.length ? (
            leads.map((lead) => <EmailLeadCard key={lead.id} lead={lead} managerName={managerName} />)
          ) : (
            <div className="notice">{isLoading ? "Loading…" : "No email leads yet."}</div>
          )}
        </div>
      </section>
    </>
  );
}
