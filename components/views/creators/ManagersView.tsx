"use client";

import { months, money, sum } from "@/lib/format";
import { roleLabel, Profile, Deal } from "@/lib/mock";
import { dealRevenue } from "@/lib/pl";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetSettingsQuery } from "@/redux/api/settingsApi";
import { toDeal } from "@/lib/adapters";

export default function ManagersView() {
  const canAdminister = true;
  const { users } = useCreatorsTeam();
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: settings } = useGetSettingsQuery();
  const deals: Deal[] = dealData.map(toDeal);

  const managerSalary = (id: string) => Number(settings?.managerSalaries?.[id] ?? 0);
  const managerCommissionRate = (id: string) => Number(settings?.commissionRates?.[id] ?? 0);
  const monthlyManagerRevenue = (id: string) => dealRevenue(deals, "live", id);
  const monthlyManagerCommission = (id: string) => {
    const threshold = managerSalary(id) * 5;
    const rate = managerCommissionRate(id) / 100;
    const own = monthlyManagerRevenue(id).map((rev) => (rev > threshold ? rev * rate : 0));
    return months.map((_, i) => own[i]);
  };

  const activeStaff: Profile[] = users.filter((user) => user.role !== "admin");
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

      <div className="layout">
        <section className="section">
          <div className="section-head">
            <h2>Team overview</h2>
            {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
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
                        <td>{isManager ? money(managerSalary(member.id)) : "-"}</td>
                        <td>{isManager ? `${managerCommissionRate(member.id)}%` : "-"}</td>
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
      </div>
    </>
  );
}
