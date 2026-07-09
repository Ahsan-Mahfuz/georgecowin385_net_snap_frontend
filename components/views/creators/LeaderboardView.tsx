"use client";

import { useMemo, useState } from "react";
import { money, sum, months } from "@/lib/format";
import { Deal } from "@/lib/mock";
import { scopedDeals } from "@/lib/pl";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { toDeal, talentNamesForManager } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";

type LeaderboardScope = "personal" | "full";

interface TalentRow {
  key: string;
  managerId: string;
  talentName: string;
  total: number;
  deals: Deal[];
}

function DealCards({ deals }: { deals: Deal[] }) {
  if (!deals.length) return <div className="notice">No deals in this view yet.</div>;
  return (
    <>
      {deals.map((deal) => {
        const totalRevenue = sum(deal.monthValues);
        const monthLabel = months.find((_, i) => Number(deal.monthValues[i] || 0) > 0) || "Multi-month";
        return (
          <article className="deal" key={deal.id}>
            <div className="deal-line">
              <strong>{deal.talentName}</strong>
              <span className={`pill ${deal.status.toLowerCase()}`}>{deal.status}</span>
            </div>
            <div className="deal-line muted"><span>Campaign</span><span>{deal.campaignName}</span></div>
            <div className="deal-line muted"><span>Amount</span><span>{money(totalRevenue)}</span></div>
            <div className="deal-line muted"><span>Month</span><span>{monthLabel}</span></div>
          </article>
        );
      })}
    </>
  );
}

export default function LeaderboardView() {
  const { managers, users } = useCreatorsTeam();
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: talentData = [] } = useGetTalentsQuery();
  const deals = useMemo(() => dealData.map(toDeal), [dealData]);

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  const [scope, setScope] = useState<LeaderboardScope>("full");
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [selectedTalentKey, setSelectedTalentKey] = useState<string | null>(null);

  const managerIds = useMemo(() => {
    if (scope === "full") return managers.map((m) => m.id);
    const selected = managers.some((m) => m.id === selectedManagerId) ? selectedManagerId : managers[0]?.id;
    return selected ? [selected] : [];
  }, [scope, selectedManagerId, managers]);

  const rows = useMemo(() => {
    const map = new Map<string, TalentRow>();
    managers
      .filter((m) => managerIds.includes(m.id))
      .forEach((m) => {
        talentNamesForManager(talentData as ApiTalent[], m.id).forEach((talentName) => {
          const key = `${m.id}::${talentName}`;
          map.set(key, { key, managerId: m.id, talentName, total: 0, deals: [] });
        });
      });
    scopedDeals(deals, "live").forEach((deal) => {
      if (!managerIds.includes(deal.managerId)) return;
      const key = `${deal.managerId}::${deal.talentName}`;
      if (!map.has(key)) map.set(key, { key, managerId: deal.managerId, talentName: deal.talentName, total: 0, deals: [] });
      const row = map.get(key) as TalentRow;
      row.total += sum(deal.monthValues);
      row.deals.push(deal);
    });
    return [...map.values()].sort((a, b) => b.total - a.total || a.talentName.localeCompare(b.talentName));
  }, [managers, managerIds, talentData, deals]);

  const effectiveKey =
    selectedTalentKey && rows.some((r) => r.key === selectedTalentKey) ? selectedTalentKey : rows[0]?.key || null;
  const selected = rows.find((r) => r.key === effectiveKey);

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
              {scope === "personal" ? (
                <select className="compact-select" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
                  {managers.map((m) => (
                    <option value={m.id} key={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : null}
              <div className="segmented">
                <button className={scope === "personal" ? "active" : ""} onClick={() => setScope("personal")}>Your roster only</button>
                <button className={scope === "full" ? "active" : ""} onClick={() => setScope("full")}>Full roster</button>
              </div>
              <span className="pill confirmed">Confirmed only</span>
            </div>
          </div>
          <div className="section-body">
            <div className="leaderboard-list">
              {rows.length ? (
                rows.map((row, index) => (
                  <button className={`leaderboard-row ${effectiveKey === row.key ? "active" : ""}`} key={row.key} onClick={() => setSelectedTalentKey(row.key)}>
                    <span className="rank">{index + 1}</span>
                    <span>
                      <strong>{row.talentName}</strong>
                      <small>{managerName(row.managerId)}</small>
                    </span>
                    <strong>{money(row.total)}</strong>
                  </button>
                ))
              ) : (
                <div className="notice">No talent or deals yet.</div>
              )}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <h2>{selected ? selected.talentName : "Talent"} deals</h2>
          </div>
          <div className="section-body manager-list">
            {selected ? <DealCards deals={selected.deals} /> : <div className="notice">No talent to show yet.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
