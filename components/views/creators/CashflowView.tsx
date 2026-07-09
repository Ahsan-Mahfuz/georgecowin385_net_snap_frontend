"use client";

import { useState } from "react";
import { months, money, sum, usdToGbpRate, currencyMoney } from "@/lib/format";
import { paymentTerms } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";

// The CRM deal shape the prototype's cashflow view reads. On first load the
// prototype's state.crmDeals collection is empty, so the derived tables render
// their empty states exactly as below.
interface CrmDeal {
  id: string;
  managerId: string;
  talentName: string;
  company: string;
  campaignName: string;
  stage: string;
  paymentTerm: string;
  customPaymentDays?: number;
  signedMonthIndex?: number | null;
  liveMonthIndex?: number;
  xeroDueDate?: string;
  amount: number;
  currency?: "GBP" | "USD";
}

// CRM cashflow deals are empty until deals carry payment terms; passthrough keeps
// the (unrendered) rows compiling.
function managerName(id: string): string {
  return id;
}

function dealGbpAmount(deal: CrmDeal): number {
  const amount = Number(deal.amount || 0);
  return deal.currency === "USD" ? amount * usdToGbpRate : amount;
}

function dealMoney(deal: CrmDeal): string {
  if (deal.currency === "USD") return `${currencyMoney(deal.amount, "USD")} / ${money(dealGbpAmount(deal))}`;
  return money(deal.amount);
}

function crmPaymentDays(deal: CrmDeal): number {
  if (deal.paymentTerm === "custom") return Number(deal.customPaymentDays || 0);
  return (paymentTerms.find((term) => term.value === deal.paymentTerm) || paymentTerms[1]).days;
}

function crmPaymentLabel(deal: CrmDeal): string {
  if (deal.paymentTerm === "custom") return `${crmPaymentDays(deal)} days`;
  return (paymentTerms.find((term) => term.value === deal.paymentTerm) || paymentTerms[1]).label;
}

function signedMonthIndex(deal: CrmDeal): number {
  if (deal.signedMonthIndex !== null && deal.signedMonthIndex !== undefined) return Number(deal.signedMonthIndex || 0);
  return Number(deal.liveMonthIndex || 0);
}

function crmDueMonthIndex(deal: CrmDeal): number {
  return signedMonthIndex(deal) + Math.ceil(crmPaymentDays(deal) / 30);
}

function crmDueMonthLabel(deal: CrmDeal): string {
  const dueIndex = crmDueMonthIndex(deal);
  return months[dueIndex] || "After Dec 26";
}

function crmDueDate(deal: CrmDeal): string {
  if (deal.xeroDueDate) return deal.xeroDueDate;
  const base = new Date(2026, signedMonthIndex(deal), 1);
  base.setDate(base.getDate() + crmPaymentDays(deal));
  return base.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function CashflowDealsTable({ deals }: { deals: CrmDeal[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Due in</th>
          <th>Talent</th>
          <th>Manager</th>
          <th>Company</th>
          <th>Campaign</th>
          <th>Stage</th>
          <th>Signed month</th>
          <th>Payment terms</th>
          <th>Invoice due date</th>
          <th>Amount due</th>
        </tr>
      </thead>
      <tbody>
        {deals.length ? (
          deals.map((deal) => (
            <tr key={deal.id}>
              <td>
                <strong>{crmDueMonthLabel(deal)}</strong>
              </td>
              <td>{deal.talentName}</td>
              <td>{managerName(deal.managerId)}</td>
              <td>{deal.company}</td>
              <td>{deal.campaignName || "-"}</td>
              <td>{deal.stage}</td>
              <td>{months[signedMonthIndex(deal)]}</td>
              <td>{crmPaymentLabel(deal)}</td>
              <td>{displayDate(crmDueDate(deal))}</td>
              <td>{dealMoney(deal)}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={10}>No CRM payments due yet.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function CashflowView() {
  const [selectedManagerId, setSelectedManagerId] = useState<string>("all");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  // Managers accessible in the cashflow filter.
  const { managers: accessibleManagers } = useCreatorsTeam();

  // state.crmDeals is empty on first load — reproduce the empty pipeline.
  const crmDeals: CrmDeal[] = [];

  const deals = crmDeals
    .filter((deal) => selectedManagerId === "all" || deal.managerId === selectedManagerId)
    .sort(
      (a, b) =>
        crmDueMonthIndex(a) - crmDueMonthIndex(b) ||
        managerName(a.managerId).localeCompare(managerName(b.managerId)),
    );

  const monthlyTotals = months.map((_, index) =>
    deals
      .filter((deal) => crmDueMonthIndex(deal) === index)
      .reduce((total, deal) => total + dealGbpAmount(deal), 0),
  );

  const afterYearTotal = deals
    .filter((deal) => crmDueMonthIndex(deal) > 11)
    .reduce((total, deal) => total + dealGbpAmount(deal), 0);

  const selectedMonthDeals =
    selectedMonthIndex === null
      ? []
      : deals.filter((deal) => crmDueMonthIndex(deal) === Number(selectedMonthIndex));
  const selectedMonthTotal = selectedMonthDeals.reduce((total, deal) => total + dealGbpAmount(deal), 0);

  const grandTotal = sum(monthlyTotals) + afterYearTotal;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Cashflow</h1>
        </div>
        <div className="asof">Expected CRM payments due into Cowshed</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Expected receipts</h2>
          <div className="section-actions">
            <select
              className="compact-select"
              data-cashflow-manager
              value={selectedManagerId}
              onChange={(event) => setSelectedManagerId(event.target.value)}
            >
              <option value="all">All managers</option>
              {accessibleManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
            <span className="pill">{money(grandTotal)}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {months.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>After Dec 26</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyTotals.map((total, index) => (
                  <td key={index}>
                    {total ? (
                      <button
                        className={`table-link cashflow-total ${
                          selectedMonthIndex !== null && Number(selectedMonthIndex) === index ? "active" : ""
                        }`}
                        type="button"
                        data-cashflow-month={index}
                        onClick={() => setSelectedMonthIndex(index)}
                      >
                        {money(total)}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                ))}
                <td>{afterYearTotal ? money(afterYearTotal) : "-"}</td>
                <td>{money(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {selectedMonthIndex !== null ? (
        <section className="section">
          <div className="section-head">
            <h2>{months[Number(selectedMonthIndex)]} cashflow breakdown</h2>
            <div className="section-actions">
              <span className="pill">{money(selectedMonthTotal)}</span>
              <button
                className="secondary"
                type="button"
                data-cashflow-clear
                onClick={() => setSelectedMonthIndex(null)}
              >
                Clear month
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <CashflowDealsTable deals={selectedMonthDeals} />
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2>Payment due report</h2>
          <span className="pill">{deals.length} deals</span>
        </div>
        <div className="table-wrap">
          <CashflowDealsTable deals={deals} />
        </div>
      </section>
    </>
  );
}
