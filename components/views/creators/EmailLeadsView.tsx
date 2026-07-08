"use client";

import { useState } from "react";
import { months } from "@/lib/format";
import { users, defaultEmailLeads, managers, type EmailLead, type Profile } from "@/lib/mock";

// The prototype normalises every seeded lead with a status ("New" by default) and
// conversion metadata that the base EmailLead type omits. Mirror that shape here.
type LeadStatus = "New" | "Converted" | "Dismissed";
type DisplayLead = EmailLead & { status: LeadStatus; convertedTo: string };

// --- Persona (static): a signed-in talent manager viewing their own inbox ---
const CURRENT_USER: Profile = users.find((u) => u.id === "amelia")!;
const ACCESSIBLE_MANAGER_IDS = [CURRENT_USER.id];

function hasAllRosterAccess(): boolean {
  return ["admin", "finance", "operations"].includes(CURRENT_USER.role);
}

function canAccessManager(managerId: string): boolean {
  return hasAllRosterAccess() || ACCESSIBLE_MANAGER_IDS.includes(managerId);
}

function visibleManagerUsers(): Profile[] {
  return managers.filter((manager) => ACCESSIBLE_MANAGER_IDS.includes(manager.id));
}

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function categoryPillClass(category: EmailLead["category"]): string {
  if (category === "Deal") return "confirmed";
  if (category === "PR") return "pipeline";
  return "admin";
}

// Seeded leads default to status "New" with no conversion, matching normalizeEmailLeads.
const ALL_LEADS: DisplayLead[] = defaultEmailLeads.map((lead) => ({
  ...lead,
  status: "New",
  convertedTo: "",
}));

function visibleEmailLeads(): DisplayLead[] {
  const visibleIds = CURRENT_USER.role === "manager" ? [CURRENT_USER.id] : [];
  return ALL_LEADS.filter((lead) => visibleIds.includes(lead.managerId)).sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}

function archiveToggleLabel(isOpen: boolean): string {
  return isOpen ? "Hide archive" : "Show archive";
}

function EmailLeadCard({ lead }: { lead: DisplayLead }) {
  const canEdit = canAccessManager(lead.managerId) && lead.status === "New";
  const suggestedTarget = lead.category === "PR" ? "pr" : lead.category === "Event" ? "event" : "crm";
  const actionButtonClass = (target: string) => (target === suggestedTarget ? "primary" : "secondary");
  const managerRoster = hasAllRosterAccess() ? managers : visibleManagerUsers();
  const managerSelectDisabled = !(hasAllRosterAccess() && canEdit);

  return (
    <article className={`email-lead-card ${lead.status !== "New" ? "muted-card" : ""}`}>
      <div className="email-lead-head">
        <div>
          <span className={`pill ${categoryPillClass(lead.category)}`}>{lead.category}</span>
          <h3>{lead.subject}</h3>
          <small>
            {lead.from} · {displayDate(String(lead.receivedAt).slice(0, 10))} · {managerName(lead.managerId)}
          </small>
        </div>
        <strong>{lead.status}</strong>
      </div>
      <form className="form-grid compact-action-grid" data-email-lead-form={lead.id}>
        <div className="field">
          <label>Manager</label>
          <select name="managerId" defaultValue={lead.managerId} disabled={managerSelectDisabled}>
            {managerRoster.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <select name="category" defaultValue={lead.category} disabled={!canEdit}>
            {(["Deal", "PR", "Event"] as const).map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Talent</label>
          <input name="talentName" defaultValue={lead.talentName} disabled={!canEdit} />
        </div>
        <div className="field">
          <label>Brand / company</label>
          <input name="company" defaultValue={lead.company} disabled={!canEdit} />
        </div>
        <div className="field">
          <label>Campaign / request</label>
          <input name="campaignName" defaultValue={lead.campaignName} disabled={!canEdit} />
        </div>
        <div className="field">
          <label>Amount</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={Number(lead.amount || 0)}
            disabled={!canEdit}
          />
        </div>
        <div className="field">
          <label>Month</label>
          <select name="monthIndex" defaultValue={String(Number(lead.monthIndex))} disabled={!canEdit}>
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Contact email</label>
          <input name="contactEmail" defaultValue={lead.contactEmail} disabled={!canEdit} />
        </div>
        <div className="field">
          <label>Event date</label>
          <input name="eventDate" type="date" defaultValue={lead.eventDate || ""} disabled={!canEdit} />
        </div>
        <div className="field wide">
          <label>Manager action point</label>
          <input name="actionPoint" defaultValue={lead.actionPoint} disabled={!canEdit} />
        </div>
        <div className="field wide">
          <label>Email body</label>
          <div className="read-field">{lead.body || "No email body available."}</div>
        </div>
      </form>
      <div className="email-action-row">
        {canEdit ? (
          <>
            <button className={actionButtonClass("crm")} type="button" data-email-convert={lead.id} data-target="crm">
              Add to CRM
            </button>
            <button className={actionButtonClass("pr")} type="button" data-email-convert={lead.id} data-target="pr">
              Add to PR requests
            </button>
            <button className={actionButtonClass("event")} type="button" data-email-convert={lead.id} data-target="event">
              Add to Events
            </button>
            <button className="secondary danger-button" type="button" data-email-dismiss={lead.id}>
              Dismiss
            </button>
          </>
        ) : lead.status !== "New" && lead.managerId === CURRENT_USER.id ? (
          <>
            {lead.convertedTo ? <span className="pill confirmed">Added to {lead.convertedTo}</span> : null}
            <button className="secondary" type="button" data-email-restore={lead.id}>
              Move back to active
            </button>
          </>
        ) : lead.convertedTo ? (
          <span className="pill confirmed">Added to {lead.convertedTo}</span>
        ) : null}
      </div>
    </article>
  );
}

export default function EmailLeadsView() {
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const leads = visibleEmailLeads();
  const activeLeads = leads.filter((lead) => lead.status === "New");
  const archivedLeads = leads.filter((lead) => lead.status !== "New");

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
          <div className="section-actions">
            <button className="secondary" type="button" data-scan-inbox-demo>
              Scan inbox demo
            </button>
            <span className="pill pipeline">{activeLeads.length} new</span>
          </div>
        </div>
        <div className="section-body">
          <div className="notice">
            Prototype email scan: these cards simulate what Gmail/Google Workspace can feed into the portal. Managers
            can check the extracted details before choosing CRM, PR, or Events.
          </div>
        </div>
        <div className="section-body manager-list">
          {activeLeads.length ? (
            activeLeads.map((lead) => <EmailLeadCard key={lead.id} lead={lead} />)
          ) : (
            <div className="notice">No active email leads found.</div>
          )}
        </div>
        <div className={`section-body archive-panel ${isArchiveOpen ? "open" : "collapsed"}`}>
          <button
            className="archive-head archive-toggle"
            type="button"
            data-archive-toggle="email"
            aria-expanded={isArchiveOpen}
            onClick={() => setIsArchiveOpen((open) => !open)}
          >
            <h3>Archive</h3>
            <span>
              <span className="pill">{archivedLeads.length} stored</span>
              <strong>{archiveToggleLabel(isArchiveOpen)}</strong>
            </span>
          </button>
          {isArchiveOpen ? (
            <div className="manager-list">
              {archivedLeads.length ? (
                archivedLeads.map((lead) => <EmailLeadCard key={lead.id} lead={lead} />)
              ) : (
                <div className="notice">No archived email leads yet.</div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
