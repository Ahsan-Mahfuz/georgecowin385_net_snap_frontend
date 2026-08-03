"use client";

import { useState } from "react";
import { months, money, sum } from "@/lib/format";
import { Deal } from "@/lib/mock";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import {
  useGetTalentsQuery,
  useCreateTalentMutation,
  useUpdateTalentMutation,
  useDeleteTalentMutation,
} from "@/redux/api/talentApi";
import { useGetDealsQuery, useGetXeroContactsQuery } from "@/redux/api/dealApi";
import { toDeal, refId } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

// This view reproduces the prototype's talentAdminView (admin / full-roster variant).

const ADMIN_EDITABLE = true; // role === "admin" => canAdminister

interface RosterRow {
  key: string;
  id: string; // Talent._id — needed to transfer or remove the record
  managerId: string;
  talentName: string;
  email: string;
  total: number;
  /** Linked Xero contact — bills for this talent are raised against it. */
  xeroContactId: string;
  xeroContactName: string;
  xeroBankAccount: string;
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

// Live data holders — set by the component at the top of each render so the
// module-level helpers below (used by sub-components too) read current data.
let liveUsers: { id: string; name: string }[] = [];
let liveTalents: ApiTalent[] = [];
let liveDeals: Deal[] = [];

function managerName(id: string): string {
  if (id === "admin") return "Admin";
  return liveUsers.find((u) => u.id === id)?.name || "Unassigned";
}

function rosterRowsForManager(managerId: string): RosterRow[] {
  return liveTalents
    .filter((t) => refId(t.manager) === managerId)
    .map((talent) => {
      const submittedDeals = liveDeals.filter(
        (deal) => deal.managerId === managerId && deal.talentName === talent.name,
      );
      return {
        key: talentKey(managerId, talent.name),
        id: talent._id,
        managerId,
        talentName: talent.name,
        email: talent.email || "",
        total: submittedDeals.reduce((total, deal) => total + sum(deal.monthValues), 0),
        xeroContactId: talent.xeroContactId || "",
        xeroContactName: talent.xeroContactName || "",
        xeroBankAccount: talent.xeroBankAccount || "",
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

function TalentProfileSection({ talent }: { talent?: ApiTalent | null }) {
  const [updateTalent, { isLoading: saving }] = useUpdateTalentMutation();
  const toast = useToast();

  const [bio, setBio] = useState(talent?.bio || "");
  const [imageUrl, setImageUrl] = useState(talent?.imageUrl || "");
  const [instagram, setInstagram] = useState(talent?.handles?.instagram || "");
  const [tiktok, setTiktok] = useState(talent?.handles?.tiktok || "");
  const [youtube, setYoutube] = useState(talent?.handles?.youtube || "");

  if (!talent) return null;

  const handleSaveProfile = async () => {
    try {
      await updateTalent({
        id: talent._id,
        body: {
          bio: bio.trim(),
          imageUrl: imageUrl.trim(),
          handles: { instagram: instagram.trim(), tiktok: tiktok.trim(), youtube: youtube.trim() },
        },
      }).unwrap();
      toast.success(`Profile saved for ${talent.name}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save profile."));
    }
  };

  return (
    <section className="section">
      <div className="section-head">
        <h2>Talent profile</h2>
        <span className="pill">Editable</span>
      </div>
      <div className="section-body">
        <div className="talent-profile-preview">
          <img src={imageUrl || generatedTalentImage(refId(talent.manager), talent.name)} alt={`${talent.name} preview`} />
          <div>
            <strong>{talent.name}</strong>
            <span>{managerName(refId(talent.manager))}</span>
          </div>
        </div>
        <div className="form-grid compact-action-grid">
          <div className="field wide">
            <label>About talent</label>
            <textarea
              rows={4}
              placeholder="Short media pack bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div className="field wide">
            <label>Preview image URL</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Paste profile image URL, or leave blank for generated preview"
            />
          </div>
          <div className="field">
            <label>Instagram handle</label>
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@instagram" />
          </div>
          <div className="field">
            <label>TikTok handle</label>
            <input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@tiktok" />
          </div>
          <div className="field">
            <label>YouTube handle</label>
            <input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="@youtube" />
          </div>
          <div className="field wide media-action-row">
            <button className="primary save-detail-button" type="button" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TalentInvoiceDetailsForm({ talent }: { talent?: ApiTalent | null }) {
  const [updateTalent, { isLoading: saving }] = useUpdateTalentMutation();
  const toast = useToast();

  const [invoiceName, setInvoiceName] = useState(talent?.invoiceName || talent?.name || "");
  const [invoiceEmail, setInvoiceEmail] = useState(talent?.invoiceEmail || talent?.email || "");
  const [invoiceAddress, setInvoiceAddress] = useState(talent?.invoiceAddress || "");
  const [bankName, setBankName] = useState(talent?.bankName || "");
  const [accountName, setAccountName] = useState(talent?.accountName || talent?.name || "");
  const [sortCode, setSortCode] = useState(talent?.sortCode || "");
  const [accountNumber, setAccountNumber] = useState(talent?.accountNumber || "");
  const [vatNumber, setVatNumber] = useState(talent?.vatNumber || "");

  if (!talent) return null;

  const handleSave = async () => {
    try {
      await updateTalent({
        id: talent._id,
        body: {
          invoiceName: invoiceName.trim(),
          invoiceEmail: invoiceEmail.trim(),
          invoiceAddress: invoiceAddress.trim(),
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          sortCode: sortCode.trim(),
          accountNumber: accountNumber.trim(),
          vatNumber: vatNumber.trim(),
        },
      }).unwrap();
      toast.success(`Invoicing details saved for ${talent.name}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save invoicing details."));
    }
  };

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
            value={invoiceName}
            onChange={(e) => setInvoiceName(e.target.value)}
            placeholder={talent.name}
          />
        </div>
        <div className="field">
          <label>Invoice email</label>
          <input
            type="email"
            value={invoiceEmail}
            onChange={(e) => setInvoiceEmail(e.target.value)}
            placeholder="talent@email.com"
          />
        </div>
        <div className="field wide">
          <label>Invoice address</label>
          <input
            value={invoiceAddress}
            onChange={(e) => setInvoiceAddress(e.target.value)}
            placeholder="Talent billing address"
          />
        </div>
        <div className="field">
          <label>Bank name</label>
          <input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="Bank name"
          />
        </div>
        <div className="field">
          <label>Name on account</label>
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder={talent.name}
          />
        </div>
        <div className="field">
          <label>Sort code</label>
          <input
            value={sortCode}
            onChange={(e) => setSortCode(e.target.value)}
            placeholder="00-00-00"
          />
        </div>
        <div className="field">
          <label>Account number</label>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="12345678"
          />
        </div>
        <div className="field">
          <label>VAT number</label>
          <input
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="field wide">
          <button className="primary save-detail-button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save invoicing details"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TalentView() {
  const { managers, users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const { data: dealData = [] } = useGetDealsQuery();
  const allDeals: Deal[] = dealData.map(toDeal);

  const confirm = useConfirm();
  const toast = useToast();
  const [createTalent, { isLoading: creating }] = useCreateTalentMutation();
  const [updateTalent] = useUpdateTalentMutation();
  const [deleteTalent] = useDeleteTalentMutation();
  // Empty when Xero is not connected — the column then reads "Xero not connected".
  const { data: xeroContacts = [] } = useGetXeroContactsQuery("creators");
  const [newTalentName, setNewTalentName] = useState("");
  const [newTalentEmail, setNewTalentEmail] = useState("");
  const [newTalentManager, setNewTalentManager] = useState("");

  // Publish live data to the module-level helpers before rendering children.
  liveUsers = users;
  liveTalents = talentData as ApiTalent[];
  liveDeals = allDeals;

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

  const addTalentDefaultManager =
    newTalentManager || (allSelected ? managers[0]?.id || "" : effectiveManagerId);

  const handleAddTalent = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newTalentName.trim();
    if (!name) return toast.error("Enter a talent name.");
    if (!addTalentDefaultManager) return toast.error("Add a talent manager to the team first.");
    // Names key the deal/commission joins, so a duplicate on the same roster would
    // silently merge two people's revenue.
    const clash = liveTalents.some(
      (t) =>
        refId(t.manager) === addTalentDefaultManager &&
        t.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (clash) return toast.error(`${name} is already on this manager's roster.`);
    try {
      await createTalent({
        name,
        email: newTalentEmail.trim() || undefined,
        manager: addTalentDefaultManager,
      }).unwrap();
      toast.success(`${name} added to the roster.`);
      setNewTalentName("");
      setNewTalentEmail("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not add talent."));
    }
  };

  // Saved on blur — a per-row Save button in every roster line would be noisier
  // than it is useful, and the field is a single value with no dependent state.
  const handleEmailSave = async (row: RosterRow, rawEmail: string) => {
    const email = rawEmail.trim();
    if (email === row.email) return;
    try {
      await updateTalent({ id: row.id, body: { email } }).unwrap();
      toast.success(email ? `Saved email for ${row.talentName}.` : `Cleared email for ${row.talentName}.`);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not save that email."));
    }
  };

  /**
   * Link a talent to the contact Finance already holds in Xero. Bills are then
   * raised against that contact, so the bank and tax details come from Xero
   * rather than being retyped here.
   */
  const handleXeroLink = async (row: RosterRow, name: string) => {
    const match = xeroContacts.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (!name.trim()) {
      if (!row.xeroContactId) return;
      await updateTalent({
        id: row.id,
        body: { xeroContactId: "", xeroContactName: "", xeroBankAccount: "", xeroTaxNumber: "" },
      }).unwrap().catch(() => null);
      return toast.success(`${row.talentName} unlinked from Xero.`);
    }
    if (!match) return toast.error(`No Xero contact called “${name}”. Pick one from the list.`);
    if (match.contactId === row.xeroContactId) return;
    try {
      await updateTalent({
        id: row.id,
        body: {
          xeroContactId: match.contactId,
          xeroContactName: match.name,
          xeroBankAccount: match.bankAccount,
          xeroTaxNumber: match.taxNumber,
          email: row.email || match.email || undefined,
        },
      }).unwrap();
      toast.success(
        match.bankAccount
          ? `${row.talentName} linked to ${match.name} — bank details pulled from Xero.`
          : `${row.talentName} linked to ${match.name}. No bank details on that Xero contact yet.`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not link that Xero contact."));
    }
  };

  const handleTransfer = async (row: RosterRow, toManagerId: string) => {
    if (!toManagerId || toManagerId === row.managerId) return;
    const ok = await confirm({
      tone: "default",
      title: "Transfer talent?",
      confirmLabel: "Transfer",
      message: (
        <>
          Move <strong>{row.talentName}</strong> from {managerName(row.managerId)} to{" "}
          <strong>{managerName(toManagerId)}</strong>. Revenue already submitted stays with the
          original manager for commission.
        </>
      ),
    });
    if (!ok) return;
    try {
      await updateTalent({ id: row.id, body: { manager: toManagerId } }).unwrap();
      toast.success(`${row.talentName} moved to ${managerName(toManagerId)}.`);
      setSelectedTalentKey(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not transfer talent."));
    }
  };

  const handleRemove = async (row: RosterRow) => {
    const dealCount = liveDeals.filter(
      (d) => d.managerId === row.managerId && d.talentName === row.talentName,
    ).length;
    const ok = await confirm({
      tone: "danger",
      title: "Remove talent?",
      confirmLabel: "Remove talent",
      message: (
        <>
          <strong>{row.talentName}</strong> will be removed from {managerName(row.managerId)}&rsquo;s
          roster and will no longer appear in deal or media pack dropdowns.
          {dealCount > 0 ? (
            <>
              {" "}
              Their <strong>{dealCount} submitted deal{dealCount === 1 ? "" : "s"}</strong> stay in the
              P&amp;L and reports.
            </>
          ) : null}
        </>
      ),
    });
    if (!ok) return;
    try {
      await deleteTalent(row.id).unwrap();
      toast.success(`${row.talentName} removed from the roster.`);
      if (selectedTalentKey === row.key) setSelectedTalentKey(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not remove talent."));
    }
  };

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
            {/* Shared by every row's Xero contact field. */}
            <datalist id="talent-xero-contacts">
              {xeroContacts.map((contact) => (
                <option value={contact.name} key={contact.contactId} />
              ))}
            </datalist>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Talent</th>
                    <th>Email</th>
                    <th>Xero contact</th>
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
                            key={`${row.id}-${row.email}`}
                            className="mini-input"
                            type="email"
                            defaultValue={row.email}
                            placeholder="talent@email.com"
                            aria-label={`${row.talentName} email`}
                            onBlur={(event) => handleEmailSave(row, event.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            key={`${row.id}-${row.xeroContactId}`}
                            className="mini-input"
                            list="talent-xero-contacts"
                            defaultValue={row.xeroContactName}
                            placeholder={xeroContacts.length ? "Link a Xero contact" : "Xero not connected"}
                            disabled={!xeroContacts.length}
                            aria-label={`${row.talentName} Xero contact`}
                            onBlur={(event) => handleXeroLink(row, event.target.value)}
                          />
                          {row.xeroContactId ? (
                            <small className="field-hint">
                              {row.xeroBankAccount ? `Bank ${row.xeroBankAccount}` : "No bank details in Xero"}
                            </small>
                          ) : null}
                        </td>
                        <td>{managerName(row.managerId)}</td>
                        <td>{money(row.total)}</td>
                        <td>
                          <select
                            className="compact-select"
                            aria-label={`Transfer ${row.talentName} to another manager`}
                            value={row.managerId}
                            onChange={(event) => handleTransfer(row, event.target.value)}
                          >
                            {managers.map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className="secondary danger-button"
                            type="button"
                            onClick={() => handleRemove(row)}
                          >
                            Remove talent
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>
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
              <form className="talent-form" onSubmit={handleAddTalent}>
                <div className="field">
                  <label htmlFor="adminAddTalentManager">Talent manager</label>
                  <select
                    id="adminAddTalentManager"
                    name="managerId"
                    value={addTalentDefaultManager}
                    onChange={(event) => setNewTalentManager(event.target.value)}
                  >
                    {managers.length ? (
                      managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No talent managers on the team yet</option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newTalentNameAdmin">Talent name</label>
                  <input
                    id="newTalentNameAdmin"
                    name="talentName"
                    required
                    placeholder="Talent name"
                    value={newTalentName}
                    onChange={(event) => setNewTalentName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="newTalentEmailAdmin">Talent email</label>
                  <input
                    id="newTalentEmailAdmin"
                    name="talentEmail"
                    type="email"
                    placeholder="talent@email.com"
                    value={newTalentEmail}
                    onChange={(event) => setNewTalentEmail(event.target.value)}
                  />
                </div>
                <button className="primary" type="submit" disabled={creating || !managers.length}>
                  {creating ? "Adding…" : "Add talent"}
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
                talent={(talentData as ApiTalent[]).find((t) => t._id === selectedTalent.id)}
              />
              <section className="section">
                <TalentInvoiceDetailsForm
                  talent={(talentData as ApiTalent[]).find((t) => t._id === selectedTalent.id)}
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
