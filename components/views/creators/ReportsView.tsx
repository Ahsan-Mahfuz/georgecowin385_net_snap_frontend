"use client";

import { useState } from "react";
import { months, money, stageClass } from "@/lib/format";
import { reportStages } from "@/lib/mock";

// The reports view depends on the CRM data store (state.crmDeals, state.talentExpenses,
// state.talentEmails, state.productionRequests, state.talentRemittanceSends). These are all
// empty on first load in the prototype, so every list here renders the prototype's empty
// state while the talent picker is still populated from the default talent roster.

type ReportStage =
  | "Conversation"
  | "Negotiation"
  | "Contract Signed"
  | "Invoiced"
  | "On Next Payment Run"
  | "Paid";

interface TalentOption {
  key: string;
  managerId: string;
  talentName: string;
}

// Minimal CRM deal shape used by the report cards / remittance table. No deals exist on
// first load, so these render paths are exercised only for structural fidelity.
interface CrmDeal {
  id: string;
  managerId: string;
  talentName: string;
  stage: string;
  company: string;
  campaignName: string;
  amount: number;
  currency?: "GBP" | "USD";
  xeroInvoiceId?: string;
}

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

// CRM report deals are empty until deals carry stage/payment data. These are
// passthroughs so the (empty) report tables compile.
function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return id || "Unassigned";
}

function reportTalentOptions(): TalentOption[] {
  return [];
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function paymentRunDate(year: number, monthIndex: number, runDay: number): string {
  const runDate = new Date(year, monthIndex, runDay);
  if (runDate.getDay() === 6) runDate.setDate(runDate.getDate() - 1);
  if (runDate.getDay() === 0) runDate.setDate(runDate.getDate() - 2);
  return runDate.toISOString().slice(0, 10);
}

function nextPaymentRunDate(reference: Date = new Date()): string {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const thisMonthRuns = [14, 28].map((day) =>
    paymentRunDate(today.getFullYear(), today.getMonth(), day)
  );
  const nextRun = thisMonthRuns.find((runDate) => new Date(`${runDate}T00:00:00`) >= today);
  if (nextRun) return nextRun;
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return paymentRunDate(nextMonth.getFullYear(), nextMonth.getMonth(), 14);
}

function monthDateRange(monthIndex: number): { startDate: string; endDate: string; label: string } {
  const index = Math.min(11, Math.max(0, Number(monthIndex || 0)));
  const start = new Date(2026, index, 1);
  const end = new Date(2026, index + 1, 0);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    label: months[index],
  };
}

function dealGbpAmount(deal: CrmDeal): number {
  const amount = Number(deal.amount || 0);
  return deal.currency === "USD" ? amount * 0.78 : amount;
}

// talentExpenses is empty on first load, so per-deal expense totals are always 0.
function dealTalentExpenseTotal(): number {
  return 0;
}

function talentPayableAmount(deal: CrmDeal): number {
  return dealGbpAmount(deal) * 0.8 + dealTalentExpenseTotal();
}

const reportsSubtitleFallback = "Talent deal stage and payment run reporting";

export default function ReportsView() {
  const [activeReportsTab, setActiveReportsTab] = useState<"status" | "remittance">("status");
  const [selectedReportTalentKey, setSelectedReportTalentKey] = useState<string | null>(null);
  const [selectedRemittanceTalentKey, setSelectedRemittanceTalentKey] = useState<string | null>(null);
  const [remittanceMode, setRemittanceMode] = useState<"month" | "custom">("month");
  const [remittanceMonthIndex, setRemittanceMonthIndex] = useState<number>(6);
  const [remittanceStartDate, setRemittanceStartDate] = useState<string>("2026-01-01");
  const [remittanceEndDate, setRemittanceEndDate] = useState<string>("2026-12-31");

  const talents = reportTalentOptions();

  const reportsTabSwitcher = (
    <section className="section soft-section">
      <div className="section-head">
        <h2>Reports</h2>
        <div className="segmented">
          <button
            className={activeReportsTab !== "remittance" ? "active" : ""}
            onClick={() => setActiveReportsTab("status")}
          >
            Talent reports
          </button>
          <button
            className={activeReportsTab === "remittance" ? "active" : ""}
            onClick={() => setActiveReportsTab("remittance")}
          >
            Talent remittance
          </button>
        </div>
      </div>
    </section>
  );

  const renderHeader = (title: string, subtitle: string) => (
    <div className="topbar">
      <div>
        <p className="eyebrow">Cowshed Creators Portal</p>
        <h1>{title}</h1>
      </div>
      <div className="asof">{subtitle}</div>
    </div>
  );

  if (activeReportsTab === "remittance") {
    const activeRemittanceKey =
      selectedRemittanceTalentKey &&
      talents.some((talent) => talent.key === selectedRemittanceTalentKey)
        ? selectedRemittanceTalentKey
        : talents[0]?.key || null;
    const selected = talents.find((talent) => talent.key === activeRemittanceKey);

    const monthRange = monthDateRange(remittanceMonthIndex);
    const periodLabel =
      remittanceMode === "month"
        ? monthRange.label
        : `${displayDate(remittanceStartDate)} to ${displayDate(remittanceEndDate)}`;
    const selectedEmail = "";
    const paidDeals: CrmDeal[] = [];
    const dealTotal = paidDeals.reduce((total, deal) => total + talentPayableAmount(deal), 0);
    const expenseTotal = paidDeals.reduce((total) => total + dealTalentExpenseTotal(), 0);

    return (
      <>
        {renderHeader(
          "Talent Remittance",
          selected ? `${selected.talentName} - ${periodLabel}` : "Paid deals by date period"
        )}
        {reportsTabSwitcher}
        <section className="section">
          <div className="section-head">
            <h2>Build remittance</h2>
            <div className="section-actions">
              <select
                className="compact-select"
                value={activeRemittanceKey || ""}
                onChange={(event) => setSelectedRemittanceTalentKey(event.target.value)}
              >
                {talents.map((talent) => (
                  <option key={talent.key} value={talent.key}>
                    {talent.talentName} - {managerName(talent.managerId)}
                  </option>
                ))}
              </select>
              <button className="primary">Send remittance</button>
            </div>
          </div>
          <div className="section-body">
            <div className="filter-grid">
              <div className="field">
                <label>Period type</label>
                <select
                  value={remittanceMode}
                  onChange={(event) => setRemittanceMode(event.target.value as "month" | "custom")}
                >
                  <option value="month">Choose by month</option>
                  <option value="custom">Choose date range</option>
                </select>
              </div>
              {remittanceMode === "month" ? (
                <div className="field">
                  <label>Month</label>
                  <select
                    value={remittanceMonthIndex}
                    onChange={(event) => setRemittanceMonthIndex(Number(event.target.value))}
                  >
                    {months.map((month, index) => (
                      <option key={month} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label>Start date</label>
                    <input
                      type="date"
                      value={remittanceStartDate}
                      onChange={(event) => setRemittanceStartDate(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>End date</label>
                    <input
                      type="date"
                      value={remittanceEndDate}
                      onChange={(event) => setRemittanceEndDate(event.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="section-body">
            <div className="payment-run-banner remittance-summary">
              <div>
                <span>Remittance period</span>
                <strong>{periodLabel}</strong>
              </div>
              <p>
                {selectedEmail
                  ? `Ready to send to ${selectedEmail}.`
                  : "Add this talent's email in the Talent tab before sending."}{" "}
                Amounts are talent payable: 80% of each deal plus 100% of approved job expenses,
                with invoice references and attachments included.
              </p>
            </div>
          </div>
          <div className="section-body invoice-summary-grid">
            <div className="earning">
              <span>Paid deals</span>
              <strong>{paidDeals.length}</strong>
            </div>
            <div className="earning">
              <span>Talent payable</span>
              <strong>{money(dealTotal)}</strong>
            </div>
            <div className="earning">
              <span>Expenses included</span>
              <strong>{money(expenseTotal)}</strong>
            </div>
          </div>
          <div className="table-wrap">
            {paidDeals.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Paid date</th>
                    <th>Company</th>
                    <th>Campaign</th>
                    <th>Gross deal</th>
                    <th>Talent payable</th>
                    <th>Invoice</th>
                    <th>Expenses attached</th>
                  </tr>
                </thead>
                <tbody>
                  {paidDeals.map((deal) => (
                    <tr key={deal.id}>
                      <td>-</td>
                      <td>{deal.company || "-"}</td>
                      <td>{deal.campaignName || "-"}</td>
                      <td>{money(dealGbpAmount(deal))}</td>
                      <td>{money(talentPayableAmount(deal))}</td>
                      <td>{deal.xeroInvoiceId || "No invoice attached"}</td>
                      <td>No expenses</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="section-body">
                <div className="notice">No paid deals in this period.</div>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  // Talent reports (status) tab.
  const activeReportKey =
    selectedReportTalentKey && talents.some((talent) => talent.key === selectedReportTalentKey)
      ? selectedReportTalentKey
      : talents[0]?.key || null;
  const selected = talents.find((talent) => talent.key === activeReportKey);

  const selectedEmail = "";
  const nextRunDate = nextPaymentRunDate();
  const reportStageList = reportStages as ReportStage[];

  // crmDeals is empty on first load, so every stage bucket is empty.
  const bucketDeals: Record<ReportStage, CrmDeal[]> = {
    Conversation: [],
    Negotiation: [],
    "Contract Signed": [],
    Invoiced: [],
    "On Next Payment Run": [],
    Paid: [],
  };

  const navigateTalent = (direction: "previous" | "next") => {
    if (!talents.length) return;
    const currentIndex = talents.findIndex((talent) => talent.key === activeReportKey);
    const delta = direction === "next" ? 1 : -1;
    const nextIndex = (currentIndex + delta + talents.length) % talents.length;
    setSelectedReportTalentKey(talents[nextIndex].key);
  };

  const reportStageColumn = (stage: ReportStage, deals: CrmDeal[]) => {
    const total = deals.reduce((sumTotal, deal) => sumTotal + talentPayableAmount(deal), 0);
    const subtitle =
      stage === "Paid"
        ? "Paid to talent"
        : stage === "On Next Payment Run"
          ? `Next run: ${displayDate(nextRunDate)}`
          : `${deals.length} deals`;
    return (
      <div key={stage} className={`report-stage ${stageClass(stage)}`}>
        <div className="report-stage-head">
          <span>{stage}</span>
          <strong>{money(total)}</strong>
          <small>{subtitle}</small>
        </div>
        <div className="report-stage-list">
          {deals.length ? (
            deals.map((deal) => {
              const talentShare = dealGbpAmount(deal) * 0.8;
              const talentExpenses = dealTalentExpenseTotal();
              const showDate = stage !== "On Next Payment Run";
              const dateLabel = stage === "Paid" ? "Paid date" : "Due date";
              return (
                <article key={deal.id} className="report-card compact-report-card">
                  <div className="report-card-head">
                    <div>
                      <strong>{deal.company || "Company needed"}</strong>
                      <span>{deal.campaignName || "No campaign name"}</span>
                    </div>
                    <strong>{money(talentPayableAmount(deal))}</strong>
                  </div>
                  <div className="talent-payable-note">
                    Talent payable: 80% deal share {money(talentShare)}
                    {talentExpenses ? ` + expenses ${money(talentExpenses)}` : ""}
                  </div>
                  {showDate ? (
                    <div className="report-card-grid">
                      <div>
                        <span>{dateLabel}</span>
                        <strong>-</strong>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="crm-empty">No deals</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderHeader(
        "Reports",
        selected ? `${selected.talentName} - ${managerName(selected.managerId)}` : reportsSubtitleFallback
      )}
      {reportsTabSwitcher}
      <section className="section">
        <div className="section-head">
          <h2>Choose talent</h2>
          <div className="section-actions">
            <button className="secondary" onClick={() => navigateTalent("previous")}>
              Previous
            </button>
            <select
              className="compact-select"
              value={activeReportKey || ""}
              onChange={(event) => setSelectedReportTalentKey(event.target.value)}
            >
              {talents.map((talent) => (
                <option key={talent.key} value={talent.key}>
                  {talent.talentName} - {managerName(talent.managerId)}
                </option>
              ))}
            </select>
            <button className="secondary" onClick={() => navigateTalent("next")}>
              Next
            </button>
            <button className="primary">Send to talent</button>
          </div>
        </div>
        {selected ? (
          <div className="section-body">
            <div className="notice">
              {selectedEmail
                ? `Report will send to ${selectedEmail}.`
                : "Add this talent's email in the Talent tab before sending their weekly report."}
            </div>
          </div>
        ) : null}
        {selected ? (
          <>
            <div className="section-body payment-run-banner-wrap">
              <div className="payment-run-banner">
                <div>
                  <span>Next payment run</span>
                  <strong>{displayDate(nextRunDate)}</strong>
                </div>
                <p>
                  Payment runs are made on the 14th and 28th. If either date falls on a weekend,
                  payment is made the Friday before.
                </p>
              </div>
            </div>
            <div className="section-body">
              <div className="notice success-notice">
                Amounts shown on this report are talent payable amounts: 80% of the deal amount plus
                100% of any approved talent expenses on that deal.
              </div>
            </div>
            <div className="report-stage-grid">
              {reportStageList.map((stage) => reportStageColumn(stage, bucketDeals[stage] || []))}
            </div>
          </>
        ) : (
          <div className="section-body">
            <div className="notice">No talent deals are visible in this report yet.</div>
          </div>
        )}
      </section>
    </>
  );
}
