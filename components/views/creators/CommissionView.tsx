"use client";

import { months, money, sum } from "@/lib/format";
import { managers, defaultManagerSalaries, defaultCommissionRates } from "@/lib/mock";
import { dealRevenue } from "@/lib/pl";

// This view is rendered from the admin perspective (hasAllRosterAccess === true):
// every manager's roster is visible and the admin-only overrides section shows.
// Static, UI-only — mutating controls render for fidelity but are no-ops.

type CommissionRow = { label: string; values: number[]; total?: boolean };

function managerSalary(managerId: string): number {
  return Number(defaultManagerSalaries[managerId] || 5000);
}

function managerCommissionRate(managerId: string): number {
  return Number(defaultCommissionRates[managerId] || 1);
}

function monthlyManagerRevenue(managerId: string): number[] {
  return dealRevenue("live", managerId);
}

function monthlyManagerOwnCommission(managerId: string): number[] {
  const threshold = managerSalary(managerId) * 5;
  const rate = managerCommissionRate(managerId) / 100;
  return monthlyManagerRevenue(managerId).map((revenue) =>
    revenue > threshold ? revenue * rate : 0
  );
}

// commissionOverrides is empty on first load, so shared commission is always zero.
function monthlyManagerSharedCommission(): number[] {
  return months.map(() => 0);
}

function monthlyManagerCommission(managerId: string): number[] {
  const own = monthlyManagerOwnCommission(managerId);
  const shared = monthlyManagerSharedCommission();
  return months.map((_, index) => own[index] + shared[index]);
}

function monthlyManagerCommissionGap(managerId: string): number[] {
  const threshold = managerSalary(managerId) * 5;
  return monthlyManagerRevenue(managerId).map((revenue) =>
    Math.max(threshold - revenue, 0)
  );
}

function quarterTotals(values: number[]): number[] {
  return [
    sum(values.slice(0, 3)),
    sum(values.slice(3, 6)),
    sum(values.slice(6, 9)),
    sum(values.slice(9, 12)),
  ];
}

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function MatrixTable({ rows }: { rows: CommissionRow[] }) {
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
        {rows.map((row) => (
          <tr key={row.label} className={row.total ? "total-row" : ""}>
            <td>{row.label}</td>
            {months.map((month, index) => (
              <td key={month}>{money(row.values[index])}</td>
            ))}
            <td>{money(sum(row.values))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CommissionView() {
  const isAdmin = true;
  const managerList = managers;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Commission</h1>
        </div>
        <div className="asof">Monthly commission split by manager</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Commission rules</h2>
          <span className="pill confirmed">Editable rate above threshold</span>
        </div>
        <div className="section-body">
          <div className="notice">
            Commission unlocks once monthly confirmed revenue is above 5x that
            manager&apos;s monthly salary, then pays the manager&apos;s commission
            rate on that month&apos;s revenue. Admin can adjust salary and
            commission percentage below.
          </div>
        </div>
      </section>

      <div className="commission-sections">
        {managerList.map((manager) => {
          const rows: CommissionRow[] = [
            { label: "Confirmed revenue", values: monthlyManagerRevenue(manager.id) },
            { label: "More revenue needed", values: monthlyManagerCommissionGap(manager.id) },
            { label: "Own commission", values: monthlyManagerOwnCommission(manager.id) },
            { label: "Shared roster commission", values: monthlyManagerSharedCommission() },
            { label: "Commission", values: monthlyManagerCommission(manager.id), total: true },
          ];
          const quarterlyCommission = quarterTotals(monthlyManagerCommission(manager.id));
          return (
            <section key={manager.id} className="section soft-section commission-manager">
              <div className="section-head">
                <div>
                  <h2>{manager.name}</h2>
                  <div className="muted">
                    Threshold: {money(managerSalary(manager.id) * 5)} per month
                  </div>
                </div>
                <div className="section-actions">
                  <label className="salary-control">
                    Salary
                    <input
                      defaultValue={currencyInput(managerSalary(manager.id))}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="salary-control">
                    Commission %
                    <input
                      defaultValue={managerCommissionRate(manager.id)}
                      inputMode="decimal"
                    />
                  </label>
                  <span className="pill confirmed">
                    {managerCommissionRate(manager.id)}% rate
                  </span>
                  <span className="pill confirmed">
                    {money(sum(monthlyManagerCommission(manager.id)))} commission
                  </span>
                </div>
              </div>
              <div className="table-wrap">
                <MatrixTable rows={rows} />
              </div>
              <div className="quarter-grid">
                {["Q1", "Q2", "Q3", "Q4"].map((quarter, index) => (
                  <div key={quarter} className="quarter-tile">
                    <span>{quarter} commission</span>
                    <strong>{money(quarterlyCommission[index])}</strong>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {isAdmin && (
        <section className="section soft-section">
          <div className="section-head">
            <h2>Shared roster commission</h2>
            <span className="pill admin">Admin only</span>
          </div>
          <div className="section-body">
            <form className="form-grid">
              <div className="field">
                <label htmlFor="overrideRecipient">Manager receiving commission</label>
                <select id="overrideRecipient" name="recipientManagerId">
                  {managerList.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="overrideRoster">Roster commission is based on</label>
                <select id="overrideRoster" name="rosterManagerId">
                  {managerList.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="overrideRate">Commission %</label>
                <input
                  id="overrideRate"
                  name="rate"
                  type="number"
                  min="0"
                  step="0.1"
                  defaultValue="0.2"
                />
              </div>
              <div className="field">
                <label htmlFor="overrideStartMonth">Starts from</label>
                <select id="overrideStartMonth" name="startMonthIndex">
                  {months.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary wide" type="submit">
                Add shared commission
              </button>
            </form>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Receiving manager</th>
                  <th>Roster</th>
                  <th>Commission %</th>
                  <th>Starts from</th>
                  <th>Year value</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6}>No shared roster commission added yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
