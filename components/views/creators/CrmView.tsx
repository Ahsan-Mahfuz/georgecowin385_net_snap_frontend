"use client";

import { useState } from "react";
import { money, stageClass } from "@/lib/format";
import {
  crmStages,
  managers,
  paymentTerms,
  roleLabel,
  talentOptions,
} from "@/lib/mock";

const manualCrmStages = crmStages.filter((stage) => stage !== "Paid");
const crmDirections = ["Inbound", "Outbound"];

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function managerName(id: string): string {
  return managers.find((manager) => manager.id === id)?.name || id;
}

interface CrmTalentRow {
  key: string;
  managerId: string;
  talentName: string;
}

// Mirrors crmTalentFilterRows() for the empty-data case (no CRM deals yet).
function crmTalentFilterRows(): CrmTalentRow[] {
  const rows = new Map<string, CrmTalentRow>();
  managers.forEach((manager) => {
    talentOptions(manager.id).forEach((talentName) => {
      rows.set(talentKey(manager.id, talentName), {
        key: talentKey(manager.id, talentName),
        managerId: manager.id,
        talentName,
      });
    });
  });
  return [...rows.values()].sort(
    (a, b) =>
      a.talentName.localeCompare(b.talentName) ||
      managerName(a.managerId).localeCompare(managerName(b.managerId)),
  );
}

export default function CrmView() {
  // Admin (all-roster) perspective. CRM deals are empty on first load.
  const accessibleManagers = managers;
  const formManagers = managers;
  const canCreateCrmDeal = true;

  const [selectedCrmManagerId, setSelectedCrmManagerId] = useState("all");
  const [selectedCrmTalentKey, setSelectedCrmTalentKey] = useState("all");
  const [activeCrmStage, setActiveCrmStage] = useState("all");
  const [crmPaidOpen, setCrmPaidOpen] = useState(false);
  const [crmAddOpen, setCrmAddOpen] = useState(false);
  const [formManagerId, setFormManagerId] = useState(formManagers[0]?.id || "");

  const crmTalentRows = crmTalentFilterRows();

  // No CRM deals seeded, so every stage renders its empty state.
  const totalVisible = 0;

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
          {crmStages.map((stage) => (
            <div className="earning" key={stage}>
              <span>{stage}</span>
              <strong>{money(0)}</strong>
              <small>0 deals</small>
            </div>
          ))}
        </div>
      </section>

      <section className="section crm-board-section">
        <div className="section-head">
          <h2>Deals by stage</h2>
          <div className="section-actions">
            {canCreateCrmDeal ? (
              <button
                className="primary add-crm-toggle"
                type="button"
                onClick={() => setCrmAddOpen((open) => !open)}
              >
                {crmAddOpen ? "Close add CRM deal" : "Add CRM deal"}
              </button>
            ) : null}
            <select
              className="compact-select"
              value={selectedCrmManagerId}
              onChange={(event) => setSelectedCrmManagerId(event.target.value)}
            >
              <option value="all">All managers</option>
              {accessibleManagers.map((manager) => (
                <option value={manager.id} key={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
            <select
              className="compact-select"
              value={selectedCrmTalentKey}
              onChange={(event) => setSelectedCrmTalentKey(event.target.value)}
            >
              <option value="all">All talent</option>
              {crmTalentRows.map((row) => (
                <option value={row.key} key={row.key}>
                  {row.talentName}
                  {accessibleManagers.length > 1 ? ` - ${managerName(row.managerId)}` : ""}
                </option>
              ))}
            </select>
            <select
              className="compact-select"
              value={activeCrmStage}
              onChange={(event) => setActiveCrmStage(event.target.value)}
            >
              <option value="all">All stages</option>
              {crmStages.map((stage) => (
                <option value={stage} key={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="crm-board">
          {crmStages.map((stage) => {
            const isPaidStage = stage === "Paid";
            const isPaidOpen = !isPaidStage || crmPaidOpen;
            return (
              <div
                className={`crm-column ${stageClass(stage)} ${
                  isPaidStage && !isPaidOpen ? "crm-column-collapsed" : ""
                }`}
                data-crm-stage-drop={stage}
                key={stage}
              >
                <div className="crm-column-head">
                  <span>{stage}</span>
                  <strong>{money(0)}</strong>
                </div>
                {isPaidStage ? (
                  <button
                    className="crm-paid-toggle"
                    type="button"
                    aria-expanded={crmPaidOpen ? "true" : "false"}
                    onClick={() => setCrmPaidOpen((open) => !open)}
                  >
                    <span>{crmPaidOpen ? "Hide paid deals" : "Show paid deals"}</span>
                    <strong>0 deals</strong>
                  </button>
                ) : null}
                {isPaidOpen ? (
                  <div className="crm-card-list" data-crm-stage-drop={stage}>
                    <div className="crm-empty">No deals</div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {canCreateCrmDeal && crmAddOpen ? (
        <div className="crm-add-overlay">
          <section
            className="section crm-add-panel open"
            role="dialog"
            aria-modal="true"
            aria-label="Add CRM deal"
          >
            <button
              className="crm-detail-close"
              type="button"
              aria-label="Close add CRM deal"
              onClick={() => setCrmAddOpen(false)}
            >
              ×
            </button>
            <div className="section-head">
              <h2>Add CRM deal</h2>
              <span className="pill confirmed">{`${roleLabel("admin")} entry`}</span>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
                <div className="field">
                  <label htmlFor="crmManagerId">Talent manager</label>
                  <select
                    id="crmManagerId"
                    name="managerId"
                    value={formManagerId}
                    onChange={(event) => setFormManagerId(event.target.value)}
                  >
                    {formManagers.map((manager) => (
                      <option value={manager.id} key={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmTalentName">Talent name</label>
                  <input
                    id="crmTalentName"
                    name="talentName"
                    list="crm-talent-options"
                    required
                    placeholder="Add or choose talent"
                  />
                  <datalist id="crm-talent-options">
                    {talentOptions(formManagerId).map((name) => (
                      <option value={name} key={name}></option>
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="crmDirection">Inbound or outbound</label>
                  <select id="crmDirection" name="direction">
                    {crmDirections.map((direction) => (
                      <option key={direction}>{direction}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmStage">Stage</label>
                  <select id="crmStage" name="stage">
                    {manualCrmStages.map((stage) => (
                      <option key={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmAmount">Deal amount</label>
                  <input
                    id="crmAmount"
                    name="amount"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div className="field checkbox-field">
                  <label htmlFor="crmCurrencyUsd">Switch to dollars</label>
                  <label className="toggle-line">
                    <input id="crmCurrencyUsd" name="currencyUsd" type="checkbox" value="USD" /> Use
                    USD for this deal
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="crmPaymentTerm">Payment terms</label>
                  <select id="crmPaymentTerm" name="paymentTerm">
                    {paymentTerms.map((term) => (
                      <option value={term.value} key={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmCustomDays">Own time in days</label>
                  <input
                    id="crmCustomDays"
                    name="customPaymentDays"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Only if custom"
                  />
                </div>
                <div className="field">
                  <label htmlFor="crmCompany">Company name</label>
                  <input
                    id="crmCompany"
                    name="company"
                    list="crm-brand-options"
                    required
                    placeholder="Brand or agency"
                  />
                  <datalist id="crm-brand-options"></datalist>
                </div>
                <div className="field">
                  <label htmlFor="crmCampaign">Campaign name</label>
                  <input id="crmCampaign" name="campaignName" placeholder="Campaign name" />
                </div>
                <div className="field">
                  <label htmlFor="crmEmail">Email addresses</label>
                  <input
                    id="crmEmail"
                    name="emailContact"
                    type="text"
                    placeholder="name@company.com, finance@company.com"
                  />
                </div>
                <div className="field">
                  <label htmlFor="crmBillingAddress">Company address</label>
                  <input
                    id="crmBillingAddress"
                    name="billingAddress"
                    placeholder="Company address for invoice"
                  />
                </div>
                <div className="notice soft-note wide" hidden>
                  * Brand details have been filled from the brand database. Please check email,
                  address, and payment terms before saving.
                </div>
                <div className="field">
                  <label htmlFor="crmInvoiceReference">PO number</label>
                  <input id="crmInvoiceReference" name="invoiceReference" placeholder="PO number" />
                </div>
                <div className="field checkbox-field">
                  <label htmlFor="crmNoPoNumber">No PO number</label>
                  <label className="toggle-line">
                    <input id="crmNoPoNumber" name="noPoNumber" type="checkbox" /> No PO for this
                    deal
                  </label>
                </div>
                <div className="field">
                  <label htmlFor="crmAccountCode">Xero account code</label>
                  <input id="crmAccountCode" name="xeroAccountCode" defaultValue="200" />
                </div>
                <div className="field">
                  <label htmlFor="crmTaxRate">Xero tax rate</label>
                  <select id="crmTaxRate" name="xeroTaxRate">
                    <option>No VAT</option>
                    <option>20% VAT on Income</option>
                    <option>Zero Rated Income</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crmContract">Contract</label>
                  <input id="crmContract" name="contract" type="file" />
                </div>
                <button className="primary wide" type="submit">
                  Add CRM deal
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
