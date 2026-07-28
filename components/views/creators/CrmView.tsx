"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { money, sum, stageClass } from "@/lib/format";
import { crmStages } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { useGetDealsQuery, useCreateDealMutation } from "@/redux/api/dealApi";
import { toDeal, talentNamesForManager } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";

const manualCrmStages = crmStages.filter((stage) => stage !== "Paid");

export default function CrmView() {
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { managers } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const [createDeal, { isLoading: creating }] = useCreateDealMutation();

  const deals = useMemo(() => dealData.map(toDeal), [dealData]);
  const managerName = (id: string) => managers.find((m) => m.id === id)?.name || id;

  const [managerFilter, setManagerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    managerId: "",
    talentName: "",
    inboundOrOutbound: "Inbound" as "Inbound" | "Outbound",
    stage: "Conversation",
    amount: "",
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
  });

  const filtered = deals.filter((d) => {
    if (managerFilter !== "all" && d.managerId !== managerFilter) return false;
    if (stageFilter !== "all" && (d.status === "Confirmed" ? "Paid" : d.stage || "Conversation") !== stageFilter) return false;
    return true;
  });

  // Group by the deal's stage (fall back to Conversation).
  const stageOf = (d: (typeof deals)[number]) => d.stage || (d.status === "Confirmed" ? "Contract Signed" : "Conversation");
  const dealTotal = (d: (typeof deals)[number]) => sum(d.monthValues);
  const totalVisible = filtered.reduce((t, d) => t + dealTotal(d), 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.managerId || !form.talentName.trim()) return;
    const monthValues = new Array(12).fill(0);
    monthValues[0] = Number(form.amount) || 0;
    const status = (form.stage === "Conversation" || form.stage === "Negotiation" || form.stage === "Contract Signed")
      ? "Pipeline"
      : "Confirmed";

    await createDeal({
      manager: form.managerId,
      talentName: form.talentName.trim(),
      inboundOrOutbound: form.inboundOrOutbound,
      stage: form.stage,
      status,
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
      currency: form.useUSD ? "USD" : "GBP",
      company: form.companyName.trim(),
    });

    setForm({
      managerId: "",
      talentName: "",
      inboundOrOutbound: "Inbound",
      stage: "Conversation",
      amount: "",
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
    });
    setAddOpen(false);
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
          <span className="pill">{money(totalVisible)}</span>
        </div>
        <div className="section-body earnings-grid">
          {crmStages.map((stage) => {
            const stageDeals = filtered.filter((d) => stageOf(d) === stage);
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
            <button className="primary add-crm-toggle" type="button" onClick={() => setAddOpen((o) => !o)}>
              {addOpen ? "Close add CRM deal" : "Add CRM deal"}
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
              <div className={`crm-column ${stageClass(stage)}`} key={stage}>
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>{money(stageDeals.reduce((t, d) => t + dealTotal(d), 0))}</strong>
                </div>
                <div className="crm-card-list">
                  {stageDeals.length ? (
                    stageDeals.map((d) => (
                      <div className="crm-card" key={d.id}>
                        <strong>{d.talentName}</strong>
                        <span>{d.campaignName || "No campaign"} · {money(dealTotal(d))}</span>
                        <small>{managerName(d.managerId)}</small>
                      </div>
                    ))
                  ) : (
                    <div className="crm-empty">No deals</div>
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
            <button className="crm-detail-close" type="button" aria-label="Close" onClick={() => setAddOpen(false)}>×</button>
            <div className="section-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Add CRM deal</h2>
              <span className="pill green" style={{ background: "#d9ece3", color: "#1f6b52", fontWeight: 700, padding: "4px 10px", borderRadius: "12px", fontSize: "12px" }}>Admin entry</span>
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
                  <label htmlFor="crmCompanyName">Company name</label>
                  <input id="crmCompanyName" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Brand or agency" />
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
                  <input id="crmContract" type="file" onChange={(e) => setForm({ ...form, contractUrl: e.target.files?.[0]?.name || "" })} />
                </div>

                <button className="primary wide" type="submit" style={{ gridColumn: "span 2", marginTop: "10px" }} disabled={creating}>
                  {creating ? "Adding…" : "Add CRM deal"}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
