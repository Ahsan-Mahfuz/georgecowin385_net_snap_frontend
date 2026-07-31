"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation } from "@/redux/api/expenseApi";
import { refId } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

export default function ExpensesView() {
  const { managers, users } = useCreatorsTeam();
  const { data: expenses = [] } = useGetExpensesQuery({ kind: "general" });
  const [createExpense, { isLoading: saving }] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const confirm = useConfirm();
  const toast = useToast();

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
    const note = form.note.trim();
    const amount = Number(form.amount);
    if (!note) return toast.error("Add a note so the expense can be identified.");
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter an amount greater than zero.");
    try {
      await createExpense({
        kind: "general",
        label: form.category,
        manager: form.managerId || undefined,
        amount,
        monthIndex: form.monthIndex,
        note,
      }).unwrap();
      toast.success(`${form.category} expense of ${money(amount)} added.`);
      setForm({ ...form, amount: "", note: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add that expense."));
    }
  };

  const handleRemove = async (expense: { _id: string; label: string; amount: number; note?: string }) => {
    const ok = await confirm({
      tone: "danger",
      title: "Remove expense?",
      confirmLabel: "Remove expense",
      message: (
        <>
          <strong>
            {expense.label} &middot; {money(expense.amount)}
          </strong>
          {expense.note ? ` (${expense.note})` : ""} will be deleted and removed from the P&L. This
          cannot be undone.
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteExpense(expense._id).unwrap();
      toast.success("Expense removed.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not remove that expense."));
    }
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
              <button className="primary wide" type="submit" disabled={saving}>{saving ? "Adding…" : "Add expense"}</button>
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
                    <button className="secondary danger-button small" type="button" onClick={() => handleRemove(expense)}>Remove</button>
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
