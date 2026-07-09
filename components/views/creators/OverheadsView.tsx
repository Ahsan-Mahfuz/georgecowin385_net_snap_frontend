"use client";

import { useState } from "react";
import { months, money, sum, columnTotals } from "@/lib/format";
import type { OverheadRow } from "@/lib/mock";
import { toOverheadRow } from "@/lib/adapters";
import {
  useGetOverheadsQuery,
  useCreateOverheadMutation,
  useDeleteOverheadMutation,
} from "@/redux/api/overheadApi";

export default function OverheadsView() {
  const { data = [], isLoading } = useGetOverheadsQuery();
  const [createOverhead] = useCreateOverheadMutation();
  const [deleteOverhead] = useDeleteOverheadMutation();

  const rows: OverheadRow[] = data.map(toOverheadRow);
  const totals = columnTotals(rows);

  const [label, setLabel] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [amount, setAmount] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const values = new Array(12).fill(0);
    values[monthIndex] = Number(amount) || 0;
    await createOverhead({ label: label.trim(), values });
    setLabel("");
    setAmount("");
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Overheads</h1>
        </div>
        <div className="asof">Monthly fixed and variable overheads</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Overheads model</h2>
          <span className="pill">{money(sum(totals))} total</span>
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                <>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.label}</td>
                      {months.map((_, index) => (
                        <td key={index}>{money(row.values[index] || 0)}</td>
                      ))}
                      <td>{money(sum(row.values))}</td>
                      <td>
                        <button
                          className="secondary danger-button small"
                          type="button"
                          onClick={() => deleteOverhead(row.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total Overheads</td>
                    {totals.map((t, i) => (
                      <td key={i}>{money(t)}</td>
                    ))}
                    <td>{money(sum(totals))}</td>
                    <td></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan={15}>
                    {isLoading ? "Loading…" : "No overheads yet. Add a line below."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="section-body">
          <form className="form-grid" onSubmit={handleAdd}>
            <div className="field">
              <label htmlFor="ohLabel">Line item</label>
              <input id="ohLabel" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Staff, Marketing" required />
            </div>
            <div className="field">
              <label htmlFor="ohMonth">Month</label>
              <select id="ohMonth" value={monthIndex} onChange={(e) => setMonthIndex(Number(e.target.value))}>
                {months.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ohAmount">Amount</label>
              <input id="ohAmount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <button className="primary wide" type="submit">Add overhead line</button>
          </form>
        </div>
      </section>
    </>
  );
}
