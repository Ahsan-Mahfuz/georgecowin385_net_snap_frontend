"use client";

import { useState } from "react";
import { months, money, sum, stageClass, currentMonthIndex } from "@/lib/format";
import { reportStages, type Deal } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery, useSendTalentReportMutation } from "@/redux/api/talentApi";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetExpensesQuery } from "@/redux/api/expenseApi";
import { useGetPaymentRunsQuery } from "@/redux/api/paymentRunApi";
import { useGetProductionRequestsQuery } from "@/redux/api/productionRequestApi";
import { nextRunDate, runDatesFrom } from "@/lib/paymentRuns";
import { toDeal, talentNamesForManager, refId } from "@/lib/adapters";
import type { ApiExpense, ApiTalent, ApiProductionRequest } from "@/redux/api/types";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

// Set by the component so module-level helpers resolve live data.
let liveUsers: { id: string; name: string }[] = [];
let liveTalents: ApiTalent[] = [];

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
  costRate?: number;
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  remittancePaidAt?: string;
}

function toReportCrmDeal(d: Deal): CrmDeal {
  return {
    id: d.id,
    managerId: d.managerId,
    talentName: d.talentName,
    stage: d.stage || "",
    company: d.company || "",
    campaignName: d.campaignName || "",
    amount: sum(d.monthValues || []),
    currency: d.currency,
    costRate: d.costRate,
    xeroInvoiceId: d.xeroInvoiceId,
    xeroInvoiceNumber: d.xeroInvoiceNumber,
    remittancePaidAt: d.remittancePaidAt,
  };
}

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return liveUsers.find((u) => u.id === id)?.name || "Unassigned";
}

// Talent roster from the live Talent collection (all managers).
function reportTalentOptions(): TalentOption[] {
  const rows = new Map<string, TalentOption>();
  liveUsers.forEach((u) => {
    talentNamesForManager(liveTalents, u.id).forEach((talentName) => {
      rows.set(talentKey(u.id, talentName), { key: talentKey(u.id, talentName), managerId: u.id, talentName });
    });
  });
  return [...rows.values()].sort(
    (a, b) => a.talentName.localeCompare(b.talentName) || managerName(a.managerId).localeCompare(managerName(b.managerId)),
  );
}

// Map a live Deal into the minimal CrmDeal shape the report cards use.
function dealToReport(deal: Deal): CrmDeal {
  return {
    id: deal.id,
    managerId: deal.managerId,
    talentName: deal.talentName,
    stage: deal.stage || (deal.status === "Confirmed" ? "Contract Signed" : "Conversation"),
    company: deal.company || "",
    campaignName: deal.campaignName,
    amount: sum(deal.monthValues),
    currency: deal.currency,
    xeroInvoiceId: deal.xeroInvoiceId,
  };
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

/**
 * Reimbursable expenses on this job. The talent keeps 100% of these on top of
 * their deal share, so the report is wrong without them — it used to be hard
 * wired to zero, which is why expenses never showed up here.
 */
function expenseTotalFor(expenses: ApiExpense[], dealId: string): number {
  return expenses
    .filter((e) => e.kind === "talent" && refId(e.deal) === dealId)
    .reduce((total, e) => total + Number(e.amount || 0), 0);
}

function payableFor(expenses: ApiExpense[], deal: CrmDeal): number {
  const share = Number(deal.costRate ?? 80) / 100;
  return dealGbpAmount(deal) * share + expenseTotalFor(expenses, deal.id);
}

const reportsSubtitleFallback = "Talent deal stage and payment run reporting";

export default function ReportsView() {
  const { users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: expenseData = [] } = useGetExpensesQuery({ kind: "talent" });
  const { data: paymentRuns = [] } = useGetPaymentRunsQuery();
  const { data: prodData = [] } = useGetProductionRequestsQuery();
  liveUsers = users;
  liveTalents = talentData as ApiTalent[];
  const liveReportDeals = dealData.map(toDeal);
  const runDates = runDatesFrom(paymentRuns);
  const dealTalentExpenseTotal = (dealId: string) => expenseTotalFor(expenseData, dealId);
  const talentPayableAmount = (deal: CrmDeal) => payableFor(expenseData, deal);

  const [activeReportsTab, setActiveReportsTab] = useState<"status" | "remittance">("status");
  const [selectedReportTalentKey, setSelectedReportTalentKey] = useState<string | null>(null);
  const [selectedRemittanceTalentKey, setSelectedRemittanceTalentKey] = useState<string | null>(null);
  const [remittanceMode, setRemittanceMode] = useState<"month" | "custom">("month");
  const [remittanceMonthIndex, setRemittanceMonthIndex] = useState<number>(6);
  const [remittanceStartDate, setRemittanceStartDate] = useState<string>("2026-01-01");
  const [remittanceEndDate, setRemittanceEndDate] = useState<string>("2026-12-31");
  // Which month's statement gets emailed to the talent.
  const [reportMonthIndex, setReportMonthIndex] = useState<number>(currentMonthIndex());
  const [sendTalentReport, { isLoading: sendingReport }] = useSendTalentReportMutation();
  const toast = useToast();
  const year = useSelector((s: RootState) => s.year.selectedYear);

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
    const selectedTalentDoc = selected ? (talentData as ApiTalent[]).find((t) => t.name === selected.talentName && refId(t.manager) === selected.managerId) : null;
    const selectedEmail = selectedTalentDoc?.email || selectedTalentDoc?.invoiceEmail || "";

    const paidDeals: CrmDeal[] = selected
      ? liveReportDeals
          .filter(
            (d) =>
              d.talentName === selected.talentName &&
              d.managerId === selected.managerId &&
              (d.financeStatus === "Paid" || d.stage === "Paid" || d.stage === "On Next Payment Run")
          )
          .map(toReportCrmDeal)
      : [];

    const dealTotal = paidDeals.reduce((total, deal) => total + talentPayableAmount(deal), 0);
    const expenseTotal = paidDeals.reduce((total, deal) => total + dealTalentExpenseTotal(deal.id), 0);
    /*
     * Every shoot production accepted, whether or not Finance has raised the
     * chargeback yet — because that is exactly what syncTalentBill deducts from
     * the talent's bill. Requiring `chargebackRequestedAt` here meant money came
     * off what the talent was paid while their remittance said nothing about it.
     */
    const chargebacks = selected
      ? (prodData as ApiProductionRequest[]).filter(
          (p) =>
            p.talentName.trim().toLowerCase() === selected.talentName.trim().toLowerCase() &&
            (p.status === "scheduled" || p.status === "completed"),
        )
      : [];
    const prodChargebackTotal = chargebacks.reduce((t, p) => t + Number(p.total || 0), 0);

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
                less production chargebacks, with invoice references and attachments included.
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
              <strong>{money(Math.max(0, dealTotal + expenseTotal - prodChargebackTotal))}</strong>
            </div>
            <div className="earning">
              <span>Expenses included</span>
              <strong>{money(expenseTotal)}</strong>
            </div>
            {prodChargebackTotal > 0 ? (
              <div className="earning">
                <span>Production chargebacks</span>
                <strong style={{ color: "#c53030" }}>-{money(prodChargebackTotal)}</strong>
              </div>
            ) : null}
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
                  {paidDeals.map((deal) => {
                    const expenses = dealTalentExpenseTotal(deal.id);
                    return (
                      <tr key={deal.id}>
                        <td>{deal.remittancePaidAt ? displayDate(deal.remittancePaidAt) : "-"}</td>
                        <td>{deal.company || "-"}</td>
                        <td>{deal.campaignName || "-"}</td>
                        <td>{money(dealGbpAmount(deal))}</td>
                        <td>{money(talentPayableAmount(deal))}</td>
                        <td>{deal.xeroInvoiceNumber || deal.xeroInvoiceId || "No invoice attached"}</td>
                        <td>{expenses ? money(expenses) : "No expenses"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="section-body">
                <div className="notice">No paid deals in this period.</div>
              </div>
            )}
          </div>

          {/* What was taken off, itemised. The bill in Xero already deducts these
              shoots; showing only a single net figure left the talent unable to
              see why they were paid less than the deals add up to. */}
          {chargebacks.length ? (
            <>
              <div className="section-head">
                <h3>Production chargebacks deducted</h3>
                <span className="pill rejected">-{money(prodChargebackTotal)}</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Shoot date</th>
                      <th>Brief</th>
                      <th>Status</th>
                      <th>Deducted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chargebacks.map((shoot) => (
                      <tr key={shoot._id}>
                        <td>{shoot.shootDate ? displayDate(shoot.shootDate) : "-"}</td>
                        <td>{shoot.videoBrief || "Shoot"}</td>
                        <td>
                          {shoot.chargebackRequestedAt
                            ? "Charged back"
                            : "Accepted — will be deducted"}
                        </td>
                        <td style={{ color: "#c53030" }}>-{money(Number(shoot.total || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
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

  // Was hard-coded empty, so this screen always claimed the talent had no email
  // however carefully one had been entered on the Talent tab.
  const selectedReportTalent = selected
    ? (talentData as ApiTalent[]).find(
        (t) => t.name === selected.talentName && refId(t.manager) === selected.managerId,
      )
    : null;
  const selectedEmail = selectedReportTalent?.invoiceEmail || selectedReportTalent?.email || "";
  const upcomingRunDate = nextRunDate(runDates);

  const handleSendReport = async () => {
    if (!selectedReportTalent) return toast.error("Pick a talent first.");
    if (!selectedEmail) {
      return toast.error(`Add an email address for ${selected?.talentName} on the Talent tab first.`);
    }
    try {
      const result = await sendTalentReport({
        id: selectedReportTalent._id,
        monthIndex: reportMonthIndex,
        year,
      }).unwrap();
      toast.success(`${result.month} statement sent to ${result.to}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not send that report."));
    }
  };
  const reportStageList = reportStages as ReportStage[];

  // Group live deals (for the selected talent, or all) into report stage buckets.
  const reportDeals = liveReportDeals
    .filter((d) => (selected ? d.managerId === selected.managerId && d.talentName === selected.talentName : true))
    .map(dealToReport);
  const bucketDeals: Record<ReportStage, CrmDeal[]> = {
    Conversation: [],
    Negotiation: [],
    "Contract Signed": [],
    Invoiced: [],
    "On Next Payment Run": [],
    Paid: [],
  };
  reportDeals.forEach((deal) => {
    const stage = (reportStageList.includes(deal.stage as ReportStage) ? deal.stage : "Conversation") as ReportStage;
    bucketDeals[stage].push(deal);
  });

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
          ? `Next run: ${displayDate(upcomingRunDate)}`
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
              const talentShare = dealGbpAmount(deal) * (Number(deal.costRate ?? 80) / 100);
              const talentExpenses = dealTalentExpenseTotal(deal.id);
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
            <select
              className="compact-select"
              aria-label="Month to send"
              value={reportMonthIndex}
              onChange={(e) => setReportMonthIndex(Number(e.target.value))}
            >
              {months.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <button className="primary" type="button" onClick={handleSendReport} disabled={sendingReport}>
              {sendingReport ? "Sending…" : "Send to talent"}
            </button>
          </div>
        </div>
        {selected ? (
          <div className="section-body">
            <div className="notice">
              {selectedEmail
                ? `${months[reportMonthIndex]} statement will be emailed to ${selectedEmail}.`
                : "Add this talent's email in the Talent tab before sending their report."}
            </div>
          </div>
        ) : null}
        {selected ? (
          <>
            <div className="section-body payment-run-banner-wrap">
              <div className="payment-run-banner">
                <div>
                  <span>Next payment run</span>
                  <strong>{displayDate(upcomingRunDate)}</strong>
                </div>
                <p>
                  Payment run dates are maintained under Payment Runs, and this is the next one. The
                  Xero bill for a talent carries the same date as its reference and due date.
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
