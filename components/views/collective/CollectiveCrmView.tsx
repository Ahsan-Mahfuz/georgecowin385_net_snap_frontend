"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum, stageClass } from "@/lib/format";
import {
  collectiveStages,
  collectiveLiveStages,
  collectivePipelineStages,
  installmentStages,
  paymentTerms,
  type CollectiveDeal,
  type Profile,
} from "@/lib/mock";
import {
  collectiveDealTotal,
  collectivePaymentLabel,
  collectiveStageBlockReason,
  installmentBlockReason,
  installmentDueLabel,
  scheduleAllocation,
  scopedCollectiveDeals,
  type CollectiveScope,
} from "@/lib/collective";
import { useCollectiveTeam } from "@/hooks/useCollectiveTeam";
import {
  useGetCollectiveDealsQuery,
  useCreateCollectiveDealMutation,
  useUpdateCollectiveDealMutation,
  useDeleteCollectiveDealMutation,
  useCreateCollectiveInvoiceMutation,
  useUpdateCollectiveInstallmentMutation,
  useCreateCollectiveInstallmentInvoiceMutation,
} from "@/redux/api/collectiveDealApi";
import { useGetXeroContactsQuery } from "@/redux/api/dealApi";
import { toCollectiveDeal } from "@/lib/adapters";
import type { ApiCollectiveDeal } from "@/redux/api/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const emptyForm = {
  ownerId: "",
  company: "",
  dealName: "",
  contactName: "",
  emailContact: "",
  companyAddress: "",
  poNumber: "",
  noPoNumber: false,
  contractUrl: "",
  noContract: false,
  stage: "Conversation",
  amount: "",
  paymentTerm: "30",
  customPaymentDays: "",
  notes: "",
  xeroContactId: "",
  monthValues: new Array(12).fill("") as string[],
};

type DealForm = typeof emptyForm;

/** Columns shown for each scope of the board. */
const columnsForScope = (scope: CollectiveScope): string[] => {
  if (scope === "live") return collectiveLiveStages;
  if (scope === "pipeline") return collectivePipelineStages;
  return collectiveStages;
};

export default function CollectiveCrmView() {
  const sessionUser = useSelector((s: RootState) => s.session.collectiveUser);
  const { users: collectiveSalesUsers } = useCollectiveTeam();
  const { data: dealData = [] } = useGetCollectiveDealsQuery();
  const [createDeal, { isLoading: creating }] = useCreateCollectiveDealMutation();
  const [updateDeal, { isLoading: updating }] = useUpdateCollectiveDealMutation();
  const [deleteDeal] = useDeleteCollectiveDealMutation();
  const [createInvoice, { isLoading: invoicing }] = useCreateCollectiveInvoiceMutation();
  const [updateInstallment] = useUpdateCollectiveInstallmentMutation();
  const [createInstallmentInvoice] = useCreateCollectiveInstallmentInvoiceMutation();
  // Empty when the Collective Xero is not connected — the field is free text then.
  const { data: xeroContacts = [] } = useGetXeroContactsQuery("collective");
  const confirm = useConfirm();
  const toast = useToast();

  // Fall back to the first sales user only until the session hydrates.
  const collectiveUser: Profile = sessionUser ||
    collectiveSalesUsers[0] || { id: "", name: "", role: "manager", email: "" };
  const collectiveUserName = (id: string): string =>
    collectiveSalesUsers.find((user) => user.id === id)?.name || "Unassigned";

  const [scope, setScope] = useState<CollectiveScope>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverPayStage, setDragOverPayStage] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  const allDeals: CollectiveDeal[] = useMemo(
    () => dealData.map(toCollectiveDeal),
    [dealData],
  );

  const visibleDeals =
    collectiveUser.role === "admin"
      ? allDeals
      : allDeals.filter((deal) => deal.ownerId === collectiveUser.id);

  const deals = scopedCollectiveDeals(visibleDeals, scope)
    .filter((deal) => ownerFilter === "all" || deal.ownerId === ownerFilter)
    .sort(
      (a, b) =>
        collectiveStages.indexOf(a.stage) - collectiveStages.indexOf(b.stage) ||
        a.company.localeCompare(b.company),
    );

  const columns = columnsForScope(scope);
  const summaryTotal = deals.reduce((total, deal) => total + collectiveDealTotal(deal), 0);
  const visibleOwners: Profile[] =
    collectiveUser.role === "admin" ? collectiveSalesUsers : [collectiveUser];

  // Every scheduled payment on the visible deals, flattened so it can be laid
  // out on its own board and dragged one at a time.
  const payments = deals.flatMap((deal) =>
    (deal.installments || []).map((installment) => ({ deal, installment })),
  );

  const allocation = scheduleAllocation(Number(form.amount) || 0, form.monthValues.map(Number));

  /**
   * Picking a contact that already exists in Xero stops a client becoming a new
   * contact on every deal, and brings their billing email and address across.
   */
  const applyContact = (name: string) => {
    const match = xeroContacts.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setForm((current) => ({
      ...current,
      company: name,
      xeroContactId: match?.contactId || "",
      // A chosen contact replaces these outright, blank included — keeping the
      // previous client's email would quietly invoice the wrong people.
      emailContact: match ? match.email : current.emailContact,
      companyAddress: match ? match.address : current.companyAddress,
    }));
  };

  // Says plainly what will happen, including when Xero holds no details.
  const contactHint = (() => {
    if (!xeroContacts.length) return "";
    const match = xeroContacts.find(
      (c) => c.contactId === form.xeroContactId || c.name.toLowerCase() === form.company.trim().toLowerCase(),
    );
    if (match) {
      const missing = [!match.email && "email", !match.address && "address"].filter(Boolean);
      return missing.length
        ? `Existing Xero contact — but Xero has no ${missing.join(" or ")} for them. Fill it in below and we'll send it.`
        : "Existing Xero contact — email and address pulled from Xero.";
    }
    if (form.company.trim()) {
      return "New contact. It will be created in Xero with the email address and company address below.";
    }
    return `${xeroContacts.length} contacts available from Xero.`;
  })();

  const openAddPanel = () => {
    setForm({ ...emptyForm, ownerId: collectiveUser.id });
    setEditingId(null);
    setPanelOpen(true);
  };

  /** Clicking a card opens the same panel, pre-filled — no read-only step. */
  const openEditPanel = (deal: CollectiveDeal) => {
    setForm({
      ownerId: deal.ownerId || "",
      company: deal.company || "",
      dealName: deal.dealName || "",
      contactName: deal.contactName || "",
      emailContact: deal.emailContact || "",
      companyAddress: deal.companyAddress || "",
      poNumber: deal.poNumber || "",
      noPoNumber: Boolean(deal.noPoNumber),
      contractUrl: deal.contractUrl || "",
      noContract: Boolean(deal.noContract),
      stage: deal.stage || "Conversation",
      amount: String(collectiveDealTotal(deal) || ""),
      paymentTerm: deal.paymentTerm || "30",
      customPaymentDays: String(deal.customPaymentDays || ""),
      notes: deal.notes || "",
      xeroContactId: deal.xeroContactId || "",
      monthValues: months.map((_, index) => {
        const value = Number((deal.monthValues || [])[index] || 0);
        return value ? String(value) : "";
      }),
    });
    setEditingId(deal.id);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
  };

  const formAsDeal = (): Partial<CollectiveDeal> => ({
    dealName: form.dealName,
    emailContact: form.emailContact,
    companyAddress: form.companyAddress,
    poNumber: form.noPoNumber ? "" : form.poNumber,
    noPoNumber: form.noPoNumber,
    contractUrl: form.contractUrl,
    noContract: form.noContract,
    paymentTerm: form.paymentTerm,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.company.trim()) return toast.error("Enter the client company.");
    if (!form.dealName.trim()) return toast.error("Give the deal a name.");

    // Same gate as drag and drop, checked against what is about to be saved.
    const blocked = collectiveStageBlockReason(formAsDeal(), form.stage);
    if (blocked) return toast.error(blocked);

    const monthValues = form.monthValues.map((value) => Number(value) || 0);
    const body: Partial<ApiCollectiveDeal> = {
      owner: form.ownerId || collectiveUser.id,
      company: form.company.trim(),
      dealName: form.dealName.trim(),
      contactName: form.contactName.trim(),
      emailContact: form.emailContact.trim(),
      companyAddress: form.companyAddress.trim(),
      poNumber: form.noPoNumber ? "" : form.poNumber.trim(),
      noPoNumber: form.noPoNumber,
      contractUrl: form.contractUrl,
      noContract: form.noContract,
      stage: form.stage,
      amount: Number(form.amount) || sum(monthValues),
      paymentTerm: form.paymentTerm,
      customPaymentDays: Number(form.customPaymentDays) || 0,
      monthValues,
      notes: form.notes.trim(),
      // Empty means "new client" — Xero creates the contact from the details above.
      xeroContactId: form.xeroContactId,
      xeroContactName: form.company.trim(),
    };

    try {
      if (editingId) {
        await updateDeal({ id: editingId, body }).unwrap();
        toast.success(`${body.company} — ${body.dealName} updated.`);
      } else {
        await createDeal(body).unwrap();
        toast.success(`${body.company} — ${body.dealName} added to ${form.stage}.`);
      }
      closePanel();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save that deal."));
    }
  };

  const handleDelete = async (deal: CollectiveDeal) => {
    const ok = await confirm({
      tone: "danger",
      title: "Delete sales deal?",
      confirmLabel: "Delete deal",
      message: (
        <>
          <strong>
            {deal.company} &middot; {deal.dealName}
          </strong>{" "}
          ({money(collectiveDealTotal(deal))}) will be removed from the CRM, Deals by month and
          Quarter view. This cannot be undone.
          {deal.xeroInvoiceId ? (
            <>
              {" "}
              Its <strong>Collective Xero draft is not deleted</strong> — remove that in Xero
              separately.
            </>
          ) : null}
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteDeal(deal.id).unwrap();
      toast.success("Deal deleted.");
      closePanel();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete that deal."));
    }
  };

  /** Drag a whole deal into another stage column. */
  const moveDealToStage = async (deal: CollectiveDeal, stage: string) => {
    if (!stage || stage === deal.stage) return;
    const blocked = collectiveStageBlockReason(deal, stage);
    if (blocked) {
      toast.error(blocked);
      openEditPanel(deal); // drop them straight into the form that fixes it
      return;
    }
    try {
      await updateDeal({ id: deal.id, body: { stage } }).unwrap();
      toast.success(`${deal.company} moved to ${stage}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not move that deal."));
    }
  };

  /** Drag one scheduled payment of a deal into another payment stage. */
  const movePayment = async (
    deal: CollectiveDeal,
    monthIndex: number,
    stage: string,
    currentStage: string,
  ) => {
    if (stage === currentStage) return;
    const installment = (deal.installments || []).find((item) => item.monthIndex === monthIndex);
    if (!installment) return;
    const blocked = installmentBlockReason(deal, installment, stage);
    if (blocked) {
      toast.error(blocked);
      openEditPanel(deal);
      return;
    }
    try {
      await updateInstallment({ id: deal.id, monthIndex, stage }).unwrap();
      toast.success(`${deal.company} · ${months[monthIndex]} payment moved to ${stage}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not move that payment."));
    }
  };

  /** Raise a Xero draft for one scheduled payment rather than the whole deal. */
  const raiseInstallmentInvoice = async (deal: CollectiveDeal, monthIndex: number, amount: number) => {
    const ok = await confirm({
      tone: "default",
      title: "Create draft in Collective Xero?",
      confirmLabel: "Create draft",
      message: (
        <>
          A draft invoice for <strong>{money(amount)}</strong> — the {months[monthIndex]} payment on{" "}
          {deal.company} — will be created in the <strong>Cowshed Collective</strong> Xero
          organisation. The rest of this deal is invoiced separately.
        </>
      ),
    });
    if (!ok) return;
    try {
      await createInstallmentInvoice({ id: deal.id, monthIndex }).unwrap();
      toast.success(`${months[monthIndex]} invoice drafted in Collective Xero.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reach Xero."));
    }
  };

  const editingDeal = editingId ? allDeals.find((deal) => deal.id === editingId) || null : null;

  const handleWholeDealInvoice = async () => {
    if (!editingDeal) return;
    const ok = await confirm({
      tone: "default",
      title: editingDeal.xeroInvoiceId ? "Update Xero draft?" : "Create one draft for the whole deal?",
      confirmLabel: editingDeal.xeroInvoiceId ? "Update draft" : "Create draft",
      message: (
        <>
          A single draft invoice for <strong>{money(collectiveDealTotal(editingDeal))}</strong> will
          be created in the <strong>Cowshed Collective</strong> Xero organisation for{" "}
          {editingDeal.company}. Use the payment board instead if this deal is invoiced month by
          month.
        </>
      ),
    });
    if (!ok) return;
    try {
      const result = await createInvoice(editingDeal.id).unwrap();
      toast.success(result?.xeroStatus || "Draft invoice created in Collective Xero.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reach Xero."));
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Collective Sales</p>
          <h1>Sales CRM</h1>
        </div>
        <div className="asof">Separate CRM and Xero flow for Cowshed Collective</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>CRM summary</h2>
          <div className="section-actions">
            <div className="segmented" role="group" aria-label="Live or pipeline deals">
              {(["all", "live", "pipeline"] as CollectiveScope[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  data-collective-scope={option}
                  className={scope === option ? "active" : ""}
                  onClick={() => setScope(option)}
                >
                  {option === "all" ? "All deals" : option === "live" ? "Live" : "Pipeline"}
                </button>
              ))}
            </div>
            <span className="pill">{money(summaryTotal)}</span>
          </div>
        </div>
        <div className="section-body earnings-grid">
          {columns.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            return (
              <div className="earning" key={stage}>
                <span>{stage}</span>
                <strong>
                  {money(stageDeals.reduce((total, deal) => total + collectiveDealTotal(deal), 0))}
                </strong>
                <small>{stageDeals.length} deals</small>
              </div>
            );
          })}
        </div>
        <div className="section-body">
          <small className="field-hint">
            {scope === "live"
              ? "Live — contract signed and beyond. This is money the business is committed to."
              : scope === "pipeline"
                ? "Pipeline — conversation and negotiation only. Not yet committed."
                : "All deals. Switch to Live or Pipeline to split committed revenue from opportunities."}
          </small>
        </div>
      </section>

      <section className="section crm-board-section">
        <div className="section-head">
          <h2>Deals by stage</h2>
          <div className="section-actions">
            <button className="primary add-crm-toggle" type="button" onClick={openAddPanel}>
              Add sales deal
            </button>
            {collectiveUser.role === "admin" ? (
              <select
                className="compact-select"
                value={ownerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
              >
                <option value="all">All salespeople</option>
                {collectiveSalesUsers.map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="crm-board collective-crm-board">
          {columns.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            const stageTotal = stageDeals.reduce(
              (total, deal) => total + collectiveDealTotal(deal),
              0,
            );
            return (
              <div
                className={`crm-column ${stageClass(stage)} ${dragOverStage === stage ? "drag-over" : ""}`}
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverStage(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOverStage(null);
                  setDraggingKey(null);
                  const payload = event.dataTransfer.getData("text/plain");
                  if (!payload.startsWith("deal:")) return;
                  const deal = deals.find((item) => item.id === payload.slice(5));
                  if (deal) moveDealToStage(deal, stage);
                }}
              >
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>{money(stageTotal)}</strong>
                </div>
                <div className="crm-card-list">
                  {stageDeals.length ? (
                    stageDeals.map((deal) => (
                      <div
                        className={`crm-card ${draggingKey === `deal:${deal.id}` ? "is-dragging" : ""}`}
                        key={deal.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-label={`Open ${deal.company} deal`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", `deal:${deal.id}`);
                          event.dataTransfer.effectAllowed = "move";
                          setDraggingKey(`deal:${deal.id}`);
                        }}
                        onDragEnd={() => {
                          setDraggingKey(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => openEditPanel(deal)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openEditPanel(deal);
                          }
                        }}
                      >
                        <strong>{deal.company}</strong>
                        <span className="crm-card-brand">{deal.dealName}</span>
                        <span>{money(collectiveDealTotal(deal))}</span>
                        <small>
                          {collectiveUserName(deal.ownerId)} · {deal.emailContact || "No email contact"}
                        </small>
                        <div className="crm-tags">
                          <em>{collectivePaymentLabel(deal)}</em>
                          {(deal.installments || []).length > 1 ? (
                            <em>{deal.installments.length} invoices</em>
                          ) : null}
                          {!deal.contractUrl && !deal.noContract ? (
                            <em className="crm-card-flag">No contract yet</em>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="crm-empty">Drop a deal here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section crm-board-section">
        <div className="section-head">
          <h2>Payment schedule — invoice by invoice</h2>
          <span className="pill">
            {money(payments.reduce((total, entry) => total + entry.installment.amount, 0))}
          </span>
        </div>
        <div className="section-body">
          <small className="field-hint">
            Every month a deal has money scheduled into becomes its own invoice. Drag a single
            payment into <strong>To Be Invoiced</strong> without touching the rest of the deal.
          </small>
        </div>
        <div className="crm-board payment-board">
          {installmentStages.map((stage) => {
            const stagePayments = payments.filter((entry) => entry.installment.stage === stage);
            return (
              <div
                className={`crm-column ${stageClass(stage)} ${dragOverPayStage === stage ? "drag-over" : ""}`}
                key={stage}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverPayStage !== stage) setDragOverPayStage(stage);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverPayStage(null);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOverPayStage(null);
                  setDraggingKey(null);
                  const payload = event.dataTransfer.getData("text/plain");
                  if (!payload.startsWith("pay:")) return;
                  const [dealId, monthIndex] = payload.slice(4).split(":");
                  const deal = deals.find((item) => item.id === dealId);
                  const installment = deal?.installments.find(
                    (item) => item.monthIndex === Number(monthIndex),
                  );
                  if (deal && installment) {
                    movePayment(deal, Number(monthIndex), stage, installment.stage);
                  }
                }}
              >
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>
                    {money(stagePayments.reduce((total, entry) => total + entry.installment.amount, 0))}
                  </strong>
                </div>
                <div className="crm-card-list">
                  {stagePayments.length ? (
                    stagePayments.map(({ deal, installment }) => {
                      const key = `pay:${deal.id}:${installment.monthIndex}`;
                      return (
                        <div
                          className={`crm-card payment-card ${draggingKey === key ? "is-dragging" : ""}`}
                          key={key}
                          role="button"
                          tabIndex={0}
                          draggable
                          aria-label={`${deal.company} ${months[installment.monthIndex]} payment`}
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/plain", key);
                            event.dataTransfer.effectAllowed = "move";
                            setDraggingKey(key);
                          }}
                          onDragEnd={() => {
                            setDraggingKey(null);
                            setDragOverPayStage(null);
                          }}
                          onClick={() => openEditPanel(deal)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openEditPanel(deal);
                            }
                          }}
                        >
                          <strong>{deal.company}</strong>
                          <span className="crm-card-brand">
                            {months[installment.monthIndex]} · {money(installment.amount)}
                          </span>
                          <span>{deal.dealName}</span>
                          <small>
                            {installmentDueLabel(
                              installment.monthIndex,
                              deal.paymentTerm,
                              deal.customPaymentDays,
                            )}
                          </small>
                          {installment.xeroInvoiceNumber ? (
                            <div className="crm-tags">
                              <em>{installment.xeroInvoiceNumber}</em>
                            </div>
                          ) : null}
                          {stage === "To Be Invoiced" && !installment.xeroInvoiceId ? (
                            <button
                              className="secondary mini-button"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                raiseInstallmentInvoice(deal, installment.monthIndex, installment.amount);
                              }}
                            >
                              Raise in Xero
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <div className="crm-empty">Drop a payment here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {panelOpen ? (
        <div className="crm-add-overlay">
          <section
            className="section crm-add-panel open"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit sales deal" : "Add sales deal"}
          >
            <button
              className="crm-detail-close"
              type="button"
              aria-label="Close deal panel"
              onClick={closePanel}
            >
              ×
            </button>
            <div className="section-head">
              <h2>{editingId ? "Edit sales deal" : "Add sales deal"}</h2>
              <span className="pill confirmed">Collective Xero</span>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="collectiveOwnerId">Sales owner</label>
                  <select
                    id="collectiveOwnerId"
                    value={form.ownerId}
                    onChange={(event) => setForm({ ...form, ownerId: event.target.value })}
                    disabled={collectiveUser.role !== "admin"}
                  >
                    {visibleOwners.filter(Boolean).map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="collectiveStage">Stage</label>
                  <select
                    id="collectiveStage"
                    value={form.stage}
                    onChange={(event) => setForm({ ...form, stage: event.target.value })}
                  >
                    {collectiveStages.map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="collectiveCompany">Company / Xero contact</label>
                  <input
                    id="collectiveCompany"
                    required
                    list="collective-xero-contacts"
                    placeholder="Choose an existing contact, or type a new client"
                    value={form.company}
                    onChange={(event) => applyContact(event.target.value)}
                  />
                  <datalist id="collective-xero-contacts">
                    {xeroContacts.map((contact) => (
                      <option value={contact.name} key={contact.contactId} />
                    ))}
                  </datalist>
                  {contactHint ? (
                    <small className={`field-hint ${form.xeroContactId ? "contact-matched" : ""}`}>
                      {contactHint}
                    </small>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="collectiveDealName">Campaign / deal name</label>
                  <input
                    id="collectiveDealName"
                    required
                    placeholder="Campaign, retainer, project"
                    value={form.dealName}
                    onChange={(event) => setForm({ ...form, dealName: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectiveAmount">Deal amount</label>
                  <input
                    id="collectiveAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectivePaymentTerm">Payment terms</label>
                  <select
                    id="collectivePaymentTerm"
                    value={form.paymentTerm}
                    onChange={(event) => setForm({ ...form, paymentTerm: event.target.value })}
                  >
                    {paymentTerms.map((term) => (
                      <option value={term.value} key={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                  <small className="field-hint">
                    Applied to each scheduled month separately, so every invoice gets its own due
                    date.
                  </small>
                </div>

                <div className="field">
                  <label htmlFor="collectiveCustomDays">Own time in days</label>
                  <input
                    id="collectiveCustomDays"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Only if custom"
                    value={form.customPaymentDays}
                    onChange={(event) => setForm({ ...form, customPaymentDays: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectiveContactName">Contact name</label>
                  <input
                    id="collectiveContactName"
                    placeholder="Client contact"
                    value={form.contactName}
                    onChange={(event) => setForm({ ...form, contactName: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectiveEmail">Email addresses</label>
                  <input
                    id="collectiveEmail"
                    placeholder="client@company.com, finance@company.com"
                    value={form.emailContact}
                    onChange={(event) => setForm({ ...form, emailContact: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectiveCompanyAddress">Company address</label>
                  <input
                    id="collectiveCompanyAddress"
                    placeholder="Address for the invoice"
                    value={form.companyAddress}
                    onChange={(event) => setForm({ ...form, companyAddress: event.target.value })}
                  />
                </div>

                <div className="field">
                  <label htmlFor="collectivePoNumber">PO number</label>
                  <input
                    id="collectivePoNumber"
                    placeholder="PO number"
                    disabled={form.noPoNumber}
                    value={form.poNumber}
                    onChange={(event) => setForm({ ...form, poNumber: event.target.value })}
                  />
                  <label className="checkbox-line">
                    <input
                      id="collectiveNoPo"
                      type="checkbox"
                      checked={form.noPoNumber}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          noPoNumber: event.target.checked,
                          poNumber: event.target.checked ? "" : form.poNumber,
                        })
                      }
                    />
                    No PO for this deal
                  </label>
                </div>

                <div className="field wide">
                  <label htmlFor="collectiveContract">Contract</label>
                  <input
                    id="collectiveContract"
                    type="file"
                    disabled={form.noContract}
                    onChange={(event) =>
                      setForm({ ...form, contractUrl: event.target.files?.[0]?.name || "" })
                    }
                  />
                  {form.contractUrl && !form.noContract ? (
                    <small className="field-hint">Attached: {form.contractUrl}</small>
                  ) : null}
                  <label className="checkbox-line">
                    <input
                      id="collectiveNoContract"
                      type="checkbox"
                      checked={form.noContract}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          noContract: event.target.checked,
                          contractUrl: event.target.checked ? "" : form.contractUrl,
                        })
                      }
                    />
                    No contract for this deal
                  </label>
                  {collectiveLiveStages.includes(form.stage) &&
                  !form.contractUrl &&
                  !form.noContract ? (
                    <small className="field-error">
                      A contract (or the “No contract” tick) is required at {form.stage}.
                    </small>
                  ) : null}
                </div>

                <div className="field wide">
                  <label htmlFor="collectiveNotes">Notes</label>
                  <textarea
                    id="collectiveNotes"
                    placeholder="Commercial notes, scope, Xero context"
                    value={form.notes}
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  />
                </div>

                <div className="field wide">
                  <label>Payment schedule</label>
                  <div className="collective-payment-grid">
                    {months.map((month, index) => (
                      <label key={month}>
                        <span>{month}</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={form.monthValues[index]}
                          onChange={(event) => {
                            const next = [...form.monthValues];
                            next[index] = event.target.value;
                            setForm({ ...form, monthValues: next });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <small className={`allocation-note is-${allocation.tone}`} data-allocation={allocation.tone}>
                    {allocation.message}
                  </small>
                </div>

                <div className="field wide">
                  <div className="row-actions">
                    <button className="primary" type="submit" disabled={creating || updating}>
                      {creating || updating ? "Saving…" : editingId ? "Save changes" : "Add sales deal"}
                    </button>
                    {editingDeal ? (
                      <button
                        className="secondary danger-button"
                        type="button"
                        onClick={() => handleDelete(editingDeal)}
                      >
                        Delete deal
                      </button>
                    ) : null}
                  </div>
                </div>

                {editingDeal ? (
                  <div className="field wide">
                    <label>Collective Xero</label>
                    <div className="xero-status-card">
                      <strong>{editingDeal.xeroInvoiceId || "No whole-deal draft yet"}</strong>
                      <span>
                        {editingDeal.installments.length > 1
                          ? `This deal is split across ${editingDeal.installments.length} monthly invoices — raise each one from the payment board.`
                          : editingDeal.xeroStatus ||
                            "Uses the separate Cowshed Collective Xero connection."}
                      </span>
                      <div className="section-actions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={handleWholeDealInvoice}
                          disabled={invoicing}
                        >
                          {invoicing
                            ? "Contacting Xero…"
                            : editingDeal.xeroInvoiceId
                              ? "Update whole-deal draft"
                              : "Create one draft for the whole deal"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
