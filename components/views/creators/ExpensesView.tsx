"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation } from "@/redux/api/expenseApi";
import { refId } from "@/lib/adapters";

export default function ExpensesView() {
  const { managers, users } = useCreatorsTeam();
  const { data: expenses = [] } = useGetExpensesQuery({ kind: "general" });
  const [createExpense] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "-";

  const [form, setForm] = useState({ managerId: "", category: "Client entertaining", monthIndex: 0, amount: "", note: "" });
  const [managerFilter, setManagerFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const visible = expenses.filter((e) => {
    if (managerFilter !== "all" && refId(e.manager) !== managerFilter) return false;
    if (monthFilter !== "all" && e.monthIndex !== Number(monthFilter)) return false;
    return true;
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.note.trim()) return;
    await createExpense({
      kind: "general",
      label: form.category,
      manager: form.managerId || undefined,
      amount: Number(form.amount) || 0,
      monthIndex: form.monthIndex,
      note: form.note,
    });
    setForm({ ...form, amount: "", note: "" });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Expenses</h1>
        </div>
        <div className="asof">All submitted receipts and reimbursable costs</div>
      </div>
      <div className="expenses-layout">
        <section className="section">
          <div className="section-head">
            <h2>Add expense</h2>
          </div>
          <div className="section-body">
            <form className="form-grid" onSubmit={handleAdd}>
              <div className="field">
                <label htmlFor="expenseManager">Talent manager</label>
                <select id="expenseManager" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">Admin / unassigned</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseCategory">Category</label>
                <select id="expenseCategory" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option>Client entertaining</option>
                  <option>Marketing</option>
                  <option>Fixed and variable</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseMonth">Month</label>
                <select id="expenseMonth" value={form.monthIndex} onChange={(e) => setForm({ ...form, monthIndex: Number(e.target.value) })}>
                  {months.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseAmount">Amount</label>
                <input id="expenseAmount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="field wide">
                <label htmlFor="expenseNote">Note</label>
                <input id="expenseNote" required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What was it for?" />
              </div>
              <button className="primary wide" type="submit">Add expense</button>
            </form>
          </div>
        </section>
        <section className="section">
          <div className="section-head">
            <h2>All expenses</h2>
            <span className="pill confirmed">Total {money(sum(visible.map((e) => e.amount)))}</span>
          </div>
          <div className="section-body">
            <div className="filter-grid">
              <div className="field">
                <label htmlFor="expenseManagerFilter">Manager</label>
                <select id="expenseManagerFilter" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
                  <option value="all">All managers</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="expenseMonthFilter">Month</label>
                <select id="expenseMonthFilter" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                  <option value="all">All months</option>
                  {months.map((month, index) => (
                    <option key={month} value={String(index)}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="section-body manager-list">
            {visible.length ? (
              visible.map((expense) => (
                <article className="deal" key={expense._id}>
                  <div className="deal-line">
                    <strong>{expense.label}</strong>
                    <span>{money(expense.amount)}</span>
                  </div>
                  <div className="deal-line muted"><span>Manager</span><span>{expense.manager ? managerName(refId(expense.manager)) : "Admin"}</span></div>
                  <div className="deal-line muted"><span>Month</span><span>{months[expense.monthIndex]}</span></div>
                  <div className="deal-line muted"><span>Note</span><span>{expense.note}</span></div>
                  <div className="deal-actions">
                    <button className="secondary danger-button small" type="button" onClick={() => deleteExpense(expense._id)}>Remove</button>
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
