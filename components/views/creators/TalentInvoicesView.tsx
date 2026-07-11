"use client";

import { Fragment, useState } from "react";
import { months, money, currentMonthIndex } from "@/lib/format";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { useGetDealsQuery, useMarkDealTalentPaidMutation, useSendDealRemittanceMutation } from "@/redux/api/dealApi";
import { useGetExpensesQuery } from "@/redux/api/expenseApi";
import { refId } from "@/lib/adapters";
import type { ApiDeal, ApiExpense } from "@/redux/api/types";

// ---- local helpers mirrored from the prototype (app.js) ----------------------

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
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

const sumMonths = (values: number[]): number => (values || []).reduce((t, v) => t + Number(v || 0), 0);

interface TalentRow {
  key: string;
  managerId: string;
  talentName: string;
}

// ---- invoice model derived from Paid deals -----------------------------------

interface InvoiceLine {
  dealId: string;
  description: string;
  total: number;
  grossDeal: number;
  dealShare: number;
  expenses: number;
  paidEarly: boolean; // this deal's remittance already settled
  paidEarlyAmount: number;
  paidEarlyAt?: string;
}

interface TalentInvoice {
  id: string;
  managerId: string;
  talentName: string;
  talentKey: string;
  paymentRunDate: string;
  paidAt: string; // set when every line's remittance is Paid
  remittanceSent: boolean;
  dealIds: string[];
  lines: InvoiceLine[];
  totalDealShare: number;
  totalExpenses: number;
  totalAlreadyPaid: number;
  total: number;
  details: {
    invoiceName?: string;
    invoiceEmail?: string;
  };
}

// Talent gets costRate% of the gross deal value (default 80%).
function dealShareOf(deal: ApiDeal): number {
  const gross = sumMonths(deal.monthValues);
  const rate = Number(deal.costRate ?? 80);
  return Math.round(gross * (rate / 100));
}

function paymentRunOf(deal: ApiDeal): string {
  if (deal.invoiceDate) return deal.invoiceDate;
  return monthDateRange(deal.signedMonthIndex || 0).endDate;
}

function buildInvoices(deals: ApiDeal[], expenses: ApiExpense[]): TalentInvoice[] {
  // Only deals the brand has paid are ready for talent remittance.
  const eligible = deals.filter((d) => d.financeStatus === "Paid");
  const groups = new Map<string, ApiDeal[]>();
  for (const deal of eligible) {
    const key = talentKey(refId(deal.manager), deal.talentName);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(deal);
  }

  const invoices: TalentInvoice[] = [];
  for (const [key, groupDeals] of groups.entries()) {
    const managerId = refId(groupDeals[0].manager);
    const talentName = groupDeals[0].talentName;

    // Talent expenses (100% reimbursed) for this talent — attached to the first line.
    const talentExpenses = expenses
      .filter((e) => e.kind === "talent" && e.talentName === talentName)
      .reduce((t, e) => t + Number(e.amount || 0), 0);

    const lines: InvoiceLine[] = groupDeals.map((deal, i) => {
      const grossDeal = sumMonths(deal.monthValues);
      const dealShare = dealShareOf(deal);
      const expensesOnLine = i === 0 ? talentExpenses : 0;
      const paidEarly = deal.remittanceStatus === "Paid";
      const lineTotal = dealShare + expensesOnLine;
      return {
        dealId: deal._id,
        description: `${deal.campaignName || deal.company || "Deal"}`,
        total: lineTotal,
        grossDeal,
        dealShare,
        expenses: expensesOnLine,
        paidEarly,
        paidEarlyAmount: lineTotal,
        paidEarlyAt: deal.remittancePaidAt,
      };
    });

    const allPaid = groupDeals.every((d) => d.remittanceStatus === "Paid");
    const anySent = groupDeals.some((d) => d.remittanceStatus === "Sent" || d.remittanceStatus === "Paid");
    const latestPaidAt = groupDeals
      .map((d) => d.remittancePaidAt || "")
      .filter(Boolean)
      .sort()
      .pop() || "";

    const totalDealShare = lines.reduce((t, l) => t + l.dealShare, 0);
    const totalExpenses = lines.reduce((t, l) => t + l.expenses, 0);
    const totalAlreadyPaid = lines.filter((l) => l.paidEarly).reduce((t, l) => t + l.paidEarlyAmount, 0);
    const grand = totalDealShare + totalExpenses;

    invoices.push({
      id: `talent-invoice-${key}`,
      managerId,
      talentName,
      talentKey: key,
      paymentRunDate: paymentRunOf(groupDeals[0]),
      paidAt: allPaid ? latestPaidAt || paymentRunOf(groupDeals[0]) : "",
      remittanceSent: anySent,
      dealIds: groupDeals.map((d) => d._id),
      lines,
      totalDealShare,
      totalExpenses,
      totalAlreadyPaid,
      total: grand - totalAlreadyPaid,
      details: { invoiceName: talentName, invoiceEmail: deal0Email(groupDeals) },
    });
  }
  return invoices;
}

function deal0Email(deals: ApiDeal[]): string {
  const withEmail = deals.find((d) => d.contactEmail);
  return withEmail?.contactEmail || "";
}

interface PaymentRunGroup {
  paymentRunDate: string;
  invoices: TalentInvoice[];
  total: number;
  alreadyPaid: number;
}

function paymentRunGroups(invoices: TalentInvoice[]): PaymentRunGroup[] {
  const map = invoices.reduce((groups, invoice) => {
    if (!groups.has(invoice.paymentRunDate)) groups.set(invoice.paymentRunDate, []);
    groups.get(invoice.paymentRunDate)!.push(invoice);
    return groups;
  }, new Map<string, TalentInvoice[]>());
  return [...map.entries()]
    .map(([paymentRunDate, groupInvoices]) => ({
      paymentRunDate,
      invoices: groupInvoices,
      total: groupInvoices.reduce((total, invoice) => total + invoice.total, 0),
      alreadyPaid: groupInvoices.reduce((total, invoice) => total + invoice.totalAlreadyPaid, 0),
    }))
    .sort((a, b) => new Date(a.paymentRunDate).getTime() - new Date(b.paymentRunDate).getTime());
}

function statusLabel(invoice: TalentInvoice): string {
  if (invoice.paidAt) return "Paid to talent";
  if (invoice.totalAlreadyPaid > 0) return "Partly paid to talent";
  if (invoice.remittanceSent) return "Remittance sent";
  return "Next payment run";
}

function statusClass(invoice: TalentInvoice): string {
  if (invoice.paidAt) return "confirmed";
  if (invoice.totalAlreadyPaid > 0 || invoice.remittanceSent) return "admin";
  return "pipeline";
}

export default function TalentInvoicesView() {
  const { users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [], isLoading } = useGetDealsQuery();
  const { data: expenseData = [] } = useGetExpensesQuery();
  const [sendRemittance] = useSendDealRemittanceMutation();
  const [markTalentPaid] = useMarkDealTalentPaidMutation();
  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  const [selectedTalentKey, setSelectedTalentKey] = useState<string>("all");
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [monthIndex, setMonthIndex] = useState<number>(currentMonthIndex());
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const allInvoices = buildInvoices(dealData, expenseData);
  const talentRows: TalentRow[] = talentData
    .map((t) => {
      const managerId = refId(t.manager);
      return { key: talentKey(managerId, t.name), managerId, talentName: t.name };
    })
    .sort((a, b) => a.talentName.localeCompare(b.talentName));

  const range =
    mode === "custom"
      ? { startDate, endDate, label: `${displayDate(startDate)} - ${displayDate(endDate)}` }
      : monthDateRange(monthIndex);

  const invoices = allInvoices.filter(
    (invoice) =>
      (selectedTalentKey === "all" || invoice.talentKey === selectedTalentKey) &&
      invoice.paymentRunDate >= range.startDate &&
      invoice.paymentRunDate <= range.endDate,
  );

  const selectedInvoice =
    invoices.find((invoice) => invoice.id === selectedInvoiceId) || invoices[0] || null;
  const total = invoices.reduce((sumTotal, invoice) => sumTotal + invoice.total, 0);
  const groups = paymentRunGroups(invoices);

  // Send remittance advice to the talent for every not-yet-settled deal on the invoice.
  const onSendRemittance = async (invoice: TalentInvoice) => {
    const pending = invoice.lines.filter((l) => !l.paidEarly);
    await Promise.all(pending.map((l) => sendRemittance(l.dealId).unwrap().catch(() => null)));
  };

  const onMarkInvoicePaid = async (invoice: TalentInvoice) => {
    const pending = invoice.lines.filter((l) => !l.paidEarly);
    await Promise.all(pending.map((l) => markTalentPaid(l.dealId).unwrap().catch(() => null)));
  };

  const onMarkLinePaid = (dealId: string) => markTalentPaid(dealId);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Talent Invoices</h1>
        </div>
        <div className="asof">{range.label} payment run invoices</div>
      </div>

      <div className="layout">
        <section className="section">
          <div className="section-head">
            <h2>Find invoices</h2>
            <span className="pill admin">{invoices.length} invoices</span>
          </div>

          <div className="section-body form-grid compact-action-grid">
            <div className="field">
              <label>Talent</label>
              <select value={selectedTalentKey} onChange={(e) => setSelectedTalentKey(e.target.value)}>
                <option value="all">All talent</option>
                {talentRows.map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.talentName} - {managerName(row.managerId)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Date view</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as "month" | "custom")}>
                <option value="month">By month</option>
                <option value="custom">Custom dates</option>
              </select>
            </div>

            {mode === "custom" ? (
              <>
                <div className="field">
                  <label>Start date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>End date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="field">
                <label>Month</label>
                <select value={monthIndex} onChange={(e) => setMonthIndex(Number(e.target.value))}>
                  {months.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="section-body invoice-summary-grid">
            <div className="earning">
              <span>Invoices</span>
              <strong>{invoices.length}</strong>
            </div>
            <div className="earning">
              <span>Total talent payable</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Talent</th>
                  <th>Manager</th>
                  <th>Payment run</th>
                  <th>Status</th>
                  <th>Deals</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {groups.length ? (
                  groups.map((group) => (
                    <Fragment key={group.paymentRunDate}>
                      <tr className="payment-run-row">
                        <td colSpan={6}>
                          <strong>{displayDate(group.paymentRunDate)} payment run</strong>
                          <span>
                            {group.invoices.length} invoices · {money(group.total)} payable now ·{" "}
                            {money(group.alreadyPaid)} already paid
                          </span>
                        </td>
                      </tr>
                      {group.invoices.map((invoice) => (
                        <tr
                          key={invoice.id}
                          className={selectedInvoiceId === invoice.id ? "selected-row" : ""}
                        >
                          <td>
                            <button
                              className="table-link"
                              type="button"
                              onClick={() => setSelectedInvoiceId(invoice.id)}
                            >
                              {invoice.talentName}
                            </button>
                          </td>
                          <td>{managerName(invoice.managerId)}</td>
                          <td>{displayDate(invoice.paymentRunDate)}</td>
                          <td>
                            <span className={`pill ${statusClass(invoice)}`}>{statusLabel(invoice)}</span>
                          </td>
                          <td>{invoice.lines.length}</td>
                          <td>{money(invoice.total)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      {isLoading ? "Loading…" : "No talent invoices in this period."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>{selectedInvoice ? `${selectedInvoice.talentName} invoice` : "Invoice"}</h2>
            {selectedInvoice ? (
              <span className="pill">{displayDate(selectedInvoice.paymentRunDate)}</span>
            ) : null}
          </div>
          {selectedInvoice ? (
            <TalentInvoiceDetail
              invoice={selectedInvoice}
              onSendRemittance={onSendRemittance}
              onMarkInvoicePaid={onMarkInvoicePaid}
              onMarkLinePaid={onMarkLinePaid}
            />
          ) : (
            <div className="section-body">
              <div className="notice">
                No talent invoices in this period yet. Invoices are created once a deal has been marked
                Paid in Finance Actions (the brand has paid).
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function TalentInvoiceDetail({
  invoice,
  onSendRemittance,
  onMarkInvoicePaid,
  onMarkLinePaid,
}: {
  invoice: TalentInvoice;
  onSendRemittance: (invoice: TalentInvoice) => void;
  onMarkInvoicePaid: (invoice: TalentInvoice) => void;
  onMarkLinePaid: (dealId: string) => void;
}) {
  const details = invoice.details;
  return (
    <>
      <div className="section-body invoice-detail">
        <div className="invoice-heading">
          <div>
            <span>Talent invoice</span>
            <strong>{invoice.talentName.toUpperCase()}</strong>
          </div>
          <div>
            <span>Payment run</span>
            <strong>{displayDate(invoice.paymentRunDate)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{invoice.paidAt ? `Paid ${displayDate(invoice.paidAt)}` : statusLabel(invoice)}</strong>
          </div>
        </div>
        <div className="report-card-grid">
          <div>
            <span>Invoice name</span>
            <strong>{details.invoiceName || invoice.talentName}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{details.invoiceEmail || "-"}</strong>
          </div>
          <div>
            <span>Deals</span>
            <strong>{invoice.lines.length}</strong>
          </div>
          <div>
            <span>Remittance</span>
            <strong>{invoice.paidAt ? "Paid" : invoice.remittanceSent ? "Sent" : "Not sent"}</strong>
          </div>
        </div>
      </div>

      <div className="section-body">
        <div className="invoice-action-row">
          <div className="notice soft-note">
            {invoice.remittanceSent
              ? "Remittance advice sent to the talent for this payment run."
              : "Send the remittance advice to the talent, then mark it paid once settled."}
          </div>
          {!invoice.paidAt ? (
            <button className="secondary" type="button" onClick={() => onSendRemittance(invoice)}>
              {invoice.remittanceSent ? "Resend remittance" : "Send remittance"}
            </button>
          ) : null}
        </div>
        {invoice.paidAt ? (
          <div className="notice success-notice">
            This talent invoice has been paid. The linked CRM deals are now settled with the talent.
          </div>
        ) : (
          <button className="primary" type="button" onClick={() => onMarkInvoicePaid(invoice)}>
            Mark talent invoice paid
          </button>
        )}
      </div>

      <div className="section-body invoice-line-list">
        {invoice.lines.map((line) => (
          <article className="invoice-line-card" key={line.dealId}>
            <div className="invoice-line-title">
              <strong>
                {line.description}
                {line.paidEarly ? <em className="line-status-paid"> Paid</em> : null}
              </strong>
              <span>{line.paidEarly ? "Already paid" : money(line.total)}</span>
            </div>
            <div className="invoice-line-grid">
              <div>
                <span>Gross deal</span>
                <strong>{money(line.grossDeal)}</strong>
              </div>
              <div>
                <span>Talent share</span>
                <strong>{money(line.dealShare)}</strong>
              </div>
              <div>
                <span>Expenses 100%</span>
                <strong>{money(line.expenses)}</strong>
              </div>
              {line.paidEarly ? (
                <div>
                  <span>Already paid</span>
                  <strong>{money(line.paidEarlyAmount)}</strong>
                </div>
              ) : null}
            </div>
            {!invoice.paidAt && !line.paidEarly ? (
              <div className="invoice-line-actions">
                <button className="secondary" type="button" onClick={() => onMarkLinePaid(line.dealId)}>
                  Mark this deal paid
                </button>
              </div>
            ) : line.paidEarly ? (
              <div className="invoice-line-note">
                Paid{line.paidEarlyAt ? ` on ${displayDate(line.paidEarlyAt)}` : ""}. Finance should not
                pay this line again.
              </div>
            ) : null}
          </article>
        ))}
        <div className="invoice-total-card">
          <div>
            <span>Talent share</span>
            <strong>{money(invoice.totalDealShare)}</strong>
          </div>
          <div>
            <span>Expenses</span>
            <strong>{money(invoice.totalExpenses)}</strong>
          </div>
          {invoice.totalAlreadyPaid ? (
            <div>
              <span>Already paid</span>
              <strong>{money(invoice.totalAlreadyPaid)}</strong>
            </div>
          ) : null}
          <div className="invoice-grand-total">
            <span>Total payable now</span>
            <strong>{money(invoice.total)}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
