"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { productionItems } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/redux/api/settingsApi";
import {
  useGetProductionRequestsQuery,
  useCreateProductionRequestMutation,
  useUpdateProductionRequestMutation,
  useDismissProductionRejectionMutation,
} from "@/redux/api/productionRequestApi";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";
import { talentNamesForManager, refId } from "@/lib/adapters";
import type { ApiTalent, ApiProductionRequest } from "@/redux/api/types";

// Mirrors currencyInput() from the prototype.
function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function refName(ref: ApiProductionRequest["manager"], fallback = "Unassigned"): string {
  if (!ref) return fallback;
  return typeof ref === "string" ? fallback : ref.name;
}

function statusPill(status: ApiProductionRequest["status"]): string {
  if (status === "completed") return "confirmed";
  if (status === "scheduled") return "admin";
  if (status === "rejected") return "rejected";
  return "pipeline";
}

type ProductionTab = "requests" | "rates";

export default function ProductionView() {
  const { managers: requestManagers, users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: settings } = useGetSettingsQuery();
  const { data: requests = [], isLoading } = useGetProductionRequestsQuery();
  const [createRequest] = useCreateProductionRequestMutation();
  const [updateRequest] = useUpdateProductionRequestMutation();
  const [dismissRejection] = useDismissProductionRejectionMutation();
  const toast = useToast();
  const user = useSelector((s: RootState) => s.session.user);
  // Scheduling, completing and rejecting a shoot belongs to the production team
  // alone. This screen is the managers' and admins' view of the same queue, so
  // it shows the state without offering the decisions. The API enforces it too.
  const canDecide = user?.role === "production";
  // Day rates are production's, admin's and operations' to set — nobody else's.
  const canEditRates = ["admin", "operations", "production"].includes(user?.role || "");
  const productionRates: Record<string, number> = settings?.productionRates || {};
  const [updateSettings, { isLoading: savingRates }] = useUpdateSettingsMutation();
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});

  const handleSaveRates = async () => {
    const rates: Record<string, number> = { ...productionRates };
    for (const [role, raw] of Object.entries(rateDrafts)) {
      const value = Number(String(raw).replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(value) || value < 0) {
        return toast.error(`Enter a valid day rate for ${role}.`);
      }
      rates[role] = value;
    }
    try {
      await updateSettings({ productionRates: rates }).unwrap();
      setRateDrafts({});
      toast.success("Production day rates saved.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save those rates."));
    }
  };

  const [activeTab, setActiveTab] = useState<ProductionTab>("requests");
  const [activeManagerId, setActiveManagerId] = useState<string>(requestManagers[0]?.id ?? "");
  const [talentName, setTalentName] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [videoBrief, setVideoBrief] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [itemDays, setItemDays] = useState<Record<string, number>>({});

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  const total = useMemo(() => {
    return productionItems.reduce((running, item) => {
      if (!checkedItems[item]) return running;
      const days = Math.max(1, Number(itemDays[item] || 1));
      return running + Number(productionRates[item] || 0) * days;
    }, 0);
  }, [checkedItems, itemDays, productionRates]);

  const managerId = requestManagers.some((m) => m.id === activeManagerId)
    ? activeManagerId
    : requestManagers[0]?.id ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerId || !talentName.trim()) return;
    const items = productionItems
      .filter((item) => checkedItems[item])
      .map((item) => ({
        name: item,
        days: Math.max(1, Number(itemDays[item] || 1)),
        rate: Number(productionRates[item] || 0),
      }));
    await createRequest({
      manager: managerId,
      talentName: talentName.trim(),
      shootDate,
      videoBrief,
      items,
      total,
    }).unwrap();
    setTalentName("");
    setShootDate("");
    setVideoBrief("");
    setCheckedItems({});
    setItemDays({});
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const calendarRequests = requests.filter(
    (r) => (r.status === "scheduled" || r.status === "completed") && r.shootDate,
  );

  /*
   * A rejection is the requesting manager's news. They see it (and get it by
   * email); admin and operations see all of them so they can chase; the rest of
   * the team is not nagged about a shoot that was never theirs.
   */
  const seesEveryRejection = ["admin", "operations"].includes(user?.role || "");
  const rejectionNotices = requests.filter((r) => {
    if (r.status !== "rejected" || r.rejectionDismissedAt) return false;
    if (seesEveryRejection) return true;
    return refId(r.submittedBy) === user?.id || refId(r.manager) === user?.id;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Production</h1>
        </div>
        <div className="asof">Request production support and track shoots</div>
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
              <span className={`pill ${canEditRates ? "admin" : ""}`}>
                {canEditRates ? "You can change these" : "View only"}
              </span>
            </div>
            <div className="section-body">
              <div className="form-grid">
                {productionItems.map((item) => (
                  <div className="field" key={item}>
                    <label htmlFor={`rate-${item}`}>{item}</label>
                    <input
                      id={`rate-${item}`}
                      inputMode="decimal"
                      readOnly={!canEditRates}
                      value={
                        canEditRates
                          ? (rateDrafts[item] ?? String(productionRates[item] ?? 0))
                          : currencyInput(productionRates[item])
                      }
                      onChange={(e) => setRateDrafts({ ...rateDrafts, [item]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              {canEditRates ? (
                <button className="primary" type="button" onClick={handleSaveRates} disabled={savingRates}>
                  {savingRates ? "Saving…" : "Save rates"}
                </button>
              ) : (
                <div className="notice soft-note">
                  Day rates are set by production, admin or operations. Ask one of them to change these.
                </div>
              )}
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
              <form className="form-grid" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="productionManagerId">Talent manager</label>
                  <select
                    id="productionManagerId"
                    value={managerId}
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
                    list="production-talent-options"
                    required
                    value={talentName}
                    onChange={(e) => setTalentName(e.target.value)}
                    placeholder="Add or choose talent"
                  />
                  <datalist id="production-talent-options">
                    {talentNamesForManager(talentData as ApiTalent[], managerId).map((name) => (
                      <option value={name} key={name}></option>
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="productionDate">Date of production</label>
                  <input
                    id="productionDate"
                    type="date"
                    required
                    value={shootDate}
                    onChange={(e) => setShootDate(e.target.value)}
                  />
                </div>
                <div className="field wide">
                  <label htmlFor="productionVideoBrief">What is the video?</label>
                  <textarea
                    id="productionVideoBrief"
                    required
                    value={videoBrief}
                    onChange={(e) => setVideoBrief(e.target.value)}
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
                            checked={!!checkedItems[item]}
                            onChange={(e) =>
                              setCheckedItems((prev) => ({ ...prev, [item]: e.target.checked }))
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
                            value={itemDays[item] ?? 1}
                            onChange={(e) =>
                              setItemDays((prev) => ({ ...prev, [item]: Number(e.target.value) }))
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
              <span className="pill confirmed">{calendarRequests.length} shoot days</span>
            </div>
            <div className="section-body manager-list">
              {calendarRequests.length ? (
                calendarRequests
                  .slice()
                  .sort((a, b) => a.shootDate.localeCompare(b.shootDate))
                  .map((r) => (
                    <article className="deal" key={r._id}>
                      <div className="deal-line">
                        <strong>{displayDate(r.shootDate)}</strong>
                        <span className={`pill ${statusPill(r.status)}`}>{r.status}</span>
                      </div>
                      <div className="deal-line muted">
                        <span>{r.talentName}</span>
                        <span>{money(r.total)}</span>
                      </div>
                    </article>
                  ))
              ) : (
                <div className="notice">No shoot days to show on the calendar yet.</div>
              )}
            </div>
          </section>

          {pendingRequests.length > 0 ? (
            <div className="notice soft-section" style={{ borderLeft: "4px solid #e53e3e", background: "#fff5f5" }}>
              <strong>🚨 Alert for Production Team:</strong> There {pendingRequests.length === 1 ? "is 1 pending production request" : `are ${pendingRequests.length} pending production requests`} awaiting review and scheduling.
            </div>
          ) : null}

<<<<<<< HEAD
          {/*
            Rejection notices stay until they are read and cleared away, and they
            belong to whoever asked for the shoot — the client wanted the
            requesting manager alerted, not the whole team. Admin and operations
            still see everything so they can chase.
            The same rejection is emailed to them; see notifyProductionRejected.
          */}
          {rejectionNotices.map((r) => (
=======
          {/* Rejection notices stay until they are read and cleared away. */}
          {requests
            .filter((r) => r.status === "rejected" && !r.rejectionDismissedAt)
            .map((r) => (
>>>>>>> ba96e6915236f6d3ec5f95840650ef0d94946b70
              <div
                key={r._id}
                className="notice rejection-notice"
                style={{ borderLeft: "4px solid #e53e3e", background: "#fff5f5" }}
              >
                <span>
                  <strong>Production Rejected ({r.talentName}):</strong>{" "}
                  {r.rejectionReason || "No rejection reason specified."} (Shoot Date:{" "}
                  {displayDate(r.shootDate)})
                </span>
                <button
                  className="ghost dismiss-notice"
                  type="button"
                  aria-label={`Dismiss the rejection notice for ${r.talentName}`}
                  onClick={async () => {
                    try {
                      await dismissRejection(r._id).unwrap();
                    } catch (err) {
                      toast.error(apiErrorMessage(err, "Could not dismiss that notice."));
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}

          <section className="section">
            <div className="section-head">
              <h2>Production requests</h2>
              <span className="pill pipeline">{pendingRequests.length} pending</span>
            </div>
            <div className="section-body manager-list">
              {requests.length ? (
                requests.map((r) => (
                  <article className="deal" key={r._id}>
                    <div className="deal-line">
                      <strong>{r.talentName}</strong>
                      <span className={`pill ${statusPill(r.status)}`}>{r.status}</span>
                    </div>
                    <div className="deal-line muted">
                      <span>Manager</span>
                      <span>{refName(r.manager, managerName(refId(r.manager)))}</span>
                    </div>
                    <div className="deal-line muted">
                      <span>Shoot date</span>
                      <span>{displayDate(r.shootDate)}</span>
                    </div>
                    <div className="deal-line muted">
                      <span>Amount</span>
                      <span>{money(r.total)}</span>
                    </div>
                    {r.videoBrief ? (
                      <div className="deal-line muted">
                        <span>Brief</span>
                        <span>{r.videoBrief}</span>
                      </div>
                    ) : null}
                    {r.status === "rejected" && r.rejectionReason ? (
                      <div className="deal-line muted" style={{ color: "#c53030" }}>
                        <span>Rejection Reason</span>
                        <span>{r.rejectionReason}</span>
                      </div>
                    ) : null}
                    {!canDecide ? (
                      r.status === "pending" ? (
                        <div className="deal-line muted">
                          <span>Waiting on</span>
                          <span>Production to schedule or turn down</span>
                        </div>
                      ) : null
                    ) : r.status === "pending" ? (
                      <div className="deal-actions">
                        <button
                          className="primary"
                          type="button"
                          onClick={() => updateRequest({ id: r._id, body: { status: "scheduled" } })}
                        >
                          Schedule shoot
                        </button>
                        <button
                          className="secondary danger-button"
                          type="button"
                          onClick={() => {
                            const reason = typeof window !== "undefined" ? window.prompt("Enter reason for rejection:") || "" : "";
                            updateRequest({ id: r._id, body: { status: "rejected", rejectionReason: reason } });
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : r.status === "scheduled" ? (
                      <div className="deal-actions">
                        <button
                          className="primary"
                          type="button"
                          onClick={() => updateRequest({ id: r._id, body: { status: "completed" } })}
                        >
                          Mark completed
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <div className="notice">{isLoading ? "Loading…" : "No production requests yet."}</div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
