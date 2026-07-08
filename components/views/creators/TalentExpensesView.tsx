"use client";

import { useState } from "react";
import { money, currencyMoney, usdToGbpRate } from "@/lib/format";
import { users } from "@/lib/mock";

// ---- Local static types (UI-only) --------------------------------------
interface CrmDeal {
  id: string;
  managerId: string;
  talentName: string;
  company?: string;
  campaignName?: string;
  amount: number;
  currency?: "GBP" | "USD";
  updatedAt?: string;
}

interface TalentExpense {
  id: string;
  crmDealId: string;
  amount: number;
  note?: string;
  submittedBy: string;
  submittedAt: string;
  financeStatus?: string;
  financeActionedAt?: string;
  receiptData?: string;
  receiptName?: string;
}

interface TalentRow {
  key: string;
  managerId: string;
  talentName: string;
}

// ---- Static data (crmDeals + talentExpenses are empty on first load) ----
const crmDeals: CrmDeal[] = [];
const talentExpenses: TalentExpense[] = [];

// ---- Helpers (ported verbatim from prototype) ---------------------------
function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function dealGbpAmount(deal: CrmDeal): number {
  const amount = Number(deal.amount || 0);
  return deal.currency === "USD" ? amount * usdToGbpRate : amount;
}

function dealMoney(deal: CrmDeal): string {
  if (deal.currency === "USD") return `${currencyMoney(deal.amount, "USD")} / ${money(dealGbpAmount(deal))}`;
  return money(deal.amount);
}

function dealTalentExpenses(dealId: string): TalentExpense[] {
  return talentExpenses
    .filter((expense) => expense.crmDealId === dealId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

function dealTalentExpenseTotal(dealId: string): number {
  return dealTalentExpenses(dealId).reduce((total, expense) => total + Number(expense.amount || 0), 0);
}

function dealInvoiceTotal(deal: CrmDeal): number {
  return dealGbpAmount(deal) + dealTalentExpenseTotal(deal.id);
}

function visibleTalentExpenseDeals(): CrmDeal[] {
  return [...crmDeals].sort(
    (a, b) =>
      a.talentName.localeCompare(b.talentName) ||
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );
}

function selectedTalentExpenseDealCount(deals: CrmDeal[], row: TalentRow): number {
  return deals.filter((deal) => deal.managerId === row.managerId && deal.talentName === row.talentName).length;
}

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ---- View ---------------------------------------------------------------
export default function TalentExpensesView() {
  const deals = visibleTalentExpenseDeals();

  const talentRows: TalentRow[] = [
    ...new Map(
      deals.map((deal) => [
        talentKey(deal.managerId, deal.talentName),
        {
          key: talentKey(deal.managerId, deal.talentName),
          managerId: deal.managerId,
          talentName: deal.talentName,
        } as TalentRow,
      ])
    ).values(),
  ].sort(
    (a, b) =>
      a.talentName.localeCompare(b.talentName) ||
      managerName(a.managerId).localeCompare(managerName(b.managerId))
  );

  const [selectedTalentKey, setSelectedTalentKey] = useState<string | null>(talentRows[0]?.key || null);

  const resolvedTalentKey =
    selectedTalentKey && talentRows.some((row) => row.key === selectedTalentKey)
      ? selectedTalentKey
      : talentRows[0]?.key || null;

  const selectedTalent = talentRows.find((row) => row.key === resolvedTalentKey);

  const selectedDeals = selectedTalent
    ? deals.filter(
        (deal) => deal.managerId === selectedTalent.managerId && deal.talentName === selectedTalent.talentName
      )
    : [];

  const [selectedDealId, setSelectedDealId] = useState<string | null>(selectedDeals[0]?.id || null);

  const resolvedDealId =
    selectedDealId && selectedDeals.some((deal) => deal.id === selectedDealId)
      ? selectedDealId
      : selectedDeals[0]?.id || null;

  const selectedDeal = selectedDeals.find((deal) => deal.id === resolvedDealId);
  const dealExpenses = selectedDeal ? dealTalentExpenses(selectedDeal.id) : [];
  const expenseTotal = selectedDeal ? dealTalentExpenseTotal(selectedDeal.id) : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Talent Expenses</h1>
        </div>
        <div className="asof">Attach talent costs to a specific job invoice</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Choose talent</h2>
          <span className="pill confirmed">{talentRows.length} talent with CRM deals</span>
        </div>
        <div className="section-body">
          <div className="notice">
            Talent expenses are added onto the selected job invoice only. They do not feed into the P&amp;L, overheads,
            or manager commission.
          </div>
        </div>
        <div className="section-body earnings-grid">
          {talentRows.length ? (
            talentRows.map((row) => (
              <button
                key={row.key}
                className={`earning ${resolvedTalentKey === row.key ? "active" : ""}`}
                onClick={() => setSelectedTalentKey(row.key)}
              >
                <span>{row.talentName}</span>
                <strong>{selectedTalentExpenseDealCount(deals, row)} deals</strong>
                <small>{managerName(row.managerId)}</small>
              </button>
            ))
          ) : (
            <div className="notice">No CRM deals available yet. Add deals in CRM first.</div>
          )}
        </div>
      </section>

      {selectedTalent ? (
        <section className="section soft-section">
          <div className="section-head">
            <h2>{selectedTalent.talentName} deals</h2>
            <span className="pill pipeline">Select the job invoice</span>
          </div>
          <div className="section-body talent-expense-deal-grid">
            {selectedDeals.length ? (
              selectedDeals.map((deal) => (
                <button
                  key={deal.id}
                  className={`talent-expense-deal ${resolvedDealId === deal.id ? "active" : ""}`}
                  onClick={() => setSelectedDealId(deal.id)}
                >
                  <strong>{deal.company || "Company needed"}</strong>
                  <span>{deal.campaignName || "No campaign name"}</span>
                  <small>
                    {dealMoney(deal)} deal · {money(dealTalentExpenseTotal(deal.id))} talent expenses
                  </small>
                </button>
              ))
            ) : (
              <div className="notice">No CRM deals for this talent yet.</div>
            )}
          </div>
        </section>
      ) : null}

      {selectedDeal ? (
        <section className="section soft-section">
          <div className="section-head">
            <h2>Add expense to invoice</h2>
            <span className="pill confirmed">{selectedDeal.company || "Selected job"}</span>
          </div>
          <div className="section-body">
            <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
              <input type="hidden" name="crmDealId" value={selectedDeal.id} />
              <div className="field">
                <label>Expense amount</label>
                <input name="amount" required inputMode="decimal" placeholder="£0.00" />
              </div>
              <div className="field">
                <label>Receipt</label>
                <input name="receipt" type="file" accept="image/*,.pdf" />
              </div>
              <div className="field wide">
                <label>Note</label>
                <input name="note" placeholder="What is this talent expense for?" />
              </div>
              <button className="primary wide" type="submit">
                Add to job invoice
              </button>
            </form>
          </div>
          <div className="section-body invoice-summary-grid">
            <div className="earning">
              <span>Deal amount</span>
              <strong>{dealMoney(selectedDeal)}</strong>
            </div>
            <div className="earning">
              <span>Talent expenses</span>
              <strong>{money(expenseTotal)}</strong>
            </div>
            <div className="earning">
              <span>Invoice total</span>
              <strong>{money(dealInvoiceTotal(selectedDeal))}</strong>
            </div>
          </div>
          <div className="section-body manager-list">
            {dealExpenses.length ? (
              dealExpenses.map((expense) => (
                <article key={expense.id} className="deal">
                  <div className="deal-line">
                    <strong>{expense.note || "Talent expense"}</strong>
                    <span>{money(expense.amount)}</span>
                  </div>
                  <div className="deal-line muted">
                    <span>Added by</span>
                    <span>{managerName(expense.submittedBy)}</span>
                  </div>
                  <div className="deal-line muted">
                    <span>Added</span>
                    <span>{displayDate(expense.submittedAt.slice(0, 10))}</span>
                  </div>
                  <div className="deal-line muted">
                    <span>Finance action</span>
                    <span>
                      {expense.financeStatus === "Added to invoice"
                        ? `Added ${displayDate((expense.financeActionedAt || "").slice(0, 10))}`
                        : "Waiting for finance"}
                    </span>
                  </div>
                  <div className="deal-line muted">
                    <span>Receipt</span>
                    <span>
                      {expense.receiptData ? (
                        <a href={expense.receiptData} target="_blank" rel="noopener">
                          {expense.receiptName || "Open receipt"}
                        </a>
                      ) : (
                        "No receipt attached"
                      )}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="notice">No talent expenses added to this job yet.</div>
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
