"use client";

import { months, money, sum } from "@/lib/format";
import {
  users,
  allDeals,
  defaultManagerSalaries,
  defaultCommissionRates,
  roleLabel,
  Profile,
} from "@/lib/mock";
import { dealRevenue } from "@/lib/pl";

// Derived helpers mirrored from the prototype (app.js).
function managerSalary(managerId: string): number {
  return Number(defaultManagerSalaries[managerId] ?? 5000);
}

function managerCommissionRate(managerId: string): number {
  return Number(defaultCommissionRates[managerId] ?? 1);
}

function monthlyManagerRevenue(managerId: string): number[] {
  return dealRevenue("live", managerId);
}

function monthlyManagerCommission(managerId: string): number[] {
  const salary = managerSalary(managerId);
  const threshold = salary * 5;
  const rate = managerCommissionRate(managerId) / 100;
  const ownCommission = monthlyManagerRevenue(managerId).map((revenue) =>
    revenue > threshold ? revenue * rate : 0
  );
  // No commission overrides seeded — shared commission is zero on first load.
  const sharedCommission = months.map(() => 0);
  return months.map((_, index) => ownCommission[index] + sharedCommission[index]);
}

export default function ManagersView() {
  // Admin + Operations own this view in the prototype.
  const canAdminister: boolean = true;

  // allStaffRecords() = non-admin seed users + extraManagers (empty on first load).
  const activeStaff: Profile[] = users.filter((user) => user.role !== "admin");
  const removedStaff: Profile[] = [];

  const noop = () => {};

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Team</h1>
        </div>
        <div className="asof">
          {canAdminister
            ? "Add staff, invite Google logins, and manage access"
            : "Team members and portal access"}
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
                  <th>Invite</th>
                  <th>Salary</th>
                  <th>Commission %</th>
                  <th>Confirmed revenue</th>
                  <th>Commission</th>
                  <th>Deals</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff.map((member) => {
                  const isManager = member.role === "manager";
                  // canInvite requires the member to be in extraManagers (empty on first load).
                  const canInvite = false;
                  const inviteStatusText =
                    member.role === "manager" || member.role === "finance"
                      ? "Active prototype login"
                      : "Active";
                  return (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{roleLabel(member.role)}</td>
                      <td>{member.email || "-"}</td>
                      <td>
                        {canInvite ? (
                          <button className="secondary" type="button" onClick={noop}>
                            Send invite
                          </button>
                        ) : null}
                        <small>{inviteStatusText}</small>
                      </td>
                      <td>{isManager ? money(managerSalary(member.id)) : "-"}</td>
                      <td>{isManager ? `${managerCommissionRate(member.id)}%` : "-"}</td>
                      <td>
                        {isManager
                          ? money(sum(monthlyManagerRevenue(member.id)))
                          : "-"}
                      </td>
                      <td>
                        {isManager
                          ? money(sum(monthlyManagerCommission(member.id)))
                          : "-"}
                      </td>
                      <td>
                        {isManager
                          ? allDeals.filter((deal) => deal.managerId === member.id).length
                          : "-"}
                      </td>
                      <td>
                        {canAdminister ? (
                          <button
                            className="secondary danger-button"
                            type="button"
                            onClick={noop}
                          >
                            Remove access
                          </button>
                        ) : (
                          "View only"
                        )}
                      </td>
                    </tr>
                  );
                })}
                {removedStaff.length
                  ? removedStaff.map((member) => (
                      <tr className="selected-row" key={member.id}>
                        <td>{member.name}</td>
                        <td>{roleLabel(member.role)}</td>
                        <td colSpan={7}>
                          Removed from portal login. Historical records are kept.
                        </td>
                        <td>
                          {canAdminister ? (
                            <button className="secondary" type="button" onClick={noop}>
                              Restore access
                            </button>
                          ) : (
                            "Removed"
                          )}
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>

        {canAdminister ? (
          <section className="section">
            <div className="section-head">
              <h2>Add staff member</h2>
            </div>
            <div className="section-body">
              <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
                <div className="field">
                  <label htmlFor="newManagerName">Name</label>
                  <input
                    id="newManagerName"
                    name="managerName"
                    required
                    placeholder="Team member name"
                  />
                </div>
                <div className="field">
                  <label htmlFor="newStaffRole">Role</label>
                  <select id="newStaffRole" name="role" defaultValue="manager">
                    <option value="manager">Talent manager</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="newManagerEmail">Google account email</label>
                  <input
                    id="newManagerEmail"
                    name="email"
                    required
                    type="email"
                    placeholder="name@company.com"
                  />
                </div>
                <div className="field">
                  <label htmlFor="newManagerSalary">Monthly salary</label>
                  <input
                    id="newManagerSalary"
                    name="salary"
                    inputMode="decimal"
                    defaultValue="£5,000.00"
                  />
                </div>
                <div className="field">
                  <label htmlFor="newManagerRate">Commission %</label>
                  <input
                    id="newManagerRate"
                    name="commissionRate"
                    type="number"
                    min="0"
                    step="0.1"
                    defaultValue="1"
                  />
                </div>
                <button className="primary wide" type="submit">
                  Add staff member and create login
                </button>
              </form>
              <div className="notice soft-note">
                Salary and commission are used for talent managers. Finance and Operations
                get portal access without owning a roster.
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
