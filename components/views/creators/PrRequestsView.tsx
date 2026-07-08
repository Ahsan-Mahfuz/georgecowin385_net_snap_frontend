"use client";

import { useState } from "react";

/**
 * PR Requests view — faithful port of the prototype's requestListView("pr").
 *
 * On first load the prototype's state.prRequests is empty and no requests are
 * delegated, so the view renders its empty states:
 *   - active list  -> "No active PR requests. Add them from Email Leads."
 *   - archive      -> collapsed by default; when opened -> "No archived PR requests yet."
 * (Delegated panel only renders when there are live delegated requests, so it is
 *  omitted here exactly as the prototype omits it.)
 */
export default function PrRequestsView() {
  // Archive is collapsed by default (state.openRequestArchives.pr is falsy on load).
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const title = "PR Requests";
  const subtitle = "Gifting, press samples and non-commercial talent requests";

  const activeCount = 0;
  const archivedCount = 0;
  const archiveToggleLabel = isArchiveOpen ? "Hide archive" : "Show archive";

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
          <span className="pill pipeline">{activeCount} open</span>
        </div>

        <div className="section-body manager-list">
          <div className="notice">No active PR requests. Add them from Email Leads.</div>
        </div>

        <div className={`section-body archive-panel ${isArchiveOpen ? "open" : "collapsed"}`}>
          <button
            className="archive-head archive-toggle"
            type="button"
            aria-expanded={isArchiveOpen}
            onClick={() => setIsArchiveOpen((open) => !open)}
          >
            <h3>Archive</h3>
            <span>
              <span className="pill">{archivedCount} stored</span>
              <strong>{archiveToggleLabel}</strong>
            </span>
          </button>
          {isArchiveOpen ? (
            <div className="manager-list">
              <div className="notice">No archived PR requests yet.</div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
