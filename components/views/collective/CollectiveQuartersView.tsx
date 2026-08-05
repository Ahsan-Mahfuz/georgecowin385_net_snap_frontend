"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { money, sum } from "@/lib/format";
import { collectiveStages, type CollectiveDeal, type Profile } from "@/lib/mock";
import { dealsByStage, scopedCollectiveDeals, type CollectiveScope } from "@/lib/collective";
import { useCollectiveTeam } from "@/hooks/useCollectiveTeam";
import { useGetCollectiveDealsQuery } from "@/redux/api/collectiveDealApi";
import { toCollectiveDeal } from "@/lib/adapters";
import CollectiveDealSummary from "./CollectiveDealSummary";

export default function CollectiveQuartersView() {
  const sessionUser = useSelector((s: RootState) => s.session.collectiveUser);
  const { users: collectiveSalesUsers } = useCollectiveTeam();
  const { data: dealData = [] } = useGetCollectiveDealsQuery();
  const collectiveUser: Profile | null = sessionUser;
  const collectiveUserName = (id: string): string =>
    collectiveSalesUsers.find((user) => user.id === id)?.name || "Unassigned";

  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [scope, setScope] = useState<CollectiveScope>("all");

  const ownedDeals: CollectiveDeal[] =
    collectiveUser?.role === "admin"
      ? dealData.map(toCollectiveDeal)
      : dealData.map(toCollectiveDeal).filter((deal) => deal.ownerId === collectiveUser?.id);
  const deals = scopedCollectiveDeals(ownedDeals, scope).sort(
    (a, b) =>
      collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
      a.company.localeCompare(b.company),
  );
  const quarterLabels = ["Q1", "Q2", "Q3", "Q4"];
  const quarterValues = [0, 1, 2, 3].map((quarterIndex) =>
    deals.reduce((total, deal) => {
      const start = quarterIndex * 3;
      return total + sum((deal.monthValues || []).slice(start, start + 3));
    }, 0)
  );

  const selectedDeal = deals.find((item) => item.id === selectedDealId) || null;

  const [stageQuarter, setStageQuarter] = useState<string>("all");

  /*
   * Deals by stage. Narrowing to a quarter counts only the money scheduled in
   * that quarter, so the tiles add up to the quarter total above rather than to
   * the whole deal values.
   */
  const stageTallies = (() => {
    if (stageQuarter === "all") return dealsByStage(deals);
    const start = Number(stageQuarter) * 3;
    const inQuarter = deals.filter(
      (deal) => sum((deal.monthValues || []).slice(start, start + 3)) > 0,
    );
    return dealsByStage(inQuarter, (deal) =>
      sum((deal.monthValues || []).slice(start, start + 3)),
    );
  })();

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Quarter view</h1>
        </div>
        <div className="asof">Quarterly sales and expected payment timing</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Quarter totals</h2>
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
            <span className="pill">{money(sum(quarterValues))}</span>
          </div>
        </div>
        <div className="quarter-grid">
          {quarterLabels.map((label, index) => (
            <div className="quarter-tile" key={label}>
              <span>{label}</span>
              <strong>{money(quarterValues[index])}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Deals by stage</h2>
          <div className="section-actions">
            <select
              className="compact-select"
              aria-label="Quarter to break down by stage"
              value={stageQuarter}
              onChange={(event) => setStageQuarter(event.target.value)}
            >
              <option value="all">Whole year</option>
              {quarterLabels.map((label, index) => (
                <option key={label} value={String(index)}>
                  {label}
                </option>
              ))}
            </select>
            <span className="pill">
              {money(stageTallies.reduce((total, tally) => total + tally.total, 0))}
            </span>
          </div>
        </div>
        <div className="section-body">
          {stageTallies.length ? (
            <div className="stage-tally-grid">
              {stageTallies.map((tally) => (
                <div className="stage-tally" key={tally.stage}>
                  <span>{tally.stage}</span>
                  <strong>{money(tally.total)}</strong>
                  <small>
                    {tally.count} deal{tally.count === 1 ? "" : "s"}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice">No deals to break down yet.</div>
          )}
          <small className="field-hint">
            Counting{" "}
            {stageQuarter === "all"
              ? "every scheduled deal"
              : `cash scheduled in ${quarterLabels[Number(stageQuarter)]}`}
            .
          </small>
        </div>
      </section>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Deals by quarter</h2>
          <span className="pill">{deals.length} deals</span>
        </div>
        <div className="section-body collective-quarter-list">
          {quarterLabels.map((label, index) => {
            const start = index * 3;
            const quarterDeals = deals.filter(
              (deal) => sum((deal.monthValues || []).slice(start, start + 3)) > 0
            );
            return (
              <div className="quarter-column" key={label}>
                <h3>{label}</h3>
                {quarterDeals.length ? (
                  quarterDeals.map((deal) => (
                    <button
                      className="deal-card"
                      type="button"
                      key={deal.id}
                      onClick={() => setSelectedDealId(deal.id)}
                    >
                      <div>
                        <strong>{deal.company}</strong>
                        <small>
                          {deal.dealName} · {deal.stage}
                        </small>
                      </div>
                      <strong>{money(sum((deal.monthValues || []).slice(start, start + 3)))}</strong>
                    </button>
                  ))
                ) : (
                  <div className="notice">No payments scheduled.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
              aria-label="Close deal details"
              onClick={() => setSelectedDealId(null)}
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
