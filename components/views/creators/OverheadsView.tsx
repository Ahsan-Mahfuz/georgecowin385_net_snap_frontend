"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum } from "@/lib/format";
import { toDeal } from "@/lib/adapters";
import {
  useGetOverheadsQuery,
  useCreateOverheadMutation,
  useUpdateOverheadMutation,
  useDeleteOverheadMutation,
} from "@/redux/api/overheadApi";
import { useGetExpensesQuery } from "@/redux/api/expenseApi";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import type { ApiDeal, ApiExpense, ApiOverhead } from "@/redux/api/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const EMPTY_YEAR = () => new Array(12).fill(0) as number[];
const COMMISSION_RATE = 0.1;

// Stable fallbacks — an inline `= []` default would be a fresh reference on every
// render, which retriggers effects that depend on the query data.
const NO_OVERHEADS: ApiOverhead[] = [];
const NO_EXPENSES: ApiExpense[] = [];
const NO_DEALS: ApiDeal[] = [];

/** Rows the model always shows, created on demand the first time they are edited. */
const BASE_ROWS = ["Staff inc PAYE and NI", "Fixed and variable overheads"];

function matchesCategory(label: string, category: string): boolean {
  return label.toLowerCase().includes(category.toLowerCase());
}

export default function OverheadsView() {
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { data: overheadData = NO_OVERHEADS } = useGetOverheadsQuery();
  const { data: expenseData = NO_EXPENSES } = useGetExpensesQuery();
  const { data: dealData = NO_DEALS } = useGetDealsQuery({ year: String(year) });

  const [createOverhead, { isLoading: creating }] = useCreateOverheadMutation();
  const [updateOverhead] = useUpdateOverheadMutation();
  const [deleteOverhead] = useDeleteOverheadMutation();
  // Which line is mid-delete, so only that row's button spins.
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const [newLabel, setNewLabel] = useState("");
  // Cells being typed in. Committed to the API on blur, not on every keystroke —
  // saving per keystroke previously created a duplicate row per character typed.
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Manual rows: whatever is stored, with the two base rows always present.
  const manualRows = useMemo(() => {
    const stored = overheadData.map((o) => ({ id: o._id, label: o.label, values: o.values || EMPTY_YEAR() }));
    const missing = BASE_ROWS.filter((label) => !stored.some((r) => r.label === label)).map((label) => ({
      id: "",
      label,
      values: EMPTY_YEAR(),
    }));
    return [...stored, ...missing];
  }, [overheadData]);

  // Clear drafts once the refreshed server values arrive, so the inputs show truth.
  useEffect(() => {
    setDraft({});
  }, [overheadData]);

  // Locked row: commission derived from confirmed deals.
  const commissionRow = useMemo(() => {
    const values = EMPTY_YEAR();
    dealData
      .map(toDeal)
      .filter((d) => d.status === "Confirmed")
      .forEach((d) => {
        (d.monthValues || []).forEach((v, idx) => {
          if (idx < 12) values[idx] += Number(v || 0) * COMMISSION_RATE;
        });
      });
    return values;
  }, [dealData]);

  // Locked rows pulled from the Expenses tab. Expenses carry the category in
  // `label` — there is no separate `category` field on the model.
  const expenseRow = useMemo(
    () => (category: string) => {
      const values = EMPTY_YEAR();
      expenseData.forEach((exp) => {
        if (!matchesCategory(exp.label || "", category)) return;
        const idx = exp.monthIndex ?? 0;
        if (idx >= 0 && idx < 12) values[idx] += Number(exp.amount || 0);
      });
      return values;
    },
    [expenseData],
  );

  const clientEntertainingRow = useMemo(() => expenseRow("entertaining"), [expenseRow]);
  const marketingRow = useMemo(() => expenseRow("marketing"), [expenseRow]);

  const lockedRows = [
    { label: "Bonuses and commission", values: commissionRow, source: "confirmed deals" },
    { label: "Client entertaining", values: clientEntertainingRow, source: "Expenses" },
    { label: "Marketing", values: marketingRow, source: "Expenses" },
  ];

  const monthlyTotals = useMemo(
    () =>
      months.map((_, i) =>
        manualRows.reduce((total, r) => total + Number(r.values[i] || 0), 0) +
        lockedRows.reduce((total, r) => total + Number(r.values[i] || 0), 0),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [manualRows, commissionRow, clientEntertainingRow, marketingRow],
  );
  const grandTotal = sum(monthlyTotals);

  const cellKey = (label: string, monthIdx: number) => `${label}::${monthIdx}`;

  const commitCell = async (
    row: { id: string; label: string; values: number[] },
    monthIdx: number,
    raw: string,
  ) => {
    const key = cellKey(row.label, monthIdx);
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
    const value = Number(raw);
    if (!Number.isFinite(value) || value === Number(row.values[monthIdx] || 0)) return;

    const values = [...row.values];
    values[monthIdx] = value;
    try {
      if (row.id) {
        await updateOverhead({ id: row.id, body: { values } }).unwrap();
      } else {
        // First edit of a base row — create it once, then future edits update it.
        await createOverhead({ label: row.label, values }).unwrap();
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save that value."));
    }
  };

  const handleAddRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return toast.error("Give the overhead line a name.");
    if (manualRows.some((r) => r.label.toLowerCase() === label.toLowerCase())) {
      return toast.error(`"${label}" is already in the model.`);
    }
    try {
      await createOverhead({ label, values: EMPTY_YEAR() }).unwrap();
      toast.success(`${label} added to the overheads model.`);
      setNewLabel("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add that overhead line."));
    }
  };

  const handleDeleteRow = async (row: { id: string; label: string; values: number[] }) => {
    if (!row.id) return;
    const total = sum(row.values);
    const ok = await confirm({
      tone: "danger",
      title: "Delete overhead line?",
      confirmLabel: "Delete line",
      message: (
        <>
          <strong>{row.label}</strong> and its 12 monthly values ({money(total)} for the year) will be
          removed from the overheads model and the P&amp;L. This cannot be undone.
        </>
      ),
    });
    if (!ok) return;
    setDeletingId(row.id);
    try {
      await deleteOverhead(row.id).unwrap();
      toast.success(`${row.label} deleted.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete that line."));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Overheads</h1>
        </div>
        <div className="asof">Overheads with commission and expenses pulled in</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Overheads model {year}</h2>
          <span className="pill admin">Admin editable</span>
        </div>

        <div className="table-wrap">
          <table className="overheads-table">
            <thead>
              <tr>
                <th>Line item</th>
                {months.map((m) => (
                  <th key={m} className="numeric">
                    {m}
                  </th>
                ))}
                <th className="numeric">Total</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {manualRows.map((row) => (
                <tr key={row.label}>
                  <td className="row-label">{row.label}</td>
                  {months.map((_, i) => {
                    const key = cellKey(row.label, i);
                    const shown = draft[key] ?? (row.values[i] ? String(row.values[i]) : "");
                    return (
                      <td key={i} className="numeric">
                        <input
                          className="overhead-cell"
                          type="number"
                          step="0.01"
                          value={shown}
                          aria-label={`${row.label} ${months[i]}`}
                          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                          onBlur={(e) => commitCell(row, i, e.target.value)}
                        />
                      </td>
                    );
                  })}
                  <td className="numeric strong">{money(sum(row.values))}</td>
                  <td>
                    {row.id ? (
                      <button
                        className="secondary danger-button small"
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => handleDeleteRow(row)}
                      >
                        {deletingId === row.id ? "Deleting…" : "Delete"}
                      </button>
                    ) : (
                      <span className="muted-note">not saved yet</span>
                    )}
                  </td>
                </tr>
              ))}

              {lockedRows.map((row) => (
                <tr key={row.label} className="locked-row">
                  <td className="row-label">
                    {row.label} <small>(from {row.source})</small>
                  </td>
                  {months.map((_, i) => (
                    <td key={i} className="numeric">
                      {money(row.values[i] || 0)}
                    </td>
                  ))}
                  <td className="numeric strong">{money(sum(row.values))}</td>
                  <td />
                </tr>
              ))}

              <tr className="total-row">
                <td>Total overheads</td>
                {monthlyTotals.map((t, i) => (
                  <td key={i} className="numeric">
                    {money(t)}
                  </td>
                ))}
                <td className="numeric">{money(grandTotal)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="section-body">
          <form className="inline-add-form" onSubmit={handleAddRow}>
            <div className="field">
              <label htmlFor="newOverheadLabel">Add overhead line</label>
              <input
                id="newOverheadLabel"
                placeholder="e.g. Software subscriptions"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <button className="primary" type="submit" disabled={creating}>
              {creating ? "Adding…" : "Add line"}
            </button>
          </form>
        </div>

        <div className="section-body">
          <div className="notice">
            Bonuses and commission, Client entertaining and Marketing are locked here. Commission is
            calculated at {Math.round(COMMISSION_RATE * 100)}% of confirmed deal revenue; the two
            expense rows come through the Expenses tab. Editable cells save when you click away.
          </div>
        </div>
      </section>
    </>
  );
}
