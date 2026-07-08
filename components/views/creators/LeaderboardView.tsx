"use client";

import { useMemo, useState } from "react";
import { money, sum, months } from "@/lib/format";
import { managers, users, talentOptions, Deal } from "@/lib/mock";
import { scopedDeals } from "@/lib/pl";

// Static UI rebuild of the prototype's leaderboardView (app.js).
// Whole-roster ranking by confirmed deal value only.

type LeaderboardScope = "personal" | "full";

interface TalentRow {
  key: string;
  managerId: string;
  talentName: string;
  total: number;
  deals: Deal[];
}

// Mirrors managerName() — admin is a synthetic id, otherwise look up staff records.
function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

// Mirrors leaderboardManagerIds() for an admin viewer.
function leaderboardManagerIds(scope: LeaderboardScope, selectedManagerId: string | null): string[] {
  if (scope === "full") return managers.map((manager) => manager.id);
  const selected = managers.some((manager) => manager.id === selectedManagerId)
    ? selectedManagerId
    : managers[0]?.id;
  return selected ? [selected] : [];
}

// Mirrors allTalentRows("live", managerIds).
function allTalentRows(managerIds: string[]): TalentRow[] {
  const rows = new Map<string, TalentRow>();
  const allowedIds = managerIds;
  managers
    .filter((manager) => allowedIds.includes(manager.id))
    .forEach((manager) => {
      talentOptions(manager.id).forEach((talentName) => {
        const key = `${manager.id}::${talentName}`;
        rows.set(key, { key, managerId: manager.id, talentName, total: 0, deals: [] });
      });
    });
  scopedDeals("live").forEach((deal) => {
    if (!allowedIds.includes(deal.managerId)) return;
    const key = `${deal.managerId}::${deal.talentName}`;
    if (!rows.has(key)) {
      rows.set(key, { key, managerId: deal.managerId, talentName: deal.talentName, total: 0, deals: [] });
    }
    const row = rows.get(key) as TalentRow;
    row.total += sum(deal.monthValues);
    row.deals.push(deal);
  });
  return [...rows.values()].sort(
    (a, b) => b.total - a.total || a.talentName.localeCompare(b.talentName)
  );
}

// Mirrors dealCards(deals, false).
function DealCards({ deals }: { deals: Deal[] }) {
  if (!deals.length) {
    return <div className="notice">No deals in this view yet.</div>;
  }
  return (
    <>
      {deals.map((deal) => {
        const totalRevenue = sum(deal.monthValues);
        const monthLabel =
          months.find((_, index) => Number(deal.monthValues[index] || 0) > 0) || "Multi-month";
        return (
          <article className="deal" key={deal.id}>
            <div className="deal-line">
              <strong>{deal.talentName}</strong>
              <span className={`pill ${deal.status.toLowerCase()}`}>{deal.status}</span>
            </div>
            <div className="deal-line muted">
              <span>Campaign</span>
              <span>{deal.campaignName}</span>
            </div>
            <div className="deal-line muted">
              <span>Amount</span>
              <span>{money(totalRevenue)}</span>
            </div>
            <div className="deal-line muted">
              <span>Month</span>
              <span>{monthLabel}</span>
            </div>
          </article>
        );
      })}
    </>
  );
}

export default function LeaderboardView() {
  // Admin viewer default state (prototype default scope is "full").
  const [leaderboardScope, setLeaderboardScope] = useState<LeaderboardScope>("full");
  const [selectedManagerId, setSelectedManagerId] = useState<string>(managers[0]?.id || "");
  const [selectedTalentKey, setSelectedTalentKey] = useState<string | null>(null);

  const rows = useMemo(
    () => allTalentRows(leaderboardManagerIds(leaderboardScope, selectedManagerId)),
    [leaderboardScope, selectedManagerId]
  );

  // Mirror the prototype: auto-select the top row when nothing valid is selected.
  const effectiveKey =
    selectedTalentKey && rows.some((row) => row.key === selectedTalentKey)
      ? selectedTalentKey
      : rows[0]?.key || null;
  const selected = rows.find((row) => row.key === effectiveKey);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Talent leaderboard</h1>
        </div>
        <div className="asof">Whole-roster ranking by confirmed deal value only</div>
      </div>
      <div className="layout">
        <section className="section">
          <div className="section-head">
            <h2>Top earning talent</h2>
            <div className="section-actions">
              {leaderboardScope === "personal" ? (
                <select
                  className="compact-select"
                  value={selectedManagerId}
                  onChange={(event) => setSelectedManagerId(event.target.value)}
                >
                  {managers.map((manager) => (
                    <option value={manager.id} key={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <div className="segmented">
                <button
                  className={leaderboardScope === "personal" ? "active" : ""}
                  onClick={() => setLeaderboardScope("personal")}
                >
                  Your roster only
                </button>
                <button
                  className={leaderboardScope === "full" ? "active" : ""}
                  onClick={() => setLeaderboardScope("full")}
                >
                  Full roster
                </button>
              </div>
              <span className="pill confirmed">Confirmed only</span>
            </div>
          </div>
          <div className="section-body">
            <div className="leaderboard-list">
              {rows.map((row, index) => (
                <button
                  className={`leaderboard-row ${effectiveKey === row.key ? "active" : ""}`}
                  key={row.key}
                  onClick={() => setSelectedTalentKey(row.key)}
                >
                  <span className="rank">{index + 1}</span>
                  <span>
                    <strong>{row.talentName}</strong>
                    <small>{managerName(row.managerId)}</small>
                  </span>
                  <strong>{money(row.total)}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <h2>{selected ? selected.talentName : "Talent"} deals</h2>
          </div>
          <div className="section-body manager-list">
            {selected ? (
              <DealCards deals={selected.deals} />
            ) : (
              <div className="notice">No talent to show yet.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
