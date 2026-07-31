"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { money, currencyMoney, sum, usdToGbpRate } from "@/lib/format";
import { Deal } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
} from "@/redux/api/expenseApi";
import { toDeal, refId } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

function displayDate(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Deal revenue in GBP — USD deals are converted at the shared rate. */
function dealGbpAmount(deal: Deal): number {
  const amount = sum(deal.monthValues || []);
  return deal.currency === "USD" ? amount * usdToGbpRate : amount;
}

function dealMoneyLabel(deal: Deal): string {
  const amount = sum(deal.monthValues || []);
  if (deal.currency === "USD") return `${currencyMoney(amount, "USD")} / ${money(dealGbpAmount(deal))}`;
  return money(amount);
}

export default function TalentExpensesView() {
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const user = useSelector((s: RootState) => s.session.user);
  const { users } = useCreatorsTeam();

  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const { data: expenseData = [] } = useGetExpensesQuery({ kind: "talent" });
  const [createExpense, { isLoading: saving }] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const confirm = useConfirm();
  const toast = useToast();

  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  // A manager only sees their own talent; everyone else sees the whole roster.
  const ownManagerId = user?.role === "manager" ? user.id : null;
  const allDeals = useMemo(() => dealData.map(toDeal), [dealData]);
  const deals = useMemo(
    () => (ownManagerId ? allDeals.filter((d) => d.managerId === ownManagerId) : allDeals),
    [allDeals, ownManagerId],
  );

  const expensesForDeal = (dealId: string) =>
    expenseData
      .filter((e) => refId(e.deal) === dealId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const expenseTotalForDeal = (dealId: string) =>
    expensesForDeal(dealId).reduce((total, e) => total + Number(e.amount || 0), 0);

  // Talent rows derived from the deals in view.
  const talentRows = useMemo(() => {
    const map = new Map<string, { key: string; managerId: string; talentName: string; dealCount: number }>();
    deals.forEach((d) => {
      const key = `${d.managerId}::${d.talentName}`;
      const existing = map.get(key);
      if (existing) existing.dealCount += 1;
      else map.set(key, { key, managerId: d.managerId, talentName: d.talentName, dealCount: 1 });
    });
    return [...map.values()].sort((a, b) => a.talentName.localeCompare(b.talentName));
  }, [deals]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey =
    selectedKey && talentRows.some((r) => r.key === selectedKey) ? selectedKey : talentRows[0]?.key || null;
  const activeRow = talentRows.find((r) => r.key === activeKey) || null;

  const activeDeals = activeRow
    ? deals.filter((d) => d.managerId === activeRow.managerId && d.talentName === activeRow.talentName)
    : [];

  const [form, setForm] = useState({ dealId: "", label: "Travel", amount: "", note: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRow) return;
    const dealId = form.dealId || activeDeals[0]?.id;
    if (!dealId) return toast.error("This talent has no deal to charge the expense to.");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return toast.error("Enter an amount greater than zero.");
    const deal = activeDeals.find((d) => d.id === dealId);
    const monthIndex = Math.max(0, (deal?.monthValues || []).findIndex((v) => Number(v || 0) > 0));
    try {
      await createExpense({
        kind: "talent",
        label: form.label,
        deal: dealId,
        manager: activeRow.managerId,
        talentName: activeRow.talentName,
        amount,
        monthIndex,
        note: form.note.trim(),
      }).unwrap();
      toast.success(`${form.label} expense of ${money(amount)} added to the job.`);
      setForm({ ...form, amount: "", note: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add that expense."));
    }
  };

  const handleRemove = async (expense: { _id: string; label: string; amount: number }) => {
    const ok = await confirm({
      tone: "danger",
      title: "Remove talent expense?",
      confirmLabel: "Remove expense",
      message: (
        <>
          <strong>
            {expense.label} &middot; {money(expense.amount)}
          </strong>{" "}
          will be removed from this job and will no longer be recharged on the client invoice.
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
          <h1>Talent Expenses</h1>
        </div>
        <div className="asof">Job costs recharged to the client on top of the deal fee</div>
      </div>

      <div className="layout">
        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>Talent</h2>
              <span className="pill">{talentRows.length} with deals</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Talent</th>
                    <th>Manager</th>
                    <th className="numeric">Deals</th>
                    <th className="numeric">Recharged</th>
                  </tr>
                </thead>
                <tbody>
                  {talentRows.length ? (
                    talentRows.map((row) => {
                      const rowDeals = deals.filter(
                        (d) => d.managerId === row.managerId && d.talentName === row.talentName,
                      );
                      const recharged = rowDeals.reduce((t, d) => t + expenseTotalForDeal(d.id), 0);
                      return (
                        <tr key={row.key} className={activeKey === row.key ? "selected-row" : ""}>
                          <td>
                            <button className="table-link" type="button" onClick={() => setSelectedKey(row.key)}>
                              {row.talentName}
                            </button>
                          </td>
                          <td>{managerName(row.managerId)}</td>
                          <td className="numeric">{row.dealCount}</td>
                          <td className="numeric">{money(recharged)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        No CRM deals available yet. Add a deal in the CRM to start recharging expenses.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>{activeRow ? `${activeRow.talentName} jobs` : "Jobs"}</h2>
              {activeRow ? <span className="pill">{managerName(activeRow.managerId)}</span> : null}
            </div>
            <div className="section-body manager-list">
              {activeDeals.length ? (
                activeDeals.map((deal) => {
                  const jobExpenses = expensesForDeal(deal.id);
                  const expenseTotal = expenseTotalForDeal(deal.id);
                  return (
                    <article className="deal" key={deal.id}>
                      <div className="deal-line">
                        <strong>{deal.campaignName || "Untitled campaign"}</strong>
                        <span className={`pill ${deal.status.toLowerCase()}`}>{deal.status}</span>
                      </div>
                      <div className="deal-line muted">
                        <span>Client</span>
                        <span>{deal.company || deal.companyName || "-"}</span>
                      </div>
                      <div className="deal-line muted">
                        <span>Deal fee</span>
                        <span>{dealMoneyLabel(deal)}</span>
                      </div>
                      <div className="deal-line muted">
                        <span>Expenses recharged</span>
                        <span>{money(expenseTotal)}</span>
                      </div>
                      <div className="deal-line">
                        <strong>Invoice total</strong>
                        <strong>{money(dealGbpAmount(deal) + expenseTotal)}</strong>
                      </div>

                      {jobExpenses.length ? (
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Expense</th>
                                <th>Note</th>
                                <th>Added</th>
                                <th className="numeric">Amount</th>
                                <th />
                              </tr>
                            </thead>
                            <tbody>
                              {jobExpenses.map((e) => (
                                <tr key={e._id}>
                                  <td>{e.label}</td>
                                  <td>{e.note || "-"}</td>
                                  <td>{displayDate(String(e.createdAt || ""))}</td>
                                  <td className="numeric">{money(e.amount)}</td>
                                  <td>
                                    <button
                                      className="secondary danger-button small"
                                      type="button"
                                      onClick={() => handleRemove(e)}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="notice">No expenses recharged on this job yet.</div>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="notice">
                  {talentRows.length ? "Select a talent to see their jobs." : "No CRM deals available yet."}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>Add expense</h2>
            </div>
            <div className="section-body">
              {activeRow && activeDeals.length ? (
                <form className="form-grid" onSubmit={handleAdd}>
                  <div className="field wide">
                    <label htmlFor="talentExpenseDeal">Job</label>
                    <select
                      id="talentExpenseDeal"
                      value={form.dealId || activeDeals[0]?.id || ""}
                      onChange={(e) => setForm({ ...form, dealId: e.target.value })}
                    >
                      {activeDeals.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.campaignName || "Untitled"} · {d.company || d.companyName || "No client"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="talentExpenseLabel">Type</label>
                    <select
                      id="talentExpenseLabel"
                      value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                    >
                      <option>Travel</option>
                      <option>Accommodation</option>
                      <option>Props and wardrobe</option>
                      <option>Glam</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="talentExpenseAmount">Amount</label>
                    <input
                      id="talentExpenseAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="field wide">
                    <label htmlFor="talentExpenseNote">Note</label>
                    <input
                      id="talentExpenseNote"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      placeholder="Receipt reference or detail"
                    />
                  </div>
                  <button className="primary wide" type="submit" disabled={saving}>
                    {saving ? "Adding…" : "Add expense to job"}
                  </button>
                </form>
              ) : (
                <div className="notice">
                  Select a talent with at least one CRM deal to recharge expenses against it.
                </div>
              )}
            </div>
          </section>

          <section className="section">
            <div className="section-body">
              <div className="notice">
                Talent expenses sit on top of the deal fee and are recharged on the client invoice.
                They do not appear in company overheads — those live under Expenses.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
