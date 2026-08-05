"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum } from "@/lib/format";
import { businessTypes } from "@/lib/mock";
import { useGetCollectiveCommissionQuery } from "@/redux/api/collectiveDealApi";
import { useUpdateSettingsMutation } from "@/redux/api/settingsApi";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

/**
 * Commission on the Sales CRM.
 *
 * The rate follows how the deal was won — New Business, Returning Business or
 * Other — and the rates themselves are settings rather than constants, because
 * the client asked to be able to change them without a release. Only an admin
 * can; everyone else sees the sheet read-only, and a salesperson only sees their
 * own line.
 */
export default function CollectiveCommissionView() {
  const user = useSelector((s: RootState) => s.session.collectiveUser);
  const { data, isLoading } = useGetCollectiveCommissionQuery();
  const [updateSettings, { isLoading: savingRates }] = useUpdateSettingsMutation();
  const toast = useToast();

  const isAdmin = user?.role === "admin";
  const rates = data?.rates || {};
  const allRows = data?.rows || [];
  // A salesperson sees their own sheet; admin sees the team.
  const rows = isAdmin ? allRows : allRows.filter((row) => row.ownerId === user?.id);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const rateFor = (key: string, fallback: number) => Number(rates[key] ?? fallback);

  const handleSaveRates = async () => {
    const next: Record<string, number> = {};
    for (const type of businessTypes) {
      const raw = drafts[type.settingsKey];
      if (raw === undefined) continue;
      const value = Number(String(raw).replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return toast.error(`Enter a rate between 0 and 100 for ${type.label}.`);
      }
      next[type.settingsKey] = value;
    }
    if (!Object.keys(next).length) return toast.error("Nothing to save — change a rate first.");
    try {
      await updateSettings({ collectiveCommissionRates: next }).unwrap();
      setDrafts({});
      toast.success("Commission rates saved.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save those rates."));
    }
  };

  const totalCommission = rows.reduce((total, row) => total + row.commission, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Commission</h1>
        </div>
        <div className="asof">
          {isAdmin ? "Commission by salesperson and business type" : "Your commission sheet"}
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Commission rates</h2>
          <span className={`pill ${isAdmin ? "admin" : ""}`}>
            {isAdmin ? "You can change these" : "View only"}
          </span>
        </div>
        <div className="section-body">
          <div className="form-grid">
            {businessTypes.map((type) => (
              <div className="field" key={type.value}>
                <label htmlFor={`rate-${type.settingsKey}`}>{type.label}</label>
                <input
                  id={`rate-${type.settingsKey}`}
                  inputMode="decimal"
                  readOnly={!isAdmin}
                  value={
                    isAdmin
                      ? (drafts[type.settingsKey] ??
                        String(rateFor(type.settingsKey, type.fallbackRate)))
                      : `${rateFor(type.settingsKey, type.fallbackRate)}%`
                  }
                  onChange={(event) =>
                    setDrafts({ ...drafts, [type.settingsKey]: event.target.value })
                  }
                />
                <small className="field-hint">Percentage of the deal value.</small>
              </div>
            ))}
          </div>
          {isAdmin ? (
            <button
              className="primary"
              type="button"
              onClick={handleSaveRates}
              disabled={savingRates}
            >
              {savingRates ? "Saving…" : "Save rates"}
            </button>
          ) : (
            <div className="notice soft-note">
              Commission rates are set by an admin. Ask them to change these.
            </div>
          )}
          <div className="notice">
            Commission is earned on deals from <strong>Contract Signed</strong> onwards — a deal
            still in the pipeline has not been won yet. The rate on each deal follows its business
            type, set when the deal is entered on the CRM.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Commission by salesperson</h2>
          <span className="pill confirmed">{money(totalCommission)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Salesperson</th>
                <th>New Business</th>
                <th>Returning Business</th>
                <th>Other</th>
                <th>Won revenue</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.ownerId}>
                    <td>{row.ownerName}</td>
                    <td>{money(row.newBusiness)}</td>
                    <td>{money(row.returningBusiness)}</td>
                    <td>{money(row.other)}</td>
                    <td>{money(row.revenue)}</td>
                    <td>
                      <strong>{money(row.commission)}</strong>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    {isLoading ? "Loading…" : "No won deals yet — commission starts at Contract Signed."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {rows.map((row) => (
        <section className="section soft-section commission-manager" key={`sheet-${row.ownerId}`}>
          <div className="section-head">
            <div>
              <h2>{row.ownerName}</h2>
              <div className="muted">
                {row.deals.length} won deal{row.deals.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="section-actions">
              <span className="pill confirmed">{money(row.commission)} commission</span>
            </div>
          </div>

          {/* Commission spread across the months the money is scheduled to land
              in, so this lines up with Deals by month rather than contradicting it. */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Line item</th>
                  {months.map((month) => (
                    <th key={month}>{month}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="total-row">
                  <td>Commission</td>
                  {months.map((month, index) => (
                    <td key={month}>{money(row.monthly[index] || 0)}</td>
                  ))}
                  <td>{money(sum(row.monthly))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Business type</th>
                  <th>Stage</th>
                  <th>Value</th>
                  <th>Rate</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {row.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      {deal.company} · {deal.dealName}
                    </td>
                    <td>{deal.businessType}</td>
                    <td>{deal.stage}</td>
                    <td>{money(deal.amount)}</td>
                    <td>{deal.rate}%</td>
                    <td>{money(deal.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
