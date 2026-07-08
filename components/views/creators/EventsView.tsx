"use client";

import { useState } from "react";

// Events view — faithful rebuild of requestListView("event") from the prototype.
// On first load the event request collections are empty, so this renders the
// prototype's empty-state markup exactly (0 open, no delegated panel, archive
// collapsed by default with a 0-stored count).

type RequestStatus = "Open" | "Actioned" | "Dismissed";

interface EventRequest {
  id: string;
  talentName: string;
  brand: string;
  eventName?: string;
  managerId?: string;
  delegatedToManagerId?: string;
  delegatedFromManagerId?: string;
  eventDate?: string;
  contactEmail?: string;
  actionPoint?: string;
  status: RequestStatus;
}

export default function EventsView() {
  // Static first-load data: no event requests exist yet.
  const requests: EventRequest[] = [];
  const delegatedRequests: EventRequest[] = [];

  const activeRequests = requests.filter((request) => request.status === "Open");
  const activeDelegatedRequests = delegatedRequests.filter((request) => request.status === "Open");
  const archivedRequests = [
    ...requests.filter((request) => request.status !== "Open"),
    ...delegatedRequests.filter((request) => request.status !== "Open"),
  ];

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const title = "Events";
  const subtitle = "Invites, dinners, launches and attendance requests";

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
          <h2>{title}</h2>
          <span className="pill pipeline">{activeRequests.length} open</span>
        </div>
        <div className="section-body manager-list">
          {activeRequests.length ? (
            activeRequests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))
          ) : (
            <div className="notice">No active event requests. Add them from Email Leads.</div>
          )}
        </div>
        {activeDelegatedRequests.length ? (
          <div className="section-body delegated-panel">
            <div className="archive-head">
              <h3>Delegated</h3>
              <span className="pill pipeline">{activeDelegatedRequests.length} live</span>
            </div>
            <div className="manager-list">
              {activeDelegatedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </div>
        ) : null}
        <div className={`section-body archive-panel ${isArchiveOpen ? "open" : "collapsed"}`}>
          <button
            className="archive-head archive-toggle"
            type="button"
            aria-expanded={isArchiveOpen}
            onClick={() => setIsArchiveOpen((open) => !open)}
          >
            <h3>Archive</h3>
            <span>
              <span className="pill">{archivedRequests.length} stored</span>
              <strong>{isArchiveOpen ? "Hide archive" : "Show archive"}</strong>
            </span>
          </button>
          {isArchiveOpen ? (
            <div className="manager-list">
              {archivedRequests.length ? (
                archivedRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))
              ) : (
                <div className="notice">No archived event requests yet.</div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}

function RequestCard({ request }: { request: EventRequest }) {
  const title = request.eventName;
  const isArchived = request.status !== "Open";
  return (
    <article className={`deal request-card ${isArchived ? "muted-card" : ""}`}>
      <div className="deal-line">
        <strong>
          {request.talentName} · {request.brand}
        </strong>
        <span className={`pill ${request.status === "Open" ? "pipeline" : "confirmed"}`}>
          {request.status}
        </span>
      </div>
      <div className="deal-line muted">
        <span>Event</span>
        <span>{title || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Manager</span>
        <span>{request.managerId || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Date</span>
        <span>{request.eventDate || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Contact</span>
        <span>{request.contactEmail || "-"}</span>
      </div>
      <div className="notice action-notice">{request.actionPoint}</div>
    </article>
  );
}
