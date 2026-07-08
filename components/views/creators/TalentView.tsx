"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { managers, users, allDeals, defaultTalents, Deal } from "@/lib/mock";

// This view reproduces the prototype's talentAdminView (admin / full-roster variant).
// UI only — mutating buttons and inputs render for fidelity but are no-ops.

const ADMIN_EDITABLE = true; // role === "admin" => canAdminister

interface RosterRow {
  key: string;
  managerId: string;
  talentName: string;
  total: number;
}

interface TalentProfile {
  bio: string;
  imageUrl: string;
  platforms: Record<string, boolean>;
  handles: Record<string, string>;
  stats: Record<string, { audience: number; engagement: number; label: string } | undefined>;
  updatedAt: string;
}

interface InvoiceDetails {
  invoiceName: string;
  invoiceEmail: string;
  invoiceAddress: string;
  bankName: string;
  accountName: string;
  sortCode: string;
  accountNumber: string;
  vatNumber: string;
}

const PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return users.find((user) => user.id === id)?.name || "Unassigned";
}

function talentOptions(managerId: string): string[] {
  return defaultTalents[managerId] || [];
}

function rosterRowsForManager(managerId: string): RosterRow[] {
  return talentOptions(managerId)
    .map((talentName) => {
      const submittedDeals = allDeals.filter(
        (deal) => deal.managerId === managerId && deal.talentName === talentName
      );
      return {
        key: talentKey(managerId, talentName),
        managerId,
        talentName,
        total: submittedDeals.reduce((total, deal) => total + sum(deal.monthValues), 0),
      };
    })
    .sort((a, b) => b.total - a.total || a.talentName.localeCompare(b.talentName));
}

// Talent email/invoice/profile state is empty on first load in the prototype.
function talentEmail(): string {
  return "";
}

function talentInvoiceDetails(talentName: string): InvoiceDetails {
  return {
    invoiceName: talentName || "",
    invoiceEmail: talentEmail(),
    invoiceAddress: "",
    bankName: "",
    accountName: talentName || "",
    sortCode: "",
    accountNumber: "",
    vatNumber: "",
  };
}

function talentProfile(): TalentProfile {
  return {
    bio: "",
    imageUrl: "",
    platforms: { youtube: false, instagram: false, tiktok: false },
    handles: { youtube: "", instagram: "", tiktok: "" },
    stats: { youtube: undefined, instagram: undefined, tiktok: undefined },
    updatedAt: "",
  };
}

function hashString(value: string): number {
  return String(value || "")
    .split("")
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function generatedTalentImage(managerId: string, talentName: string): string {
  const colors = ["#f6ee45", "#37b8a9", "#ef6aa4", "#111111", "#f1f4ef"];
  const hash = Math.abs(hashString(`${managerId}-${talentName}`));
  const bg = colors[hash % colors.length];
  const fg = bg === "#111111" ? "#f6ee45" : "#111111";
  const initials = String(talentName || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><rect width="900" height="1100" fill="${bg}"/><circle cx="735" cy="185" r="120" fill="${fg}" opacity=".12"/><circle cx="135" cy="920" r="180" fill="${fg}" opacity=".1"/><text x="450" y="560" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="170" font-weight="900" fill="${fg}">${initials}</text><text x="450" y="680" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" letter-spacing="8" fill="${fg}">COWSHED</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function profileImageUrl(managerId: string, talentName: string): string {
  const profile = talentProfile();
  return profile.imageUrl || generatedTalentImage(managerId, talentName);
}

function socialPlatformLabel(platform: string): string {
  if (platform === "youtube") return "YouTube";
  if (platform === "instagram") return "Instagram";
  if (platform === "tiktok") return "TikTok";
  return platform;
}

function DealCards({ deals }: { deals: Deal[] }) {
  if (!deals.length) return <div className="notice">No deals in this view yet.</div>;
  return (
    <>
      {deals.map((deal) => {
        const totalRevenue = sum(deal.monthValues);
        const monthLabel =
          months.find((_, index) => Number(deal.monthValues[index] || 0) > 0) || "Multi-month";
        return (
          <article className="deal" key={deal.id}>
            <div className="deal-line">
              <strong>{deal.talentName}</strong>
              <span className={`pill ${deal.status.toLowerCase()}`}>{deal.status}</span>
            </div>
            <div className="deal-line muted">
              <span>Campaign</span>
              <span>{deal.campaignName}</span>
            </div>
            <div className="deal-line muted">
              <span>Amount</span>
              <span>{money(totalRevenue)}</span>
            </div>
            <div className="deal-line muted">
              <span>Month</span>
              <span>{monthLabel}</span>
            </div>
          </article>
        );
      })}
    </>
  );
}

function TalentMonthlyDealsTable({ deals }: { deals: Deal[] }) {
  const rowMap = new Map<string, { talentName: string; managerId: string; values: number[] }>();
  deals.forEach((deal) => {
    const key = talentKey(deal.managerId, deal.talentName);
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        talentName: deal.talentName,
        managerId: deal.managerId,
        values: months.map(() => 0),
      });
    }
    const row = rowMap.get(key)!;
    deal.monthValues.forEach((value, index) => {
      row.values[index] += Number(value || 0);
    });
  });
  const orderedRows = [...rowMap.values()].sort(
    (a, b) => sum(b.values) - sum(a.values) || a.talentName.localeCompare(b.talentName)
  );
  return (
    <div className="roster-panel">
      <div className="roster-title">
        <h3>Deals by talent and month</h3>
        <span>All visible deals</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Talent</th>
              <th>Manager</th>
              {months.map((month) => (
                <th key={month}>{month}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.length ? (
              orderedRows.map((row) => (
                <tr key={talentKey(row.managerId, row.talentName)}>
                  <td>{row.talentName}</td>
                  <td>{managerName(row.managerId)}</td>
                  {row.values.map((value, index) => (
                    <td key={index}>{value ? money(value) : "-"}</td>
                  ))}
                  <td>{money(sum(row.values))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={15}>No deal values in this view yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TalentProfileSection({ managerId, talentName }: { managerId: string; talentName: string }) {
  const key = talentKey(managerId, talentName);
  const profile = talentProfile();
  const editable = ADMIN_EDITABLE;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Talent profile</h2>
        <span className="pill">{editable ? "Editable" : "View only"}</span>
      </div>
      <div className="section-body">
        <div className="talent-profile-preview">
          <img src={profileImageUrl(managerId, talentName)} alt={`${talentName} preview`} />
          <div>
            <strong>{talentName}</strong>
            <span>{managerName(managerId)}</span>
            <small>{profile.updatedAt ? `Stats updated` : "No stats pulled yet"}</small>
          </div>
        </div>
        <div className="form-grid compact-action-grid">
          <div className="field wide">
            <label>About talent</label>
            {editable ? (
              <textarea
                data-talent-profile={key}
                data-field="bio"
                rows={5}
                placeholder="Short media pack bio"
                defaultValue={profile.bio}
              />
            ) : (
              <div className="read-field">{profile.bio || "No bio added yet."}</div>
            )}
          </div>
          <div className="field wide">
            <label>Preview image URL</label>
            {editable ? (
              <input
                data-talent-profile={key}
                data-field="imageUrl"
                defaultValue={profile.imageUrl}
                placeholder="Paste profile image URL, or leave blank for generated preview"
              />
            ) : (
              <div className="read-field">
                {profile.imageUrl ? profile.imageUrl : "Generated preview image"}
              </div>
            )}
          </div>
          {PLATFORMS.map((platform) => {
            const stats = profile.stats[platform];
            return (
              <div className="field social-field" key={platform}>
                <label>{socialPlatformLabel(platform)}</label>
                {editable ? (
                  <>
                    <label className="toggle-line">
                      <input
                        type="checkbox"
                        data-talent-profile={key}
                        data-field={`platform:${platform}`}
                        defaultChecked={profile.platforms[platform]}
                      />{" "}
                      Pull {socialPlatformLabel(platform)}
                    </label>
                    <input
                      data-talent-profile={key}
                      data-field={`handle:${platform}`}
                      defaultValue={profile.handles[platform]}
                      placeholder="@handle"
                    />
                  </>
                ) : (
                  <div className="read-field">{profile.handles[platform] || "-"}</div>
                )}
                <small>No stats pulled</small>
              </div>
            );
          })}
          {editable ? (
            <div className="field wide media-action-row">
              <button className="secondary" type="button" data-pull-social={key}>
                Pull selected social stats
              </button>
              <button className="primary save-detail-button" type="button" data-save-talent-profile={key}>
                Save profile
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TalentInvoiceDetailsForm({
  managerId,
  talentName,
}: {
  managerId: string;
  talentName: string;
}) {
  const key = talentKey(managerId, talentName);
  const details = talentInvoiceDetails(talentName);
  return (
    <div className="section-body">
      <div className="section-head inline-head">
        <h2>Talent invoicing details</h2>
        <span className="pill">Used for payment run invoices</span>
      </div>
      <div className="form-grid compact-action-grid">
        <div className="field">
          <label>Invoice name</label>
          <input
            data-talent-invoice-detail={key}
            data-field="invoiceName"
            defaultValue={details.invoiceName}
            placeholder={talentName}
          />
        </div>
        <div className="field">
          <label>Invoice email</label>
          <input
            data-talent-invoice-detail={key}
            data-field="invoiceEmail"
            type="email"
            defaultValue={details.invoiceEmail}
            placeholder="talent@email.com"
          />
        </div>
        <div className="field wide">
          <label>Invoice address</label>
          <input
            data-talent-invoice-detail={key}
            data-field="invoiceAddress"
            defaultValue={details.invoiceAddress}
            placeholder="Talent billing address"
          />
        </div>
        <div className="field">
          <label>Bank name</label>
          <input
            data-talent-invoice-detail={key}
            data-field="bankName"
            defaultValue={details.bankName}
            placeholder="Bank name"
          />
        </div>
        <div className="field">
          <label>Name on account</label>
          <input
            data-talent-invoice-detail={key}
            data-field="accountName"
            defaultValue={details.accountName}
            placeholder={talentName}
          />
        </div>
        <div className="field">
          <label>Sort code</label>
          <input
            data-talent-invoice-detail={key}
            data-field="sortCode"
            defaultValue={details.sortCode}
            placeholder="00-00-00"
          />
        </div>
        <div className="field">
          <label>Account number</label>
          <input
            data-talent-invoice-detail={key}
            data-field="accountNumber"
            defaultValue={details.accountNumber}
            placeholder="12345678"
          />
        </div>
        <div className="field">
          <label>VAT number</label>
          <input
            data-talent-invoice-detail={key}
            data-field="vatNumber"
            defaultValue={details.vatNumber}
            placeholder="Optional"
          />
        </div>
        <div className="field wide">
          <button className="primary save-detail-button" type="button" data-save-talent-invoice={key}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TalentView() {
  const [selectedManagerId, setSelectedManagerId] = useState<string>("all");
  const [selectedTalentKey, setSelectedTalentKey] = useState<string | null>(null);

  const managerIds = managers.map((manager) => manager.id);
  const effectiveManagerId =
    selectedManagerId !== "all" && !managerIds.includes(selectedManagerId) ? "all" : selectedManagerId;
  const allSelected = effectiveManagerId === "all";

  const rows: RosterRow[] = allSelected
    ? managers.flatMap((manager) => rosterRowsForManager(manager.id))
    : rosterRowsForManager(effectiveManagerId);

  const activeTalentKey =
    selectedTalentKey && rows.some((row) => row.key === selectedTalentKey) ? selectedTalentKey : null;
  const selectedTalent = rows.find((row) => row.key === activeTalentKey) || null;
  const selectedTalentDeals: Deal[] = selectedTalent
    ? allDeals.filter(
        (deal) =>
          deal.managerId === selectedTalent.managerId && deal.talentName === selectedTalent.talentName
      )
    : [];

  const addTalentDefaultManager = allSelected ? "amelia" : effectiveManagerId;

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Talent</h1>
        </div>
        <div className="asof">{ADMIN_EDITABLE ? "Roster management" : "Roster overview and invoicing details"}</div>
      </div>
      <div className="layout">
        <div className="section-stack">
          <section className="section">
            <div className="section-head">
              <h2>Roster</h2>
              <span className="pill admin">{ADMIN_EDITABLE ? "Admin editable" : "View only"}</span>
            </div>
            <div className="section-body">
              <div className="field roster-filter">
                <label htmlFor="adminTalentManager">Select manager</label>
                <select
                  id="adminTalentManager"
                  className="compact-select"
                  value={effectiveManagerId}
                  onChange={(event) => {
                    setSelectedManagerId(event.target.value);
                    setSelectedTalentKey(null);
                  }}
                >
                  <option value="all">All managers</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Talent</th>
                    <th>Email</th>
                    <th>Manager</th>
                    <th>Submitted revenue</th>
                    <th>Transfer roster to</th>
                    <th>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((row) => (
                      <tr key={row.key} className={activeTalentKey === row.key ? "selected-row" : ""}>
                        <td>
                          <button
                            className="table-link"
                            data-talent-detail={row.key}
                            onClick={() => setSelectedTalentKey(row.key)}
                          >
                            {row.talentName}
                          </button>
                        </td>
                        <td>
                          <input
                            className="mini-input"
                            data-talent-email={row.key}
                            type="email"
                            defaultValue={talentEmail()}
                            placeholder="talent@email.com"
                            aria-label={`${row.talentName} email`}
                          />
                        </td>
                        <td>{managerName(row.managerId)}</td>
                        <td>{money(row.total)}</td>
                        <td>
                          <select className="compact-select" data-transfer-talent={row.key} defaultValue={row.managerId}>
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button className="secondary danger-button" data-remove-talent={row.key}>
                            Remove talent
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        No talent added {allSelected ? "yet" : `for ${managerName(effectiveManagerId)} yet`}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="section">
            <div className="section-head">
              <h2>Add talent</h2>
            </div>
            <div className="section-body">
              <form className="talent-form">
                <div className="field">
                  <label htmlFor="adminAddTalentManager">Talent manager</label>
                  <select id="adminAddTalentManager" name="managerId" defaultValue={addTalentDefaultManager}>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newTalentNameAdmin">Talent name</label>
                  <input id="newTalentNameAdmin" name="talentName" required placeholder="Talent name" />
                </div>
                <div className="field">
                  <label htmlFor="newTalentEmailAdmin">Talent email</label>
                  <input id="newTalentEmailAdmin" name="talentEmail" type="email" placeholder="talent@email.com" />
                </div>
                <button className="primary" type="submit" onClick={(event) => event.preventDefault()}>
                  Add talent
                </button>
              </form>
              <div className="notice soft-note">
                Transferring talent moves them between manager rosters for future dropdowns. Existing submitted deal
                revenue remains with the original submitting manager for commission.
              </div>
            </div>
          </section>
          <section className="section">
            <div className="section-head">
              <h2>{selectedTalent ? `${selectedTalent.talentName} deals` : "Talent deals"}</h2>
              {selectedTalent ? <span className="pill">{managerName(selectedTalent.managerId)}</span> : null}
            </div>
            <div className="section-body manager-list">
              {selectedTalent ? (
                <DealCards deals={selectedTalentDeals} />
              ) : (
                <div className="notice">Click a talent name in the roster to see all of their deals.</div>
              )}
            </div>
            {selectedTalent ? (
              <div className="section-body">
                <TalentMonthlyDealsTable deals={selectedTalentDeals} />
              </div>
            ) : null}
          </section>
        </div>
        <div className="section-stack">
          {selectedTalent ? (
            <>
              <TalentProfileSection
                managerId={selectedTalent.managerId}
                talentName={selectedTalent.talentName}
              />
              <section className="section">
                <TalentInvoiceDetailsForm
                  managerId={selectedTalent.managerId}
                  talentName={selectedTalent.talentName}
                />
              </section>
            </>
          ) : (
            <section className="section">
              <div className="section-body">
                <div className="notice">Click a talent name to edit their profile and invoicing details.</div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
