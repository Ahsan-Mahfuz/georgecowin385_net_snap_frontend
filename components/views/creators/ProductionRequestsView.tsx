"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import {
  managers,
  productionItems,
  defaultProductionRates,
  talentOptions,
  type Profile,
} from "@/lib/mock";

// GBP currency string used inside the rates inputs (mirrors currencyInput() in the prototype).
function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

// Mirrors productionRequestTotal(): sum of rate * days for each selected item.
function productionRequestTotal(
  items: string[],
  rates: Record<string, number>,
  days: Record<string, number>,
): number {
  return items.reduce(
    (total, item) => total + Number(rates[item] || 0) * Math.max(1, Number(days[item] || 1)),
    0,
  );
}

type ProductionTab = "requests" | "rates";

export default function ProductionRequestsView() {
  // Static prototype context: default logged-in user is the Admin profile.
  const role = "admin" as Profile["role"];
  const canRequest = ["admin", "manager"].includes(role);
  const canManageRates = ["admin", "operations", "production"].includes(role);
  const rates = defaultProductionRates;

  const [activeTab, setActiveTab] = useState<ProductionTab>("requests");

  // Admin/operations/finance see every talent manager as a request target.
  const requestManagers = managers;
  const [selectedManagerId, setSelectedManagerId] = useState<string>(requestManagers[0]?.id ?? "");
  const activeManagerId = requestManagers.some((manager) => manager.id === selectedManagerId)
    ? selectedManagerId
    : requestManagers[0]?.id ?? "";

  // Request form selection state (drives the live total).
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemDays, setItemDays] = useState<Record<string, number>>({});

  const total = useMemo(() => {
    const selected = productionItems.filter((item) => checkedItems[item]);
    return productionRequestTotal(selected, rates, itemDays);
  }, [checkedItems, itemDays, rates]);

  // Static data: no production requests exist on first load, so every collection is empty.
  const visibleRequests: never[] = [];
  const calendarRequests: never[] = [];
  const pendingRequests: never[] = [];
  const shootDayCount = calendarRequests.length;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Production</h1>
        </div>
        <div className="asof">
          {role === "production"
            ? "Review and action production requests"
            : "Request production support and track chargebacks"}
        </div>
      </div>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Production workspace</h2>
          <div className="segmented">
            <button
              type="button"
              className={activeTab === "requests" ? "active" : ""}
              onClick={() => setActiveTab("requests")}
            >
              Production Requests
            </button>
            {canManageRates ? (
              <button
                type="button"
                className={activeTab === "rates" ? "active" : ""}
                onClick={() => setActiveTab("rates")}
              >
                Rates
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {activeTab === "rates" && canManageRates ? (
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
                      data-production-rate={item}
                      defaultValue={currencyInput(rates[item])}
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
          {canRequest ? (
            <section className="section">
              <div className="section-head">
                <h2>Request production</h2>
                <span className="pill confirmed">{role === "admin" ? "Admin entry" : "Your roster"}</span>
              </div>
              <div className="section-body">
                <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
                  <div className="field">
                    <label htmlFor="productionManagerId">Talent manager</label>
                    <select
                      id="productionManagerId"
                      name="managerId"
                      value={activeManagerId}
                      disabled={role === "manager"}
                      onChange={(event) => setSelectedManagerId(event.target.value)}
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
                      {talentOptions(activeManagerId).map((talentName) => (
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
                              checked={Boolean(checkedItems[item])}
                              onChange={(event) =>
                                setCheckedItems((prev) => ({ ...prev, [item]: event.target.checked }))
                              }
                            />{" "}
                            {item} ({money(rates[item])} per day)
                          </label>
                          <label className="days-control">
                            <span>Days</span>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              name={`days-${item}`}
                              value={itemDays[item] ?? 1}
                              onChange={(event) =>
                                setItemDays((prev) => ({ ...prev, [item]: Number(event.target.value) }))
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
          ) : null}

          <section className="section">
            <div className="section-head">
              <h2>Shoot calendar</h2>
              <span className="pill confirmed">{shootDayCount} shoot days</span>
            </div>
            <div className="section-body">
              <div className="notice">No shoot days to show on the calendar yet.</div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>{role === "production" ? "Talent requests" : "Production requests"}</h2>
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
