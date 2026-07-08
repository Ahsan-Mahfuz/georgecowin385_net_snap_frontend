"use client";

import { Fragment, useState } from "react";
import { months, money, currentMonthIndex } from "@/lib/format";
import { users, managers, talentOptions } from "@/lib/mock";

// ---- local helpers mirrored from the prototype (app.js) ----------------------

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
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

interface TalentRow {
  key: string;
  managerId: string;
  talentName: string;
}

// reportTalentOptions(crmDeals) — crmDeals is empty on first load, so the rows
// come purely from every visible manager's roster (admin/finance see all).
function reportTalentOptions(): TalentRow[] {
  const rows = new Map<string, TalentRow>();
  managers.forEach((manager) => {
    talentOptions(manager.id).forEach((talentName) => {
      rows.set(talentKey(manager.id, talentName), {
        key: talentKey(manager.id, talentName),
        managerId: manager.id,
        talentName,
      });
    });
  });
  return [...rows.values()].sort(
    (a, b) =>
      a.talentName.localeCompare(b.talentName) ||
      managerName(a.managerId).localeCompare(managerName(b.managerId)),
  );
}

// ---- invoice model (empty with static data — crmDeals is empty on load) ------

interface InvoiceLine {
  dealId: string;
  description: string;
  total: number;
  grossDeal: number;
  dealShare: number;
  expenses: number;
  paidEarly: boolean;
  paidEarlyAmount: number;
  paidEarlyAt?: string;
}

interface TalentInvoice {
  id: string;
  managerId: string;
  talentName: string;
  talentKey: string;
  paymentRunDate: string;
  paidAt: string;
  lines: InvoiceLine[];
  totalDealShare: number;
  totalExpenses: number;
  totalAlreadyPaid: number;
  total: number;
  details: {
    invoiceName?: string;
    invoiceEmail?: string;
    invoiceAddress?: string;
    bankName?: string;
    accountName?: string;
    sortCode?: string;
    accountNumber?: string;
  };
  xeroBill?: { billId?: string; status?: string };
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
  return "Next payment run";
}

function statusClass(invoice: TalentInvoice): string {
  if (invoice.paidAt) return "confirmed";
  if (invoice.totalAlreadyPaid > 0) return "admin";
  return "pipeline";
}

export default function TalentInvoicesView() {
  const [selectedTalentKey, setSelectedTalentKey] = useState<string>("all");
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [monthIndex, setMonthIndex] = useState<number>(currentMonthIndex());
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-12-31");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Static prototype data: crmDeals is empty on first load, so there are no
  // talent invoices to build.
  const allInvoices: TalentInvoice[] = [];
  const talentRows = reportTalentOptions();

  const range =
    mode === "custom"
      ? {
          startDate,
          endDate,
          label: `${displayDate(startDate)} - ${displayDate(endDate)}`,
        }
      : monthDateRange(monthIndex);

  // Filter by selected talent and payment-run date range. With static data the
  // source list is empty, so this always resolves to no invoices.
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
              <select
                value={selectedTalentKey}
                onChange={(event) => setSelectedTalentKey(event.target.value)}
              >
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
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "month" | "custom")}
              >
                <option value="month">By month</option>
                <option value="custom">Custom dates</option>
              </select>
            </div>

            {mode === "custom" ? (
              <>
                <div className="field">
                  <label>Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label>End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="field">
                <label>Month</label>
                <select
                  value={monthIndex}
                  onChange={(event) => setMonthIndex(Number(event.target.value))}
                >
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
                            <span className={`pill ${statusClass(invoice)}`}>
                              {statusLabel(invoice)}
                            </span>
                          </td>
                          <td>{invoice.lines.length}</td>
                          <td>{money(invoice.total)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>No talent invoices in this period.</td>
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
            <TalentInvoiceDetail invoice={selectedInvoice} />
          ) : (
            <div className="section-body">
              <div className="notice">
                No talent invoices in this period yet. Invoices are created once deals are in On Next
                Payment Run or Paid and have a Xero paid/reconciled date.
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function TalentInvoiceDetail({ invoice }: { invoice: TalentInvoice }) {
  const details = invoice.details;
  return (
    <>
      <div className="section-body invoice-detail">
        <div className="invoice-heading">
          <div>
            <span>Talent invoice</span>
            <strong>{invoice.id.replace("talent-invoice-", "").toUpperCase()}</strong>
          </div>
          <div>
            <span>Payment run</span>
            <strong>{displayDate(invoice.paymentRunDate)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>
              {invoice.paidAt ? `Paid ${displayDate(invoice.paidAt)}` : statusLabel(invoice)}
            </strong>
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
            <span>Address</span>
            <strong>{details.invoiceAddress || "-"}</strong>
          </div>
          <div>
            <span>Bank</span>
            <strong>
              {[details.bankName, details.accountName, details.sortCode, details.accountNumber]
                .filter(Boolean)
                .join(" · ") || "-"}
            </strong>
          </div>
          <div>
            <span>Xero bill</span>
            <strong>{invoice.xeroBill?.billId || "-"}</strong>
          </div>
          <div>
            <span>Bill status</span>
            <strong>{invoice.paidAt ? "Paid in Xero" : invoice.xeroBill?.status || "Draft Bill"}</strong>
          </div>
        </div>
      </div>

      <div className="section-body">
        <div className="invoice-action-row">
          <div className="notice soft-note">
            Xero draft bill created for this payment run invoice.
          </div>
          <button className="secondary" type="button">
            See bill in Xero
          </button>
        </div>
        {invoice.paidAt ? (
          <div className="notice success-notice">
            This talent invoice has been paid. The linked CRM deals are now in Paid.
          </div>
        ) : (
          <button className="primary" type="button">
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
                {line.paidEarly ? <em className="line-status-paid"> Paid early</em> : null}
              </strong>
              <span>{line.paidEarly ? "Already paid" : money(line.total)}</span>
            </div>
            <div className="invoice-line-grid">
              <div>
                <span>Gross deal</span>
                <strong>{money(line.grossDeal)}</strong>
              </div>
              <div>
                <span>Talent 80%</span>
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
                <button className="secondary" type="button">
                  Mark this deal paid early
                </button>
              </div>
            ) : line.paidEarly ? (
              <div className="invoice-line-note">
                Paid early{line.paidEarlyAt ? ` on ${displayDate(line.paidEarlyAt)}` : ""}. Finance
                should not pay this line again.
              </div>
            ) : null}
          </article>
        ))}
        <div className="invoice-total-card">
          <div>
            <span>Gross deal</span>
            <strong>{money(invoice.lines.reduce((t, line) => t + line.grossDeal, 0))}</strong>
          </div>
          <div>
            <span>Talent 80%</span>
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
