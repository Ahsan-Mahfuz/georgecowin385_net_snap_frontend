"use client";

import { useMemo, useState } from "react";
import { money, currencyMoney, slugify, usdToGbpRate } from "@/lib/format";
import { paymentTerms } from "@/lib/mock";

type BrandRecord = {
  name: string;
  emailContact: string;
  billingAddress: string;
  paymentTerm: string;
  customPaymentDays: number;
  updatedAt?: string;
};

type CrmDeal = {
  id: string;
  managerId: string;
  talentName: string;
  campaignName: string;
  company: string;
  amount: number;
  currency?: string;
  updatedAt?: string;
};

type BrandSortMode = "alphabetical" | "total";

// crmDeals and brandDatabase are empty on first load (prototype seeds them from
// live activity that does not exist yet), so the view renders its empty states.
const brandDatabase: Record<string, BrandRecord> = {};
const crmDeals: CrmDeal[] = [];

function brandKey(name: string): string {
  return slugify(String(name || "").trim().toLowerCase());
}

function dealGbpAmount(deal: CrmDeal): number {
  const amount = Number(deal.amount || 0);
  return deal.currency === "USD" ? amount * usdToGbpRate : amount;
}

function dealMoney(deal: CrmDeal): string {
  if (deal.currency === "USD") {
    return `${currencyMoney(deal.amount, "USD")} / ${money(dealGbpAmount(deal))}`;
  }
  return money(deal.amount);
}

function brandDeals(name: string): CrmDeal[] {
  const key = brandKey(name);
  return crmDeals
    .filter((deal) => brandKey(deal.company) === key)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
}

function brandTotalAmount(name: string): number {
  return brandDeals(name).reduce((total, deal) => total + dealGbpAmount(deal), 0);
}

function brandPaymentLabel(brand: BrandRecord | null): string {
  if (!brand) return "-";
  if (brand.paymentTerm === "custom") return `${Number(brand.customPaymentDays || 0)} days`;
  return (
    paymentTerms.find((term) => term.value === brand.paymentTerm) || paymentTerms[1]
  ).label;
}

export default function BrandsView() {
  const [brandSortMode, setBrandSortMode] = useState<BrandSortMode>("alphabetical");
  const [selectedBrandName, setSelectedBrandName] = useState("");

  const records = useMemo(() => {
    return Object.values(brandDatabase).sort((a, b) => {
      if (brandSortMode === "total") {
        return (
          brandTotalAmount(b.name) - brandTotalAmount(a.name) ||
          a.name.localeCompare(b.name)
        );
      }
      return a.name.localeCompare(b.name);
    });
  }, [brandSortMode]);

  const selected: BrandRecord | null =
    brandDatabase[brandKey(selectedBrandName)] || records[0] || null;

  const deals = selected ? brandDeals(selected.name) : [];

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Brands</h1>
        </div>
        <div className="asof">
          Saved brand details for CRM autofill and booked-deal history
        </div>
      </div>

      <div className="layout">
        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>{selected ? "Brand details" : "Add brand"}</h2>
              <span className="pill">* check before use</span>
            </div>
            <div className="section-body">
              <form className="form-grid" key={selected ? selected.name : "new"}>
                <div className="field">
                  <label htmlFor="brandName">Brand name</label>
                  <input
                    id="brandName"
                    name="name"
                    required
                    defaultValue={selected ? selected.name : ""}
                    placeholder="Brand or company name"
                  />
                </div>
                <div className="field">
                  <label htmlFor="brandEmail">Email addresses *</label>
                  <input
                    id="brandEmail"
                    name="emailContact"
                    type="text"
                    defaultValue={selected ? selected.emailContact : ""}
                    placeholder="finance@brand.com, contact@brand.com"
                  />
                </div>
                <div className="field">
                  <label htmlFor="brandAddress">Company address *</label>
                  <input
                    id="brandAddress"
                    name="billingAddress"
                    defaultValue={selected ? selected.billingAddress : ""}
                    placeholder="Address for invoice"
                  />
                </div>
                <div className="field">
                  <label htmlFor="brandPaymentTerm">Payment terms *</label>
                  <select
                    id="brandPaymentTerm"
                    name="paymentTerm"
                    defaultValue={selected ? selected.paymentTerm : "30"}
                  >
                    {paymentTerms.map((term) => (
                      <option key={term.value} value={term.value}>
                        {term.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="brandCustomDays">Own time in days</label>
                  <input
                    id="brandCustomDays"
                    name="customPaymentDays"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={selected && selected.customPaymentDays ? selected.customPaymentDays : ""}
                    placeholder="Only if custom"
                  />
                </div>
                <button className="primary wide" type="submit">
                  Save brand details
                </button>
              </form>
              <div className="notice soft-note">
                * Details may have changed. Managers should check email, company
                address, and payment terms before sending a deal to invoice.
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Brand database</h2>
              <div className="section-actions">
                <select
                  className="compact-select"
                  value={brandSortMode}
                  onChange={(event) =>
                    setBrandSortMode(event.target.value as BrandSortMode)
                  }
                >
                  <option value="alphabetical">Sort A-Z</option>
                  <option value="total">Sort by deal total</option>
                </select>
                <span className="pill">{records.length} brands</span>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th>Total deal value</th>
                    <th>Past deals</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((brand) => {
                      const brandDealList = brandDeals(brand.name);
                      const count = brandDealList.length;
                      const total = brandDealList.reduce(
                        (amount, deal) => amount + dealGbpAmount(deal),
                        0
                      );
                      return (
                        <tr
                          key={brand.name}
                          className={selected?.name === brand.name ? "active-row" : ""}
                        >
                          <td>
                            <button
                              className="table-link"
                              type="button"
                              onClick={() => setSelectedBrandName(brand.name)}
                            >
                              {brand.name}
                            </button>
                          </td>
                          <td>{money(total)}</td>
                          <td>{count}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3}>No brands saved yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="section">
          <div className="section-head">
            <h2>{selected ? `${selected.name} deals` : "Brand deals"}</h2>
            <span className="pill">{deals.length} booked</span>
          </div>
          <div className="section-body manager-list">
            {selected ? (
              <>
                <div className="metric-card">
                  <span>Saved details *</span>
                  <strong>{selected.emailContact || "No email saved"}</strong>
                  <small>
                    {selected.billingAddress || "No company address saved"} ·{" "}
                    {brandPaymentLabel(selected)}
                  </small>
                </div>
                {deals.length ? (
                  deals.map((deal) => (
                    <button className="deal-card" type="button" key={deal.id}>
                      <div>
                        <strong>{deal.talentName}</strong>
                        <small>{deal.campaignName || "No campaign name"}</small>
                      </div>
                      <div>
                        <strong>{dealMoney(deal)}</strong>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="notice">
                    No booked CRM deals for this brand yet.
                  </div>
                )}
              </>
            ) : (
              <div className="notice">
                Add a brand to start building the database.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
