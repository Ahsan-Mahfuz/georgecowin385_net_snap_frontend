"use client";

import { months, money, sum, columnTotals } from "@/lib/format";
import { computedOverheads } from "@/lib/pl";
import type { OverheadRow } from "@/lib/mock";

// UI-only rebuild of the prototype `overheadsView`. Static data, admin view.
const ROLE: "admin" | "manager" = "admin";
const LOCKED_IDS = ["bonus", "entertaining", "marketing"];

interface MatrixRow {
  id?: string;
  label: string;
  values: number[];
  derivedValues?: number[];
  editable?: boolean;
  editType?: string;
  total?: boolean;
}

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function EditableCell({ row, monthIndex }: { row: MatrixRow; monthIndex: number }) {
  const key = row.editType === "target" ? "target" : "overhead";
  const rowId = row.id || "target";
  const derived = Number((row.derivedValues || [])[monthIndex] || 0);
  return (
    <input
      className="table-input"
      data-edit={key}
      data-row-id={rowId}
      data-month={monthIndex}
      data-derived={derived}
      inputMode="decimal"
      defaultValue={currencyInput(row.values[monthIndex])}
      aria-label={`${row.label} ${months[monthIndex]}`}
    />
  );
}

function TableValue({ row, index }: { row: MatrixRow; index: number }) {
  if (row.editable) {
    return (
      <td>
        <EditableCell row={row} monthIndex={index} />
      </td>
    );
  }
  return <td>{money(row.values[index])}</td>;
}

function MatrixTable({ rows }: { rows: MatrixRow[] }) {
  return (
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
        {rows.map((row, rowIndex) => (
          <tr key={row.id || `${row.label}-${rowIndex}`} className={row.total ? "total-row" : ""}>
            <td>{row.label}</td>
            {months.map((_, index) => (
              <TableValue key={index} row={row} index={index} />
            ))}
            <td>{money(sum(row.values))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OverheadsView() {
  const isAdmin = ROLE === "admin";
  const undoStackLength = 0;

  const computedRows: OverheadRow[] = computedOverheads();
  const rows: MatrixRow[] = [
    ...computedRows.map((row) => ({
      ...row,
      editable: isAdmin && !LOCKED_IDS.includes(row.id),
      editType: "overhead",
    })),
    { label: "Total Overheads", values: columnTotals(computedRows), total: true },
  ];

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
          <h2>Overheads model</h2>
          <div className="section-actions">
            {isAdmin ? (
              <button className="secondary" data-undo disabled={undoStackLength === 0}>
                Undo manual edit
              </button>
            ) : null}
            <span className="pill admin">{isAdmin ? "Admin editable" : "View only"}</span>
          </div>
        </div>
        <div className="table-wrap">
          <MatrixTable rows={rows} />
        </div>
        <div className="section-body">
          <div className="notice">
            Bonuses and commission, Client entertaining, and Marketing are locked here. Commission comes from approved
            commission rules; expenses come through the Expenses tab.
          </div>
        </div>
      </section>
    </>
  );
}
