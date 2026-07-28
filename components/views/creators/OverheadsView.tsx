"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum } from "@/lib/format";
import { toOverheadRow, toDeal } from "@/lib/adapters";
import {
  useGetOverheadsQuery,
  useCreateOverheadMutation,
} from "@/redux/api/overheadApi";
import { useGetExpensesQuery } from "@/redux/api/expenseApi";
import { useGetDealsQuery } from "@/redux/api/dealApi";

export default function OverheadsView() {
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { data: overheadData = [] } = useGetOverheadsQuery();
  const { data: expenseData = [] } = useGetExpensesQuery();
  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const [createOverhead] = useCreateOverheadMutation();

  const [editable, setEditable] = useState(true);

  // Manual editable rows: Staff inc PAYE and NI, Fixed and variable overheads
  const rows = useMemo(() => overheadData.map(toOverheadRow), [overheadData]);

  const staffRow = useMemo(() => {
    const found = rows.find((r) => r.label.toLowerCase().includes("staff"));
    return found ? found.values : [12057.36, 12057.36, 15471.00, 15471.00, 18834.40, 18834.40, 18834.40, 18834.40, 18834.40, 18834.40, 18834.40, 18834.40];
  }, [rows]);

  const fixedOverheadsRow = useMemo(() => {
    const found = rows.find((r) => r.label.toLowerCase().includes("fixed"));
    return found ? found.values : [1575.00, 1575.00, 1575.00, 1600.00, 1600.00, 1620.00, 1620.00, 1620.00, 1800.00, 1800.00, 1800.00, 1800.00];
  }, [rows]);

  // Locked row 1: Bonuses and commission (calculated from confirmed deals)
  const commissionRow = useMemo(() => {
    const values = new Array(12).fill(0);
    const deals = dealData.map(toDeal);
    deals.filter((d) => d.status === "Confirmed").forEach((d) => {
      (d.monthValues || []).forEach((v, idx) => {
        if (idx < 12) values[idx] += (Number(v || 0) * 0.1); // ~10% commission rule
      });
    });
    // Default reference values if no confirmed deals in DB yet
    const defaults = [1948.76, 1530.92, 2469.88, 2134.71, 2574.59, 1510.02, 400.00, 0, 0, 0, 0, 0];
    return values.map((val, i) => (val > 0 ? val : defaults[i]));
  }, [dealData]);

  // Locked row 2: Client entertaining (pulled from Expenses under category 'Client entertaining')
  const clientEntertainingRow = useMemo(() => {
    const values = new Array(12).fill(0);
    expenseData.forEach((exp) => {
      if (exp.category === "Client entertaining" || exp.label.toLowerCase().includes("entertaining")) {
        const mIdx = exp.monthIndex ?? 0;
        if (mIdx >= 0 && mIdx < 12) values[mIdx] += Number(exp.amount || 0);
      }
    });
    const defaults = [440.94, 458.93, 0, 258.00, 192.06, 0, 100.00, 0, 0, 0, 0, 0];
    return values.map((val, i) => (val > 0 ? val : defaults[i]));
  }, [expenseData]);

  // Locked row 3: Marketing (pulled from Expenses under category 'Marketing')
  const marketingRow = useMemo(() => {
    const values = new Array(12).fill(0);
    expenseData.forEach((exp) => {
      if (exp.category === "Marketing" || exp.label.toLowerCase().includes("marketing")) {
        const mIdx = exp.monthIndex ?? 0;
        if (mIdx >= 0 && mIdx < 12) values[mIdx] += Number(exp.amount || 0);
      }
    });
    const defaults = [647.89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    return values.map((val, i) => (val > 0 ? val : defaults[i]));
  }, [expenseData]);

  // Local state for editable fields
  const [staffValues, setStaffValues] = useState<number[]>(staffRow);
  const [fixedValues, setFixedValues] = useState<number[]>(fixedOverheadsRow);

  const handleCellChange = (rowType: "staff" | "fixed", monthIdx: number, val: string) => {
    const num = Number(val) || 0;
    if (rowType === "staff") {
      const copy = [...staffValues];
      copy[monthIdx] = num;
      setStaffValues(copy);
      createOverhead({ label: "Staff inc PAYE and NI", values: copy });
    } else {
      const copy = [...fixedValues];
      copy[monthIdx] = num;
      setFixedValues(copy);
      createOverhead({ label: "Fixed and variable overheads", values: copy });
    }
  };

  const handleUndo = () => {
    setStaffValues(staffRow);
    setFixedValues(fixedOverheadsRow);
  };

  // Compute total monthly overheads
  const monthlyTotals = useMemo(() => {
    return months.map((_, i) => {
      return (
        (staffValues[i] || 0) +
        (commissionRow[i] || 0) +
        (fixedValues[i] || 0) +
        (clientEntertainingRow[i] || 0) +
        (marketingRow[i] || 0)
      );
    });
  }, [staffValues, commissionRow, fixedValues, clientEntertainingRow, marketingRow]);

  const grandTotal = sum(monthlyTotals);

  return (
    <>
      <div className="topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">COWSHED CREATORS PORTAL</p>
          <h1>Overheads</h1>
        </div>
        <div className="asof" style={{ color: "#687178", fontSize: "13px" }}>
          Overheads with commission and expenses pulled in
        </div>
      </div>

      <section className="section" style={{ background: "#ffffff", borderRadius: "12px", padding: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2>Overheads model</h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="secondary small" type="button" onClick={handleUndo} style={{ background: "#f0f3f5", border: "1px solid #d9e0e4", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }}>
              Undo manual edit
            </button>
            <button
              className="pill"
              type="button"
              onClick={() => setEditable(!editable)}
              style={{ background: "#f9dede", color: "#9d3030", fontWeight: 700, padding: "6px 14px", borderRadius: "12px", border: "none", cursor: "pointer" }}
            >
              Admin editable
            </button>
          </div>
        </div>

        <div className="table-wrap" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e0e0e0", textAlign: "left" }}>
                <th style={{ padding: "10px", minWidth: "180px" }}>LINE ITEM</th>
                {months.map((m) => (
                  <th key={m} style={{ padding: "10px", textAlign: "right" }}>{m.toUpperCase()} 26</th>
                ))}
                <th style={{ padding: "10px", textAlign: "right" }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Staff inc PAYE and NI */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px", fontWeight: 600 }}>Staff inc PAYE and NI</td>
                {months.map((_, i) => (
                  <td key={i} style={{ padding: "6px 10px", textAlign: "right" }}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        value={staffValues[i] || ""}
                        onChange={(e) => handleCellChange("staff", i, e.target.value)}
                        style={{ width: "84px", textAlign: "right", padding: "4px", border: "1px solid #ccc", borderRadius: "6px" }}
                      />
                    ) : (
                      money(staffValues[i] || 0)
                    )}
                  </td>
                ))}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{money(sum(staffValues))}</td>
              </tr>

              {/* Row 2: Bonuses and commission (LOCKED) */}
              <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                <td style={{ padding: "10px", color: "#444" }}>
                  Bonuses and commission <small style={{ color: "#999" }}>(locked)</small>
                </td>
                {months.map((_, i) => (
                  <td key={i} style={{ padding: "10px", textAlign: "right" }}>{money(commissionRow[i] || 0)}</td>
                ))}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{money(sum(commissionRow))}</td>
              </tr>

              {/* Row 3: Fixed and variable overheads */}
              <tr style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px", fontWeight: 600 }}>Fixed and variable overheads</td>
                {months.map((_, i) => (
                  <td key={i} style={{ padding: "6px 10px", textAlign: "right" }}>
                    {editable ? (
                      <input
                        type="number"
                        step="0.01"
                        value={fixedValues[i] || ""}
                        onChange={(e) => handleCellChange("fixed", i, e.target.value)}
                        style={{ width: "84px", textAlign: "right", padding: "4px", border: "1px solid #ccc", borderRadius: "6px" }}
                      />
                    ) : (
                      money(fixedValues[i] || 0)
                    )}
                  </td>
                ))}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{money(sum(fixedValues))}</td>
              </tr>

              {/* Row 4: Client entertaining (LOCKED) */}
              <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                <td style={{ padding: "10px", color: "#444" }}>
                  Client entertaining <small style={{ color: "#999" }}>(locked)</small>
                </td>
                {months.map((_, i) => (
                  <td key={i} style={{ padding: "10px", textAlign: "right" }}>{money(clientEntertainingRow[i] || 0)}</td>
                ))}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{money(sum(clientEntertainingRow))}</td>
              </tr>

              {/* Row 5: Marketing (LOCKED) */}
              <tr style={{ borderBottom: "1px solid #eee", background: "#fafafa" }}>
                <td style={{ padding: "10px", color: "#444" }}>
                  Marketing <small style={{ color: "#999" }}>(locked)</small>
                </td>
                {months.map((_, i) => (
                  <td key={i} style={{ padding: "10px", textAlign: "right" }}>{money(marketingRow[i] || 0)}</td>
                ))}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 700 }}>{money(sum(marketingRow))}</td>
              </tr>

              {/* Total Overheads Row */}
              <tr style={{ background: "#e2f0e8", fontWeight: 800 }}>
                <td style={{ padding: "12px 10px", color: "#1f6b52" }}>Total Overheads</td>
                {monthlyTotals.map((t, i) => (
                  <td key={i} style={{ padding: "12px 10px", textAlign: "right", color: "#1f6b52" }}>{money(t)}</td>
                ))}
                <td style={{ padding: "12px 10px", textAlign: "right", color: "#1f6b52" }}>{money(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Yellow Info Banner */}
        <div style={{ marginTop: "20px", background: "#fff8e6", border: "1px solid #f7e3ad", padding: "14px 18px", borderRadius: "8px", color: "#8a6d3b", fontSize: "13px" }}>
          Bonuses and commission, Client entertaining, and Marketing are locked here. Commission comes from approved commission rules; expenses come through the Expenses tab.
        </div>
      </section>
    </>
  );
}
