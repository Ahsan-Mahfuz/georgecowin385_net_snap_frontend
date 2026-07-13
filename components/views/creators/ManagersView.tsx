"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { months, money, sum } from "@/lib/format";
import { roleLabel, Profile, Deal } from "@/lib/mock";
import { dealRevenue } from "@/lib/pl";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/redux/api/settingsApi";
import { toDeal } from "@/lib/adapters";

export default function ManagersView() {
  const canAdminister = true;
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const { users } = useCreatorsTeam();
  const { data: dealData = [] } = useGetDealsQuery({ year: String(year) });
  const { data: settings } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const deals: Deal[] = dealData.map(toDeal);

  // Unsaved edits to salary / commission rate, keyed by manager id.
  const [salaryDraft, setSalaryDraft] = useState<Record<string, string>>({});
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});

  const savedSalary = (id: string) => Number(settings?.managerSalaries?.[id] ?? 0);
  const savedRate = (id: string) => Number(settings?.commissionRates?.[id] ?? 0);
  // Effective values use the draft if the admin has typed one, else the saved value.
  const managerSalary = (id: string) =>
    salaryDraft[id] !== undefined ? Number(salaryDraft[id] || 0) : savedSalary(id);
  const managerCommissionRate = (id: string) =>
    rateDraft[id] !== undefined ? Number(rateDraft[id] || 0) : savedRate(id);

  const monthlyManagerRevenue = (id: string) => dealRevenue(deals, "live", id);
  const monthlyManagerCommission = (id: string) => {
    const threshold = managerSalary(id) * 5;
    const rate = managerCommissionRate(id) / 100;
    const own = monthlyManagerRevenue(id).map((rev) => (rev > threshold ? rev * rate : 0));
    return months.map((_, i) => own[i]);
  };

  const activeStaff: Profile[] = users.filter((user) => user.role !== "admin");
  const hasChanges = Object.keys(salaryDraft).length > 0 || Object.keys(rateDraft).length > 0;

  const handleSave = async () => {
    const managerSalaries: Record<string, number> = {};
    const commissionRates: Record<string, number> = {};
    Object.entries(salaryDraft).forEach(([id, v]) => {
      managerSalaries[id] = Number(v || 0);
    });
    Object.entries(rateDraft).forEach(([id, v]) => {
      commissionRates[id] = Number(v || 0);
    });
    await updateSettings({ managerSalaries, commissionRates }).unwrap();
    setSalaryDraft({});
    setRateDraft({});
  };

  const noop = () => {};

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Team</h1>
        </div>
        <div className="asof">
          {canAdminister ? "Add staff, invite logins, and manage access" : "Team members and portal access"}
        </div>
      </div>

      <section className="section">
          <div className="section-head">
            <h2>Team overview</h2>
            <div className="section-actions">
              {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
              {canAdminister && saving ? (
                <button className="primary" type="button" disabled>
                  Saving…
                </button>
              ) : canAdminister && hasChanges ? (
                <button className="primary" type="button" onClick={handleSave}>
                  Save changes
                </button>
              ) : canAdminister ? (
                <span className="save-hint">All changes saved</span>
              ) : null}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Role</th>
                  <th>Email login</th>
                  <th>Salary</th>
                  <th>Commission %</th>
                  <th>Confirmed revenue</th>
                  <th>Commission</th>
                  <th>Deals</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.length ? (
                  activeStaff.map((member) => {
                    const isManager = member.role === "manager";
                    return (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{roleLabel(member.role)}</td>
                        <td>{member.email || "-"}</td>
                        <td>
                          {isManager ? (
                            <input
                              className="table-input cell-input"
                              type="number"
                              min="0"
                              step="1"
                              aria-label={`${member.name} monthly salary`}
                              value={salaryDraft[member.id] !== undefined ? salaryDraft[member.id] : String(savedSalary(member.id))}
                              onChange={(e) => setSalaryDraft({ ...salaryDraft, [member.id]: e.target.value })}
                            />
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {isManager ? (
                            <div className="input-suffix">
                              <input
                                className="table-input"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                aria-label={`${member.name} commission rate percent`}
                                value={rateDraft[member.id] !== undefined ? rateDraft[member.id] : String(savedRate(member.id))}
                                onChange={(e) => setRateDraft({ ...rateDraft, [member.id]: e.target.value })}
                              />
                              <span>%</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{isManager ? money(sum(monthlyManagerRevenue(member.id))) : "-"}</td>
                        <td>{isManager ? money(sum(monthlyManagerCommission(member.id))) : "-"}</td>
                        <td>{isManager ? deals.filter((d) => d.managerId === member.id).length : "-"}</td>
                        <td>
                          {canAdminister ? (
                            <button className="secondary danger-button" type="button" onClick={noop}>
                              Remove access
                            </button>
                          ) : (
                            "View only"
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9}>No team members yet. Approve sign-ups in Permissions to build your team.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </section>
    </>
  );
}
