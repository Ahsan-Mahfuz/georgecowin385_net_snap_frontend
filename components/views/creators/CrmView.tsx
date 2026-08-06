"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { money, months, sum, stageClass } from "@/lib/format";
import { crmStages } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import {
  useGetDealsQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useGetXeroContactsQuery,
} from "@/redux/api/dealApi";
import { useGetApprovalsQuery } from "@/redux/api/approvalApi";
import { toDeal, talentNamesForManager, refId } from "@/lib/adapters";
import type { ApiDeal, ApiTalent } from "@/redux/api/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const manualCrmStages = crmStages.filter((stage) => stage !== "Paid");

/** A signed contract (or an explicit "no contract") is required from here on. */
const CONTRACT_REQUIRED_STAGES = [
  "Contract Signed",
  "To Be Invoiced",
  "Invoiced",
  "On Next Payment Run",
  "Paid",
];

export default function CrmView() {
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { managers } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const [createDeal, { isLoading: creating }] = useCreateDealMutation();
  const [updateDeal, { isLoading: updating }] = useUpdateDealMutation();
  const [deleteDeal] = useDeleteDealMutation();
  // Empty when Xero is not connected — the field then behaves as free text.
  const { data: xeroContacts = [] } = useGetXeroContactsQuery("creators");
  const confirm = useConfirm();
  const toast = useToast();

  const deals = useMemo(() => dealData.map(toDeal), [dealData]);
  const managerName = (id: string) => managers.find((m) => m.id === id)?.name || id;

  /*
   * Who each deal is waiting on. Without this the CRM only says "awaiting
   * approval", so there is no way to tell from here whether the request actually
   * reached anyone — which is exactly what "approvals aren't going through"
   * looked like.
   */
  const { data: approvalData = [] } = useGetApprovalsQuery();
  const approverForDeal = useMemo(() => {
    const map = new Map<string, string>();
    approvalData
      .filter((a) => a.kind === "deal" && a.status === "pending" && a.deal)
      .forEach((a) => {
        const dealId = refId(a.deal);
        const approver = a.approver;
        map.set(
          dealId,
          typeof approver === "string" || !approver ? "an admin" : approver.name || "an admin",
        );
      });
    return map;
  }, [approvalData]);

  const [managerFilter, setManagerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  // Set when the panel is opened against an existing deal rather than a new one.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Stage column currently hovered during a drag, for the drop highlight.
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    managerId: "",
    talentName: "",
    inboundOrOutbound: "Inbound" as "Inbound" | "Outbound",
    stage: "Conversation",
    amount: "",
    monthIndex: 0,
    useUSD: false,
    paymentTerms: "Upfront",
    ownTimeDays: "",
    companyName: "",
    campaignName: "",
    emailAddresses: "",
    companyAddress: "",
    poNumber: "",
    noPoNumber: false,
    xeroAccountCode: "200",
    xeroTaxRate: "No VAT",
    contractUrl: "",
    noContract: false,
    xeroContactId: "",
  });

  // The board is keyed on `stage` alone — the same field the P&L scopes on — so
  // the two screens can never drift apart.
  const stageOf = (d: (typeof deals)[number]) => d.stage || "Conversation";

  const filtered = deals.filter((d) => {
    if (managerFilter !== "all" && d.managerId !== managerFilter) return false;
    if (stageFilter !== "all" && stageOf(d) !== stageFilter) return false;
    return true;
  });

  const dealTotal = (d: (typeof deals)[number]) => sum(d.monthValues);
  // Headline figure matches the P&L Pipeline tab: rejected deals are shown on the
  // board so they can be fixed, but they are not money anyone is expecting.
  const totalVisible = filtered
    .filter((d) => d.approvalStatus !== "Rejected")
    .reduce((t, d) => t + dealTotal(d), 0);

  const emptyForm = {
    managerId: "",
    talentName: "",
    inboundOrOutbound: "Inbound" as "Inbound" | "Outbound",
    stage: "Conversation",
    amount: "",
    monthIndex: new Date().getMonth(),
    useUSD: false,
    paymentTerms: "Upfront",
    ownTimeDays: "",
    companyName: "",
    campaignName: "",
    emailAddresses: "",
    companyAddress: "",
    poNumber: "",
    noPoNumber: false,
    xeroAccountCode: "200",
    xeroTaxRate: "No VAT",
    contractUrl: "",
    noContract: false,
    xeroContactId: "",
  };

  /**
   * Contact lookup by name, built once instead of scanning the whole list on
   * every keystroke. Names are normalised because Xero's own matching is exact
   * and case-sensitive, so "Acme Ltd" and "ACME  Ltd" were treated as two
   * different brands and neither of them autofilled.
   */
  const contactsByName = useMemo(() => {
    const index = new Map<string, (typeof xeroContacts)[number]>();
    xeroContacts.forEach((c) => index.set(c.name.trim().toLowerCase().replace(/\s+/g, " "), c));
    return index;
  }, [xeroContacts]);

  const findContact = (name: string) =>
    contactsByName.get(name.trim().toLowerCase().replace(/\s+/g, " "));

  /**
   * Picking a contact that already exists in Xero is what stops a brand becoming
   * a brand-new contact on every deal — and it brings the billing email and
   * address across so Finance is not chasing them later.
   */
  const applyContact = (name: string) => {
    const match = findContact(name);
    setForm((current) => ({
      ...current,
      companyName: name,
      xeroContactId: match?.contactId || "",
      // A chosen contact replaces these outright, blank included. Keeping the
      // previous brand's email when the new contact has none would quietly
      // invoice the wrong people.
      emailAddresses: match ? match.email : current.emailAddresses,
      companyAddress: match ? match.address : current.companyAddress,
    }));
  };

  /*
   * Only the contacts matching what has been typed, capped so the list stays
   * instant. Rendering every contact in the organisation on every keystroke is
   * what made the picker feel slow.
   */
  const contactSuggestions = useMemo(() => {
    const typed = form.companyName.trim().toLowerCase();
    const pool = typed ? xeroContacts.filter((c) => c.name.toLowerCase().includes(typed)) : xeroContacts;
    return pool.slice(0, 40);
  }, [xeroContacts, form.companyName]);

  // Says plainly what will happen, including when Xero holds no details for the
  // contact — otherwise an empty email/address box just looks broken.
  const contactHint = (() => {
    if (!xeroContacts.length) {
      return "Xero contacts are not available right now — type the brand name and we'll create the contact when the invoice is raised.";
    }
    const match =
      xeroContacts.find((c) => c.contactId === form.xeroContactId) || findContact(form.companyName);
    if (match) {
      const missing = [!match.email && "email", !match.address && "address"].filter(Boolean);
      return missing.length
        ? `Existing Xero contact — but Xero has no ${missing.join(" or ")} for them. Fill it in below and we'll send it.`
        : "Existing Xero contact — email and address pulled from Xero.";
    }
    if (form.companyName.trim()) {
      return "New contact. It will be created in Xero with the email address and company address below.";
    }
    return `${xeroContacts.length} contacts available from Xero. Start typing to narrow the list.`;
  })();

  const openAddPanel = () => {
    setForm(emptyForm);
    setEditingId(null);
    setAddOpen(true);
  };

  /** Load an existing deal into the same panel for editing. */
  const openEditPanel = (deal: (typeof deals)[number]) => {
    const activeMonth = Math.max(0, (deal.monthValues || []).findIndex((v) => Number(v || 0) > 0));
    setForm({
      managerId: deal.managerId || "",
      talentName: deal.talentName || "",
      inboundOrOutbound: (deal.inboundOrOutbound as "Inbound" | "Outbound") || "Inbound",
      stage: deal.stage || "Conversation",
      amount: String(sum(deal.monthValues) || ""),
      monthIndex: activeMonth,
      useUSD: Boolean(deal.useUSD),
      paymentTerms: deal.paymentTerms || "Upfront",
      ownTimeDays: String(deal.ownTimeDays ?? ""),
      companyName: deal.companyName || deal.company || "",
      campaignName: deal.campaignName || "",
      emailAddresses: deal.emailAddresses || "",
      companyAddress: deal.companyAddress || "",
      poNumber: deal.poNumber || "",
      noPoNumber: Boolean(deal.noPoNumber),
      xeroAccountCode: deal.xeroAccountCode || "200",
      xeroTaxRate: deal.xeroTaxRate || "No VAT",
      contractUrl: deal.contractUrl || "",
      noContract: Boolean(deal.noContract),
      xeroContactId: deal.xeroContactId || "",
    });
    setEditingId(deal.id);
    setAddOpen(true);
  };

  const handleDelete = async (deal: (typeof deals)[number]) => {
    const ok = await confirm({
      tone: "danger",
      title: "Delete CRM deal?",
      confirmLabel: "Delete deal",
      message: (
        <>
          <strong>
            {deal.talentName} &middot; {deal.campaignName || "No campaign"}
          </strong>{" "}
          ({money(sum(deal.monthValues))}) will be removed from the CRM, the P&L and all reports.
          This cannot be undone.
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteDeal(deal.id).unwrap();
      toast.success("Deal deleted.");
      setAddOpen(false);
      setEditingId(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete that deal."));
    }
  };

  /**
   * Client-side mirror of the server stage rules, so a blocked drop explains
   * itself immediately instead of bouncing off a 400. The server is still the
   * authority — see assertStageAllowed in deal.service.ts.
   */
  const stageBlockReason = (deal: (typeof deals)[number], stage: string): string | null => {
    if (CONTRACT_REQUIRED_STAGES.includes(stage) && !deal.contractUrl && !deal.noContract) {
      return `Upload the signed contract, or tick “No contract”, before moving this deal to ${stage}.`;
    }
    if (stage === "To Be Invoiced") {
      const missing: string[] = [];
      if (!deal.paymentTerms && !deal.paymentTerm) missing.push("Payment terms");
      if (!deal.campaignName?.trim()) missing.push("Campaign name");
      if (!deal.emailAddresses?.trim() && !deal.contactEmail?.trim()) missing.push("Email addresses");
      if (!deal.companyAddress?.trim()) missing.push("Company address");
      if (!deal.poNumber?.trim() && !deal.noPoNumber) missing.push("PO number (or tick “No PO”)");
      if (missing.length) return `Add ${missing.join(", ")} before moving this deal to To Be Invoiced.`;
    }
    return null;
  };

  /** Drag and drop a card into another stage column. */
  const moveDealToStage = async (deal: (typeof deals)[number], stage: string) => {
    if (!stage || stage === (deal.stage || "Conversation")) return;

    const blocked = stageBlockReason(deal, stage);
    if (blocked) {
      toast.error(blocked);
      openEditPanel(deal); // drop them straight into the form that fixes it
      return;
    }

    try {
      await updateDeal({ id: deal.id, body: { stage } }).unwrap();
      toast.success(`${deal.talentName} moved to ${stage}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not move that deal."));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.managerId) return toast.error("Choose a talent manager.");
    if (!form.talentName.trim()) return toast.error("Enter a talent name.");
    // Same gate as drag and drop, checked against what the form is about to save.
    const blocked = stageBlockReason(
      {
        ...(editingId ? deals.find((d) => d.id === editingId) : undefined),
        contractUrl: form.contractUrl,
        noContract: form.noContract,
        paymentTerms: form.paymentTerms,
        campaignName: form.campaignName,
        emailAddresses: form.emailAddresses,
        companyAddress: form.companyAddress,
        poNumber: form.noPoNumber ? "" : form.poNumber,
        noPoNumber: form.noPoNumber,
      } as (typeof deals)[number],
      form.stage,
    );
    if (blocked) return toast.error(blocked);

    const amount = Number(form.amount) || 0;
    const monthValues = new Array(12).fill(0);
    monthValues[form.monthIndex] = amount;

    const payload: Partial<ApiDeal> = {
      manager: form.managerId,
      talentName: form.talentName.trim(),
      inboundOrOutbound: form.inboundOrOutbound,
      stage: form.stage,
      monthValues,
      year,
      useUSD: form.useUSD,
      paymentTerms: form.paymentTerms,
      ownTimeDays: Number(form.ownTimeDays) || 0,
      companyName: form.companyName.trim(),
      campaignName: form.campaignName.trim(),
      emailAddresses: form.emailAddresses.trim(),
      companyAddress: form.companyAddress.trim(),
      poNumber: form.noPoNumber ? "" : form.poNumber.trim(),
      noPoNumber: form.noPoNumber,
      xeroAccountCode: form.xeroAccountCode,
      xeroTaxRate: form.xeroTaxRate,
      contractUrl: form.contractUrl,
      noContract: form.noContract,
      currency: form.useUSD ? "USD" : "GBP",
      company: form.companyName.trim(),
      // Empty means "new brand" — Xero will create the contact from the details above.
      xeroContactId: form.xeroContactId,
      xeroContactName: form.companyName.trim(),
    };

    try {
      if (editingId) {
        await updateDeal({ id: editingId, body: payload }).unwrap();
        toast.success(`${payload.talentName} deal updated.`);
      } else {
        await createDeal(payload).unwrap();
        toast.success(`${payload.talentName} deal added to ${form.stage}.`);
      }
      setForm(emptyForm);
      setEditingId(null);
      setAddOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save that deal."));
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>CRM</h1>
        </div>
        <div className="asof">All deal opportunities by stage, owner, and amount</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>CRM summary</h2>
          <span className="pill" title="Excludes rejected deals — matches the P&L Pipeline tab">
            {money(totalVisible)}
          </span>
        </div>
        <div className="section-body earnings-grid">
          {crmStages.map((stage) => {
            const stageDeals = filtered.filter(
              (d) => stageOf(d) === stage && d.approvalStatus !== "Rejected",
            );
            return (
              <div className="earning" key={stage}>
                <span>{stage}</span>
                <strong>{money(stageDeals.reduce((t, d) => t + dealTotal(d), 0))}</strong>
                <small>{stageDeals.length} deals</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section crm-board-section">
        <div className="section-head">
          <h2>Deals by stage</h2>
          <div className="section-actions">
            <button className="primary add-crm-toggle" type="button" onClick={openAddPanel}>
              Add CRM deal
            </button>
            <select className="compact-select" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
              <option value="all">All managers</option>
              {managers.map((m) => (
                <option value={m.id} key={m.id}>{m.name}</option>
              ))}
            </select>
            <select className="compact-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="all">All stages</option>
              {crmStages.map((stage) => (
                <option value={stage} key={stage}>{stage}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-board">
          {crmStages.map((stage) => {
            const stageDeals = filtered.filter((d) => stageOf(d) === stage);
            return (
              <div
                className={`crm-column ${stageClass(stage)} ${dragOverStage === stage ? "drag-over" : ""}`}
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== stage) setDragOverStage(stage);
                }}
                onDragLeave={(e) => {
                  // Ignore bubbling from children, only clear when the pointer really leaves.
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  setDraggingId(null);
                  const id = e.dataTransfer.getData("text/plain");
                  const deal = deals.find((d) => d.id === id);
                  if (deal) moveDealToStage(deal, stage);
                }}
              >
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>
                    {money(
                      stageDeals
                        .filter((d) => d.approvalStatus !== "Rejected")
                        .reduce((t, d) => t + dealTotal(d), 0),
                    )}
                  </strong>
                </div>
                <div className="crm-card-list">
                  {stageDeals.length ? (
                    stageDeals.map((d) => (
                      <div
                        className={`crm-card ${draggingId === d.id ? "is-dragging" : ""}`}
                        key={d.id}
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-label={`Open ${d.talentName} deal`}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", d.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggingId(d.id);
                        }}
                        onDragEnd={() => { setDraggingId(null); setDragOverStage(null); }}
                        onClick={() => openEditPanel(d)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openEditPanel(d);
                          }
                        }}
                      >
                        <strong>{d.talentName}</strong>
                        <span className="crm-card-brand">{d.companyName || d.company || "No brand"}</span>
                        <span>{d.campaignName || "No campaign"} · {money(dealTotal(d))}</span>
                        <small>{managerName(d.managerId)}</small>
                        {d.xeroDueDate ? (
                          <small style={{ display: "block", color: "#4a5568", marginTop: "2px" }}>
                            Due: {d.xeroDueDate}
                          </small>
                        ) : null}
                        {/* Approval only becomes relevant at Contract Signed — a deal
                            still in conversation is nobody's decision yet. */}
                        {CONTRACT_REQUIRED_STAGES.includes(stageOf(d)) &&
                        d.approvalStatus &&
                        d.approvalStatus !== "Approved" ? (
                          <span className={`crm-card-flag ${d.approvalStatus === "Rejected" ? "is-rejected" : ""}`}>
                            {d.approvalStatus === "Rejected"
                              ? "Rejected"
                              : `Waiting on ${approverForDeal.get(d.id) || "an admin"}`}
                          </span>
                        ) : null}
                        {/* How late Xero says the invoice is — the overdue time the
                            client asked to see without opening Xero. */}
                        {Number(d.xeroOverdueDays || 0) > 0 ? (
                          <span className="crm-card-flag is-rejected">
                            {d.xeroOverdueDays} day{d.xeroOverdueDays === 1 ? "" : "s"} overdue
                          </span>
                        ) : null}
                        {/* Xero refusing a draft used to be invisible from here —
                            "Xero are rejecting draft invoices, we're not sure why".
                            The reason Xero gave is on the card and in the tooltip. */}
                        {d.financeStatus === "Xero draft failed" ? (
                          <span
                            className="crm-card-flag is-rejected is-detail"
                            title={d.xeroStatus || "Xero refused this draft"}
                          >
                            Xero refused this draft — {d.xeroStatus || "no reason given"}
                          </span>
                        ) : null}
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

      {addOpen ? (
        <div className="crm-add-overlay">
          <section className="section crm-add-panel open" role="dialog" aria-modal="true" aria-label="Add CRM deal">
            <button className="crm-detail-close" type="button" aria-label="Close" onClick={() => { setAddOpen(false); setEditingId(null); }}>×</button>
            <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>{editingId ? "Edit CRM deal" : "Add CRM deal"}</h2>
              <span className="pill confirmed">{editingId ? "Editing" : "Admin entry"}</span>
            </div>
            <div className="section-body">
              <form className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }} onSubmit={handleAdd}>
                <div className="field">
                  <label htmlFor="crmManagerId">Talent manager</label>
                  <select id="crmManagerId" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} required>
                    <option value="">Choose manager</option>
                    {managers.map((m) => (
                      <option value={m.id} key={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="crmTalentName">Talent name</label>
                  <input id="crmTalentName" list="crm-talent-options" required value={form.talentName} onChange={(e) => setForm({ ...form, talentName: e.target.value })} placeholder="Add or choose talent" />
                  <datalist id="crm-talent-options">
                    {talentNamesForManager(talentData as ApiTalent[], form.managerId).map((name) => (
                      <option value={name} key={name}></option>
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label htmlFor="crmInboundOutbound">Inbound or outbound</label>
                  <select id="crmInboundOutbound" value={form.inboundOrOutbound} onChange={(e) => setForm({ ...form, inboundOrOutbound: e.target.value as "Inbound" | "Outbound" })}>
                    <option value="Inbound">Inbound</option>
                    <option value="Outbound">Outbound</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="crmStage">Stage</label>
                  <select id="crmStage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                    {manualCrmStages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="crmAmount">Deal amount</label>
                  <input id="crmAmount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>

                <div className="field" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label htmlFor="crmUseUSD">Switch to dollars</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px", fontSize: "14px" }}>
                    <input id="crmUseUSD" type="checkbox" checked={form.useUSD} onChange={(e) => setForm({ ...form, useUSD: e.target.checked })} />
                    Use USD for this deal
                  </label>
                  {/* Xero refused USD invoices from a sterling organisation, which is
                      what "Xero are rejecting draft invoices" turned out to be. The
                      draft goes over in GBP and the instruction rides on the line. */}
                  {form.useUSD ? (
                    <small className="field-hint">
                      The Xero draft is raised in <strong>GBP</strong> with{" "}
                      <strong>&ldquo;send in USD&rdquo;</strong> on the invoice description, so
                      whoever sends it knows to bill the brand in dollars.
                    </small>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="crmPaymentTerms">Payment terms</label>
                  <select id="crmPaymentTerms" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                    <option value="Upfront">Upfront</option>
                    <option value="30 days">30 days</option>
                    <option value="45 days">45 days</option>
                    <option value="60 days">60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="crmOwnTimeDays">Own time in days</label>
                  <input id="crmOwnTimeDays" type="number" min="0" value={form.ownTimeDays} onChange={(e) => setForm({ ...form, ownTimeDays: e.target.value })} placeholder="Only if custom" />
                </div>

                <div className="field">
                  <label htmlFor="crmCompanyName">Brand / Xero contact</label>
                  <input
                    id="crmCompanyName"
                    list="crm-xero-contacts"
                    value={form.companyName}
                    onChange={(e) => applyContact(e.target.value)}
                    placeholder="Choose an existing contact, or type a new brand"
                  />
                  {/* Only the closest matches — see contactSuggestions. */}
                  <datalist id="crm-xero-contacts">
                    {contactSuggestions.map((c) => (
                      <option value={c.name} key={c.contactId} />
                    ))}
                  </datalist>
                  {contactHint ? (
                    <small className={`field-hint ${form.xeroContactId ? "contact-matched" : ""}`}>
                      {contactHint}
                    </small>
                  ) : null}
                </div>

                <div className="field">
                  <label htmlFor="crmCampaign">Campaign name</label>
                  <input id="crmCampaign" value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} placeholder="Campaign name" />
                </div>

                <div className="field">
                  <label htmlFor="crmEmailAddresses">Email addresses</label>
                  <input id="crmEmailAddresses" value={form.emailAddresses} onChange={(e) => setForm({ ...form, emailAddresses: e.target.value })} placeholder="name@company.com, finance@company.com" />
                </div>

                <div className="field">
                  <label htmlFor="crmCompanyAddress">Company address</label>
                  <input id="crmCompanyAddress" value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} placeholder="Company address for invoice" />
                </div>

                <div className="field">
                  <label htmlFor="crmPoNumber">PO number</label>
                  <input id="crmPoNumber" disabled={form.noPoNumber} value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="PO number" />
                </div>

                <div className="field" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label htmlFor="crmNoPoNumber">No PO number</label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px", fontSize: "14px" }}>
                    <input id="crmNoPoNumber" type="checkbox" checked={form.noPoNumber} onChange={(e) => setForm({ ...form, noPoNumber: e.target.checked })} />
                    No PO for this deal
                  </label>
                </div>

                <div className="field">
                  <label htmlFor="crmXeroCode">Xero account code</label>
                  <input id="crmXeroCode" value={form.xeroAccountCode} onChange={(e) => setForm({ ...form, xeroAccountCode: e.target.value })} placeholder="200" />
                </div>

                <div className="field">
                  <label htmlFor="crmXeroTaxRate">Xero tax rate</label>
                  <select id="crmXeroTaxRate" value={form.xeroTaxRate} onChange={(e) => setForm({ ...form, xeroTaxRate: e.target.value })}>
                    <option value="No VAT">No VAT</option>
                    <option value="20% (VAT on Income)">20% (VAT on Income)</option>
                    <option value="Exempt">Exempt</option>
                  </select>
                </div>

                <div className="field" style={{ gridColumn: "span 2" }}>
                  <label htmlFor="crmContract">Contract</label>
                  <input
                    id="crmContract"
                    type="file"
                    disabled={form.noContract}
                    onChange={(e) => setForm({ ...form, contractUrl: e.target.files?.[0]?.name || "" })}
                  />
                  {form.contractUrl && !form.noContract ? (
                    <small className="field-hint">Attached: {form.contractUrl}</small>
                  ) : null}
                  <label className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={form.noContract}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          noContract: e.target.checked,
                          contractUrl: e.target.checked ? "" : form.contractUrl,
                        })
                      }
                    />
                    No contract for this deal
                  </label>
                  {CONTRACT_REQUIRED_STAGES.includes(form.stage) && !form.contractUrl && !form.noContract ? (
                    <small className="field-error">
                      A contract (or the “No contract” tick) is required at {form.stage}.
                    </small>
                  ) : null}
                </div>

                <div className="field wide" style={{ gridColumn: "span 2", marginTop: "10px" }}>
                  <div className="row-actions">
                    <button className="primary" type="submit" disabled={creating || updating}>
                      {creating || updating ? "Saving…" : editingId ? "Save changes" : "Add CRM deal"}
                    </button>
                    {editingId ? (
                      <button
                        className="secondary danger-button"
                        type="button"
                        onClick={() => {
                          const deal = deals.find((d) => d.id === editingId);
                          if (deal) handleDelete(deal);
                        }}
                      >
                        Delete deal
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
