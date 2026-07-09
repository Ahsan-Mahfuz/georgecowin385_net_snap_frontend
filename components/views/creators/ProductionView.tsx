"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { productionItems } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { useGetSettingsQuery } from "@/redux/api/settingsApi";
import { talentNamesForManager } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";

// Mirrors currencyInput() from the prototype.
function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

type ProductionTab = "requests" | "rates";

export default function ProductionView() {
  const { managers: requestManagers } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: settings } = useGetSettingsQuery();
  const productionRates: Record<string, number> = settings?.productionRates || {};

  const [activeTab, setActiveTab] = useState<ProductionTab>("requests");
  const [activeManagerId, setActiveManagerId] = useState<string>(
    requestManagers[0]?.id ?? ""
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemDays, setItemDays] = useState<Record<string, number>>({});

  // No production requests seeded — reproduce the empty states verbatim.
  const visibleRequests: never[] = [];
  const calendarRequests: never[] = [];
  const pendingRequests: never[] = [];

  const total = useMemo(() => {
    return productionItems.reduce((running, item) => {
      if (!checkedItems[item]) return running;
      const days = Math.max(1, Number(itemDays[item] || 1));
      return running + Number(productionRates[item] || 0) * days;
    }, 0);
  }, [checkedItems, itemDays, productionRates]);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Production</h1>
        </div>
        <div className="asof">Request production support and track chargebacks</div>
      </div>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Production workspace</h2>
          <div className="segmented">
            <button
              className={activeTab === "requests" ? "active" : ""}
              onClick={() => setActiveTab("requests")}
              type="button"
            >
              Production Requests
            </button>
            <button
              className={activeTab === "rates" ? "active" : ""}
              onClick={() => setActiveTab("rates")}
              type="button"
            >
              Rates
            </button>
          </div>
        </div>
      </section>

      {activeTab === "rates" ? (
        <div className="layout">
          <section className="section soft-section">
            <div className="section-head">
              <h2>Production rates</h2>
              <span className="pill admin">Admin + Operations + Production</span>
            </div>
            <div className="section-body">
              <div className="form-grid">
                {productionItems.map((item) => (
                  <div className="field" key={item}>
                    <label>{item}</label>
                    <input
                      defaultValue={currencyInput(productionRates[item])}
                      inputMode="decimal"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="layout">
          <section className="section">
            <div className="section-head">
              <h2>Request production</h2>
              <span className="pill confirmed">Admin entry</span>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
                <div className="field">
                  <label htmlFor="productionManagerId">Talent manager</label>
                  <select
                    id="productionManagerId"
                    name="managerId"
                    value={activeManagerId}
                    onChange={(e) => setActiveManagerId(e.target.value)}
                  >
                    {requestManagers.map((manager) => (
                      <option value={manager.id} key={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="productionTalent">Talent</label>
                  <input
                    id="productionTalent"
                    name="talentName"
                    list="production-talent-options"
                    required
                    placeholder="Add or choose talent"
                  />
                  <datalist id="production-talent-options">
                    {talentNamesForManager(talentData as ApiTalent[], activeManagerId).map((talentName) => (
                      <option value={talentName} key={talentName}></option>
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="productionDate">Date of production</label>
                  <input id="productionDate" name="shootDate" type="date" required />
                </div>
                <div className="field wide">
                  <label htmlFor="productionVideoBrief">What is the video?</label>
                  <textarea
                    id="productionVideoBrief"
                    name="videoBrief"
                    required
                    placeholder="Briefly describe the video, deliverable, or shoot"
                  ></textarea>
                </div>
                <div className="field wide">
                  <label>What is needed</label>
                  <div className="check-list">
                    {productionItems.map((item) => (
                      <div className="production-item-row" key={item}>
                        <label className="toggle-line">
                          <input
                            type="checkbox"
                            name="items"
                            value={item}
                            checked={!!checkedItems[item]}
                            onChange={(e) =>
                              setCheckedItems((prev) => ({
                                ...prev,
                                [item]: e.target.checked,
                              }))
                            }
                          />{" "}
                          {item} ({money(productionRates[item])} per day)
                        </label>
                        <label className="days-control">
                          <span>Days</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            name={`days-${item}`}
                            value={itemDays[item] ?? 1}
                            onChange={(e) =>
                              setItemDays((prev) => ({
                                ...prev,
                                [item]: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="field wide">
                  <label>Total amount</label>
                  <div className="read-field production-total">{money(total)}</div>
                </div>
                <button className="primary wide" type="submit">
                  Request production
                </button>
              </form>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Shoot calendar</h2>
              <span className="pill confirmed">
                {calendarRequests.length} shoot days
              </span>
            </div>
            <div className="section-body">
              <div className="notice">
                No shoot days to show on the calendar yet.
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Production requests</h2>
              <span className="pill pipeline">{pendingRequests.length} pending</span>
            </div>
            <div className="section-body manager-list">
              {visibleRequests.length ? null : (
                <div className="notice">No production requests yet.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
