"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { money, currencyMoney, slugify, sum, usdToGbpRate } from "@/lib/format";
import { paymentTerms } from "@/lib/mock";
import { useGetDealsQuery, useGetXeroContactsQuery } from "@/redux/api/dealApi";
import {
  useGetBrandsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} from "@/redux/api/brandApi";
import { toDeal } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

type BrandRecord = {
  id: string;
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

// Live data, published by the component before render so the module-level
// helpers below (shared with the sub-renders) resolve against current data.
let crmDeals: CrmDeal[] = [];

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
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { data: brandData = [] } = useGetBrandsQuery();
  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const [createBrand, { isLoading: creating }] = useCreateBrandMutation();
  const [updateBrand, { isLoading: updating }] = useUpdateBrandMutation();
  const [deleteBrand] = useDeleteBrandMutation();
  const confirm = useConfirm();
  const toast = useToast();

  const [brandSortMode, setBrandSortMode] = useState<BrandSortMode>("alphabetical");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  // Publish deals for the module-level helpers before anything renders.
  crmDeals = useMemo(
    () =>
      dealData.map((raw) => {
        const d = toDeal(raw);
        return {
          id: d.id,
          managerId: d.managerId,
          talentName: d.talentName,
          campaignName: d.campaignName || "",
          company: d.company || d.companyName || "",
          amount: sum(d.monthValues || []),
          currency: d.currency,
          updatedAt: raw.updatedAt,
        };
      }),
    [dealData],
  );

  const { data: xeroContacts = [] } = useGetXeroContactsQuery("creators");

  const records: BrandRecord[] = useMemo(() => {
    const map = new Map<string, BrandRecord>();

    brandData.forEach((b) => {
      map.set(brandKey(b.name), {
        id: b._id,
        name: b.name,
        emailContact: b.emailContact || "",
        billingAddress: b.billingAddress || "",
        paymentTerm: b.paymentTerm || "30",
        customPaymentDays: Number(b.customPaymentDays || 0),
        updatedAt: b.updatedAt,
      });
    });

    crmDeals.forEach((deal) => {
      const name = deal.company?.trim();
      if (!name) return;
      const key = brandKey(name);
      if (!map.has(key)) {
        map.set(key, {
          id: `crm-${key}`,
          name: name,
          emailContact: "",
          billingAddress: "",
          paymentTerm: "30",
          customPaymentDays: 0,
        });
      }
    });

    const list = [...map.values()];
    return list.sort((a, b) =>
      brandSortMode === "total"
        ? brandTotalAmount(b.name) - brandTotalAmount(a.name) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
  }, [brandData, crmDeals, brandSortMode]);

  const selected: BrandRecord | null = addingNew
    ? null
    : records.find((b) => b.id === selectedBrandId) || records[0] || null;

  const deals = selected ? brandDeals(selected.name) : [];

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const body = {
      name: String(fd.get("name") || "").trim(),
      emailContact: String(fd.get("emailContact") || "").trim(),
      billingAddress: String(fd.get("billingAddress") || "").trim(),
      paymentTerm: String(fd.get("paymentTerm") || "30"),
      customPaymentDays: Number(fd.get("customPaymentDays") || 0),
    };
    if (!body.name) return toast.error("Enter a brand name.");
    try {
      if (selected) {
        await updateBrand({ id: selected.id, body }).unwrap();
        toast.success(`${body.name} details saved.`);
      } else {
        const created = await createBrand(body).unwrap();
        toast.success(`${body.name} added to the brand database.`);
        setSelectedBrandId(created._id);
        setAddingNew(false);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save those brand details."));
    }
  };

  const handleDelete = async (brand: BrandRecord) => {
    const count = brandDeals(brand.name).length;
    const ok = await confirm({
      tone: "danger",
      title: "Delete brand?",
      confirmLabel: "Delete brand",
      message: (
        <>
          <strong>{brand.name}</strong> will be removed from the brand database and will no longer
          autofill in the CRM.
          {count > 0 ? (
            <>
              {" "}
              Their <strong>{count} booked deal{count === 1 ? "" : "s"}</strong> are not affected.
            </>
          ) : null}
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteBrand(brand.id).unwrap();
      toast.success(`${brand.name} deleted.`);
      setSelectedBrandId(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not delete that brand."));
    }
  };

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
              <form className="form-grid" key={selected ? selected.id : "new"} onSubmit={handleSave}>
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
                <div className="field wide">
                  <div className="row-actions">
                    <button className="primary" type="submit" disabled={creating || updating}>
                      {creating || updating ? "Saving…" : selected ? "Save brand details" : "Add brand"}
                    </button>
                    {selected ? (
                      <>
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => { setAddingNew(true); setSelectedBrandId(null); }}
                        >
                          New brand
                        </button>
                        <button
                          className="secondary danger-button"
                          type="button"
                          onClick={() => handleDelete(selected)}
                        >
                          Delete brand
                        </button>
                      </>
                    ) : records.length ? (
                      <button className="secondary" type="button" onClick={() => setAddingNew(false)}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
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
                          key={brand.id}
                          className={selected?.id === brand.id ? "active-row" : ""}
                        >
                          <td>
                            <button
                              className="table-link"
                              type="button"
                              onClick={() => { setAddingNew(false); setSelectedBrandId(brand.id); }}
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
