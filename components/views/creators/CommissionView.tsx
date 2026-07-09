"use client";

import { months, money, sum } from "@/lib/format";
import { Deal } from "@/lib/mock";
import { dealRevenue } from "@/lib/pl";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetSettingsQuery } from "@/redux/api/settingsApi";
import { toDeal } from "@/lib/adapters";

type CommissionRow = { label: string; values: number[]; total?: boolean };

function quarterTotals(values: number[]): number[] {
  return [
    sum(values.slice(0, 3)),
    sum(values.slice(3, 6)),
    sum(values.slice(6, 9)),
    sum(values.slice(9, 12)),
  ];
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
  const { managers } = useCreatorsTeam();
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: settings } = useGetSettingsQuery();
  const deals: Deal[] = dealData.map(toDeal);

  const managerSalary = (id: string) => Number(settings?.managerSalaries?.[id] ?? 0);
  const managerCommissionRate = (id: string) => Number(settings?.commissionRates?.[id] ?? 0);
  const monthlyRevenue = (id: string) => dealRevenue(deals, "live", id);
  const monthlyOwnCommission = (id: string) => {
    const threshold = managerSalary(id) * 5;
    const rate = managerCommissionRate(id) / 100;
    return monthlyRevenue(id).map((rev) => (rev > threshold ? rev * rate : 0));
  };
  const monthlyGap = (id: string) => {
    const threshold = managerSalary(id) * 5;
    return monthlyRevenue(id).map((rev) => Math.max(threshold - rev, 0));
  };

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
            Commission unlocks once monthly confirmed revenue is above 5x that manager&apos;s monthly salary,
            then pays the manager&apos;s commission rate on that month&apos;s revenue. Salary and rate come from
            Settings.
          </div>
        </div>
      </section>

      <div className="commission-sections">
        {managers.length ? (
          managers.map((manager) => {
            const rows: CommissionRow[] = [
              { label: "Confirmed revenue", values: monthlyRevenue(manager.id) },
              { label: "More revenue needed", values: monthlyGap(manager.id) },
              { label: "Commission", values: monthlyOwnCommission(manager.id), total: true },
            ];
            const quarterlyCommission = quarterTotals(monthlyOwnCommission(manager.id));
            return (
              <section key={manager.id} className="section soft-section commission-manager">
                <div className="section-head">
                  <div>
                    <h2>{manager.name}</h2>
                    <div className="muted">Threshold: {money(managerSalary(manager.id) * 5)} per month</div>
                  </div>
                  <div className="section-actions">
                    <span className="pill confirmed">{managerCommissionRate(manager.id)}% rate</span>
                    <span className="pill confirmed">
                      {money(sum(monthlyOwnCommission(manager.id)))} commission
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
          })
        ) : (
          <section className="section soft-section">
            <div className="notice">No managers yet. Approve manager sign-ups in Permissions to see commission.</div>
          </section>
        )}
      </div>
    </>
  );
}
