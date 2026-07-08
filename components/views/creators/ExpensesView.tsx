"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { users, managers } from "@/lib/mock";

// Expenses view rebuilt pixel-perfect from the prototype `expensesView` in app.js.
// Rendered in all-roster-access (admin) mode with static empty data.

interface Expense {
  managerId: string;
  category: string;
  monthIndex: number;
  amount: number;
  note: string;
  receiptData?: string;
  receiptName?: string;
}

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

export default function ExpensesView() {
  const hasAllRosterAccess = true;
  const visibleManagers = managers;

  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all");
  const [expenseManagerFilter, setExpenseManagerFilter] = useState<string>("all");
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<string>("all");

  // On first load the prototype's expenses collection is empty.
  const allVisibleExpenses: Expense[] = [];
  const visibleExpenses = allVisibleExpenses.filter((expense) => {
    if (expenseCategoryFilter !== "all" && expense.category !== expenseCategoryFilter) return false;
    if (expenseManagerFilter !== "all" && expense.managerId !== expenseManagerFilter) return false;
    if (expenseMonthFilter !== "all" && expense.monthIndex !== Number(expenseMonthFilter)) return false;
    return true;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Expenses</h1>
        </div>
        <div className="asof">
          {hasAllRosterAccess ? "All submitted receipts and reimbursable costs" : "Submit and review your expenses"}
        </div>
      </div>
      <div className="expenses-layout">
        <section className="section">
          <div className="section-head">
            <h2>{hasAllRosterAccess ? "Add admin or manager expense" : "Add expense"}</h2>
          </div>
          <div className="section-body">
            <form className="form-grid" data-expense-form onSubmit={(e) => e.preventDefault()}>
              <div className="field">
                <label htmlFor="expenseManager">Talent manager</label>
                <select
                  id="expenseManager"
                  name="managerId"
                  defaultValue={hasAllRosterAccess ? "admin" : visibleManagers[0]?.id}
                  disabled={!hasAllRosterAccess && visibleManagers.length === 1}
                >
                  {hasAllRosterAccess ? <option value="admin">Admin</option> : null}
                  {visibleManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseCategory">Category</label>
                <select id="expenseCategory" name="category">
                  <option>Client entertaining</option>
                  <option>Marketing</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseMonth">Month</label>
                <select id="expenseMonth" name="monthIndex">
                  {months.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseAmount">Amount</label>
                <input id="expenseAmount" name="amount" required inputMode="decimal" placeholder="£0.00" />
              </div>
              <div className="field">
                <label htmlFor="expenseReceipt">Receipt</label>
                <input id="expenseReceipt" name="receipt" type="file" accept="image/*,.pdf" />
              </div>
              <div className="field wide">
                <label htmlFor="expenseNote">Note</label>
                <input id="expenseNote" name="note" required placeholder="What was it for?" />
              </div>
              <button className="primary wide" type="submit">Add expense</button>
            </form>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <h2>{hasAllRosterAccess ? "All expenses" : "Team expenses"}</h2>
            <span className="pill confirmed">Total {money(sum(visibleExpenses.map((expense) => expense.amount)))}</span>
          </div>
          <div className="section-body">
            <div className="filter-grid">
              <div className="field">
                <label htmlFor="expenseCategoryFilter">Category</label>
                <select
                  id="expenseCategoryFilter"
                  data-expense-filter="category"
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  <option value="Client entertaining">Client entertaining</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseManagerFilter">Manager</label>
                <select
                  id="expenseManagerFilter"
                  data-expense-filter="manager"
                  value={expenseManagerFilter}
                  onChange={(e) => setExpenseManagerFilter(e.target.value)}
                >
                  <option value="all">All managers</option>
                  {hasAllRosterAccess ? <option value="admin">Admin</option> : null}
                  {visibleManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseMonthFilter">Month</label>
                <select
                  id="expenseMonthFilter"
                  data-expense-filter="month"
                  value={expenseMonthFilter}
                  onChange={(e) => setExpenseMonthFilter(e.target.value)}
                >
                  <option value="all">All months</option>
                  {months.map((month, index) => (
                    <option key={month} value={String(index)}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="section-body manager-list">
            {visibleExpenses.length ? (
              visibleExpenses.map((expense, index) => (
                <article className="deal" key={index}>
                  <div className="deal-line">
                    <strong>{expense.category}</strong>
                    <span>{money(expense.amount)}</span>
                  </div>
                  <div className="deal-line muted"><span>Manager</span><span>{managerName(expense.managerId)}</span></div>
                  <div className="deal-line muted"><span>Month</span><span>{months[expense.monthIndex]}</span></div>
                  <div className="deal-line muted"><span>Note</span><span>{expense.note}</span></div>
                  <div className="deal-line muted">
                    <span>Receipt</span>
                    <span>
                      {expense.receiptData ? (
                        <a href={expense.receiptData} target="_blank" rel="noopener">
                          {expense.receiptName || "Open receipt"}
                        </a>
                      ) : (
                        "No file attached"
                      )}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="notice">No expenses submitted yet.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
