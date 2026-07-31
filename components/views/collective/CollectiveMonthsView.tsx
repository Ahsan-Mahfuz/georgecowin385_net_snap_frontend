"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { collectiveStages, type CollectiveDeal } from "@/lib/mock";
import { scopedCollectiveDeals, type CollectiveScope } from "@/lib/collective";
import { useCollectiveTeam } from "@/hooks/useCollectiveTeam";
import { useGetCollectiveDealsQuery } from "@/redux/api/collectiveDealApi";
import { toCollectiveDeal } from "@/lib/adapters";
import CollectiveDealSummary from "./CollectiveDealSummary";

export default function CollectiveMonthsView() {
  const { users: collectiveSalesUsers } = useCollectiveTeam();
  const { data: dealData = [] } = useGetCollectiveDealsQuery();
  const collectiveUserName = (id: string): string =>
    collectiveSalesUsers.find((user) => user.id === id)?.name || "Unassigned";

  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [scope, setScope] = useState<CollectiveScope>("all");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const deals: CollectiveDeal[] = scopedCollectiveDeals(
    dealData.map(toCollectiveDeal),
    scope,
  ).sort(
    (a, b) =>
      collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
      a.company.localeCompare(b.company),
  );
  const monthlyTotals = months.map((_, index) =>
    deals.reduce((total, deal) => total + Number((deal.monthValues || [])[index] || 0), 0),
  );
  const selectedMonth = monthFilter === "all" ? null : Number(monthFilter);
  const monthDeals =
    selectedMonth === null
      ? []
      : deals.filter((deal) => Number((deal.monthValues || [])[selectedMonth] || 0) > 0);

  const selectedDeal = deals.find((deal) => deal.id === selectedDealId) || null;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Deals by month</h1>
        </div>
        <div className="asof">Expected cash due to land by payment month</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Monthly cash view</h2>
          <div className="section-actions">
            <div className="segmented" role="group" aria-label="Live or pipeline deals">
              {(["all", "live", "pipeline"] as CollectiveScope[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  data-collective-scope={option}
                  className={scope === option ? "active" : ""}
                  onClick={() => setScope(option)}
                >
                  {option === "all" ? "All deals" : option === "live" ? "Live" : "Pipeline"}
                </button>
              ))}
            </div>
            <select
              className="compact-select"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
            >
              <option value="all">Show totals only</option>
              {months.map((month, index) => (
                <option key={month} value={String(index)}>
                  {month}
                </option>
              ))}
            </select>
            <span className="pill">{money(sum(monthlyTotals))}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {months.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTotals.map((total, index) => (
                  <td key={index}>
                    {total ? (
                      <button
                        className="table-link"
                        type="button"
                        onClick={() => setMonthFilter(String(index))}
                      >
                        {money(total)}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
                <td>{money(sum(monthlyTotals))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {selectedMonth !== null ? (
        <section className="section soft-section">
          <div className="section-head">
            <h2>{months[selectedMonth]} deal breakdown</h2>
            <span className="pill">{money(monthlyTotals[selectedMonth])}</span>
          </div>
          <div className="section-body manager-list">
            {monthDeals.length ? (
              monthDeals.map((deal) => (
                <button
                  key={deal.id}
                  className="deal-card"
                  type="button"
                  onClick={() => setSelectedDealId(deal.id)}
                >
                  <div>
                    <strong>{deal.company}</strong>
                    <small>
                      {deal.dealName} · {collectiveUserName(deal.ownerId)} · {deal.stage}
                    </small>
                  </div>
                  <strong>{money((deal.monthValues || [])[selectedMonth])}</strong>
                </button>
              ))
            ) : (
              <div className="notice">No scheduled cash for this month.</div>
            )}
          </div>
        </section>
      ) : null}

      {selectedDeal ? (
        <div className="crm-detail-overlay">
          <section
            className="crm-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedDeal.company} sales deal details`}
          >
            <button
              className="crm-detail-close"
              type="button"
              onClick={() => setSelectedDealId(null)}
              aria-label="Close deal details"
            >
              ×
            </button>
            <div className="section-head">
              <h2>{selectedDeal.company}</h2>
              <span className="pill confirmed">{selectedDeal.stage}</span>
            </div>
            <div className="section-body">
              <CollectiveDealSummary
                deal={selectedDeal}
                ownerName={collectiveUserName(selectedDeal.ownerId)}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
