"use client";

import { useMemo, useState } from "react";
import { money, sum, stageClass } from "@/lib/format";
import { crmStages } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { useGetDealsQuery, useCreateDealMutation } from "@/redux/api/dealApi";
import { toDeal, talentNamesForManager } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";

const manualCrmStages = crmStages.filter((stage) => stage !== "Paid");

export default function CrmView() {
  const { managers } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [] } = useGetDealsQuery();
  const [createDeal, { isLoading: creating }] = useCreateDealMutation();

  const deals = useMemo(() => dealData.map(toDeal), [dealData]);
  const managerName = (id: string) => managers.find((m) => m.id === id)?.name || id;

  const [managerFilter, setManagerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ managerId: "", talentName: "", stage: "Conversation", campaignName: "", status: "Pipeline" as "Pipeline" | "Confirmed", amount: "" });

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
    // Put the whole amount in the current-ish first month for simplicity.
    monthValues[0] = Number(form.amount) || 0;
    await createDeal({
      manager: form.managerId,
      talentName: form.talentName.trim(),
      status: form.status,
      stage: form.stage,
      campaignName: form.campaignName,
      monthValues,
    });
    setForm({ ...form, talentName: "", campaignName: "", amount: "" });
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
            <div className="section-head">
              <h2>Add CRM deal</h2>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={handleAdd}>
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
                  <label htmlFor="crmStage">Stage</label>
                  <select id="crmStage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                    {manualCrmStages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmStatus">Status</label>
                  <select id="crmStatus" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Pipeline" | "Confirmed" })}>
                    <option value="Pipeline">Pipeline</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmAmount">Deal amount</label>
                  <input id="crmAmount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="field">
                  <label htmlFor="crmCampaign">Campaign name</label>
                  <input id="crmCampaign" value={form.campaignName} onChange={(e) => setForm({ ...form, campaignName: e.target.value })} placeholder="Campaign name" />
                </div>
                <button className="primary wide" type="submit" disabled={creating}>
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
