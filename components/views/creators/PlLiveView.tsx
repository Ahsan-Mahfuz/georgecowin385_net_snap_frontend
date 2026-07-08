"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { managers, talentOptions, type Profile } from "@/lib/mock";
import { plModel, dealRevenue, scopedDeals, type PlMode } from "@/lib/pl";

// Role is fixed for this static rebuild (admin sees the editable P&L).
const ROLE: "admin" | "manager" = "admin";

interface MatrixRow {
  label: string;
  values?: number[];
  editable?: boolean;
  editType?: "target" | "overhead";
  total?: boolean;
  polarity?: boolean;
  type?: "section";
  id?: string;
}

function polarityClass(value: number): string {
  if (Number(value) > 0) return "positive";
  if (Number(value) < 0) return "negative";
  return "";
}

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function managerName(id: string): string {
  const manager = managers.find((user) => user.id === id);
  return manager ? manager.name : id;
}

export default function PlLiveView() {
  const [plMode, setPlMode] = useState<PlMode>("live");
  const [earningsMode, setEarningsMode] = useState<PlMode>("pipeline");
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  const mode = plMode;
  const model = plModel(mode);

  const rows: MatrixRow[] = [
    { label: "Target", values: model.target, editable: ROLE === "admin" && mode === "live", editType: "target" },
    { label: mode === "pipeline" ? "Confirmed + Pipeline + CRM Conversation/Negotiation" : "Confirmed Deals", values: model.actual },
    { label: "Total Variation", values: model.variation, total: true, polarity: true },
    { type: "section", label: "Cost of Sale" },
    { label: "COS", values: model.cos },
    { label: "Overheads", values: model.overheads },
    { label: "Net Profit", values: model.netProfit, total: true, polarity: true },
  ];

  const revenue = sum(model.actual);
  const target = sum(model.target);
  const cos = sum(model.cos);
  const overheads = sum(model.overheads);
  const net = sum(model.netProfit);

  // Manager earnings ---------------------------------------------------------
  const earningRows = managers
    .map((manager: Profile) => ({ manager, total: sum(dealRevenue(earningsMode, manager.id)) }))
    .sort((a, b) => b.total - a.total);

  const activeManagerId = selectedManagerId || earningRows[0]?.manager.id || null;

  const rosterRows: [string, number][] = (() => {
    if (!activeManagerId) return [];
    const deals = scopedDeals(earningsMode, activeManagerId);
    const totals = new Map<string, number>();
    talentOptions(activeManagerId).forEach((talent) => totals.set(talent, 0));
    deals.forEach((deal) => totals.set(deal.talentName, (totals.get(deal.talentName) || 0) + sum(deal.monthValues)));
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  })();

  const renderMatrixCell = (row: MatrixRow, index: number) => {
    if (row.editable && row.values) {
      const rowId = row.id || "target";
      const key = row.editType === "target" ? "target" : "overhead";
      return (
        <td key={index}>
          <input
            className="table-input"
            data-edit={key}
            data-row-id={rowId}
            data-month={index}
            data-derived={0}
            inputMode="decimal"
            defaultValue={currencyInput(row.values[index])}
            aria-label={`${row.label} ${months[index]}`}
          />
        </td>
      );
    }
    const value = (row.values || [])[index];
    return (
      <td key={index} className={row.polarity ? polarityClass(value) : ""}>
        {money(value)}
      </td>
    );
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>P&amp;L 2026</h1>
        </div>
        <div className="asof">
          {mode === "pipeline"
            ? "Confirmed, pipeline, conversation and negotiation deals included"
            : "Confirmed deals only"}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <span>{mode === "pipeline" ? "Pipeline revenue" : "Live revenue"}</span>
          <strong>{money(revenue)}</strong>
          <small>{money(revenue - target)} vs target</small>
        </div>
        <div className="kpi">
          <span>Cost of sale</span>
          <strong>{money(cos)}</strong>
          <small>COS defaults to 80%, adjustable per deal</small>
        </div>
        <div className="kpi">
          <span>Overheads</span>
          <strong>{money(overheads)}</strong>
          <small>Admin maintained</small>
        </div>
        <div className="kpi">
          <span>Net profit</span>
          <strong className={net < 0 ? "negative" : "positive"}>{money(net)}</strong>
          <small>{mode === "pipeline" ? "Including pipeline" : "Confirmed only"}</small>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>{mode === "pipeline" ? "Pipeline P&L" : "Live P&L"}</h2>
          <div className="section-actions">
            {ROLE === "admin" ? (
              <button className="secondary" data-undo disabled>
                Undo manual edit
              </button>
            ) : null}
            <div className="segmented">
              <button className={plMode === "live" ? "active" : ""} data-pl-mode="live" onClick={() => setPlMode("live")}>
                Live
              </button>
              <button
                className={plMode === "pipeline" ? "active" : ""}
                data-pl-mode="pipeline"
                onClick={() => setPlMode("pipeline")}
              >
                Pipeline
              </button>
            </div>
          </div>
        </div>
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
              {rows.map((row, rowIndex) => {
                if (row.type === "section") {
                  return (
                    <tr className="section-row" key={rowIndex}>
                      <td colSpan={14}>{row.label}</td>
                    </tr>
                  );
                }
                const totalValue = sum(row.values || []);
                return (
                  <tr className={row.total ? "total-row" : ""} key={rowIndex}>
                    <td>{row.label}</td>
                    {months.map((_, index) => renderMatrixCell(row, index))}
                    <td className={row.polarity ? polarityClass(totalValue) : ""}>{money(totalValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section soft-section">
        <div className="section-head">
          <h2>Manager earnings at a glance</h2>
          <div className="segmented">
            <button
              className={earningsMode === "live" ? "active" : ""}
              data-earnings-mode="live"
              onClick={() => {
                setEarningsMode("live");
                setSelectedManagerId(null);
              }}
            >
              Confirmed
            </button>
            <button
              className={earningsMode === "pipeline" ? "active" : ""}
              data-earnings-mode="pipeline"
              onClick={() => {
                setEarningsMode("pipeline");
                setSelectedManagerId(null);
              }}
            >
              Confirmed + pipeline
            </button>
          </div>
        </div>
        <div className="section-body">
          <div className="earnings-grid">
            {earningRows.map(({ manager, total }) => (
              <button
                key={manager.id}
                className={`earning manager-earning ${activeManagerId === manager.id ? "active" : ""}`}
                data-manager-detail={manager.id}
                onClick={() => setSelectedManagerId(manager.id)}
              >
                <span>{manager.name}</span>
                <strong>{money(total)}</strong>
              </button>
            ))}
          </div>
          {activeManagerId ? (
            <div className="roster-panel">
              <div className="roster-title">
                <h3>{managerName(activeManagerId)} roster</h3>
                <span>{earningsMode === "pipeline" ? "Confirmed + pipeline" : "Confirmed only"}</span>
              </div>
              <div className="roster-table">
                {rosterRows.length ? (
                  rosterRows.map(([talent, total]) => (
                    <div key={talent}>
                      <span>{talent}</span>
                      <strong>{money(total)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="notice">No talent added yet.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
