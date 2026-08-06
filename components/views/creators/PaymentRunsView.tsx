"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { displayRunDate, isoDate, nextRunDate, runDatesFrom } from "@/lib/paymentRuns";
import {
  useGetPaymentRunsQuery,
  useCreatePaymentRunMutation,
  useUpdatePaymentRunMutation,
  useDeletePaymentRunMutation,
} from "@/redux/api/paymentRunApi";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetExpensesQuery } from "@/redux/api/expenseApi";
import { refId } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const sumMonths = (values?: number[]) => (values || []).reduce((t, v) => t + Number(v || 0), 0);

export default function PaymentRunsView() {
  const { data: runs = [], isLoading } = useGetPaymentRunsQuery();
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: expenseData = [] } = useGetExpensesQuery({ kind: "talent" });
  const [createRun, { isLoading: creating }] = useCreatePaymentRunMutation();
  const [updateRun] = useUpdatePaymentRunMutation();
  const [deleteRun] = useDeletePaymentRunMutation();
  // Which run is mid-delete, so only that row's button spins.
  const [removingId, setRemovingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  const [form, setForm] = useState({ date: "", label: "", note: "" });

  const dates = runDatesFrom(runs);
  const today = isoDate(new Date());
  const upcoming = nextRunDate(dates);

  /**
   * Everything waiting to be paid out lands on the next run — that is the date
   * the Xero bill is referenced by and due on, so it is worth showing here.
   */
  const dueOnNextRun = dealData.filter(
    (d) => d.financeStatus === "Paid" && d.remittanceStatus !== "Paid",
  );
  const talentOnNextRun = new Set(dueOnNextRun.map((d) => `${refId(d.manager)}::${d.talentName}`));
  const nextRunTotal =
    dueOnNextRun.reduce(
      (total, d) => total + Math.round(sumMonths(d.monthValues) * (Number(d.costRate ?? 80) / 100)),
      0,
    ) +
    expenseData
      .filter((e) => !e.xeroBillId && talentOnNextRun.has(`${refId(e.manager)}::${e.talentName}`))
      .reduce((total, e) => total + Number(e.amount || 0), 0);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.date) return toast.error("Pick a date for the payment run.");
    try {
      await createRun({ date: form.date, label: form.label.trim(), note: form.note.trim() }).unwrap();
      toast.success(`Payment run added for ${displayRunDate(form.date)}.`);
      setForm({ date: "", label: "", note: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add that payment run."));
    }
  };

  // Saved on blur — one field, no dependent state, so a Save button per row
  // would be noise.
  const handleFieldSave = async (
    id: string,
    body: { date?: string; label?: string; note?: string },
    unchanged: boolean,
  ) => {
    if (unchanged) return;
    try {
      await updateRun({ id, body }).unwrap();
      toast.success("Payment run updated.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update that payment run."));
    }
  };

  const handleRemove = async (id: string, date: string) => {
    const ok = await confirm({
      tone: "danger",
      title: "Remove payment run?",
      confirmLabel: "Remove run",
      message: (
        <>
          The <strong>{displayRunDate(date)}</strong> run will be removed. Anything not yet billed
          moves to the next run on the schedule.
        </>
      ),
    });
    if (!ok) return;
    setRemovingId(id);
    try {
      await deleteRun(id).unwrap();
      toast.success("Payment run removed.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not remove that payment run."));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Payment Runs</h1>
        </div>
        <div className="asof">The dates talent are paid on</div>
      </div>

      <div className="layout">
        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>Next payment run</h2>
              <span className="pill confirmed">{displayRunDate(upcoming)}</span>
            </div>
            <div className="section-body invoice-summary-grid">
              <div className="earning">
                <span>Talent to pay</span>
                <strong>{talentOnNextRun.size}</strong>
              </div>
              <div className="earning">
                <span>Deals on this run</span>
                <strong>{dueOnNextRun.length}</strong>
              </div>
              <div className="earning">
                <span>Payable</span>
                <strong>{money(nextRunTotal)}</strong>
              </div>
            </div>
            <div className="section-body">
              <small className="field-hint">
                A talent bill raised in Xero carries this date as its reference and its due date, so
                the bill and the portal always agree. Change a date here and the next bill follows it.
              </small>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Schedule</h2>
              <span className="pill admin">{runs.length} runs</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Label</th>
                    <th>Note</th>
                    <th>Status</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length ? (
                    runs.map((run) => (
                      <tr key={run._id} className={run.date === upcoming ? "selected-row" : ""}>
                        <td>
                          <input
                            key={`${run._id}-${run.date}`}
                            className="mini-input"
                            type="date"
                            defaultValue={run.date}
                            aria-label={`Payment run date ${run.date}`}
                            onBlur={(e) =>
                              handleFieldSave(run._id, { date: e.target.value }, e.target.value === run.date)
                            }
                          />
                        </td>
                        <td>
                          <input
                            key={`${run._id}-label-${run.label || ""}`}
                            className="mini-input"
                            defaultValue={run.label || ""}
                            placeholder="Mid-month run"
                            aria-label={`Payment run label ${run.date}`}
                            onBlur={(e) =>
                              handleFieldSave(
                                run._id,
                                { label: e.target.value },
                                e.target.value === (run.label || ""),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            key={`${run._id}-note-${run.note || ""}`}
                            className="mini-input"
                            defaultValue={run.note || ""}
                            placeholder="Optional"
                            aria-label={`Payment run note ${run.date}`}
                            onBlur={(e) =>
                              handleFieldSave(
                                run._id,
                                { note: e.target.value },
                                e.target.value === (run.note || ""),
                              )
                            }
                          />
                        </td>
                        <td>
                          {run.date === upcoming ? (
                            <span className="pill confirmed">Next run</span>
                          ) : run.date < today ? (
                            <span className="pill">Past</span>
                          ) : (
                            <span className="pill pipeline">Scheduled</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="secondary danger-button small"
                            type="button"
                            disabled={removingId === run._id}
                            onClick={() => handleRemove(run._id, run.date)}
                          >
                            {removingId === run._id ? "Removing…" : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>{isLoading ? "Loading…" : "No payment runs scheduled yet."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>Add a payment run</h2>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={handleAdd}>
                <div className="field">
                  <label htmlFor="paymentRunDate">Date</label>
                  <input
                    id="paymentRunDate"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="paymentRunLabel">Label</label>
                  <input
                    id="paymentRunLabel"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="Mid-month run"
                  />
                </div>
                <div className="field wide">
                  <label htmlFor="paymentRunNote">Note</label>
                  <input
                    id="paymentRunNote"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Anything Finance should know about this run"
                  />
                </div>
                <button className="primary wide" type="submit" disabled={creating}>
                  {creating ? "Adding…" : "Add payment run"}
                </button>
              </form>
            </div>
          </section>

          <section className="section">
            <div className="section-body">
              <div className="notice soft-note">
                The schedule starts on the old rule — the 14th and the 28th, pulled back to the Friday
                when either falls on a weekend — for the twelve months ahead. Edit any date, add a
                one-off run, or remove one that is not happening.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
