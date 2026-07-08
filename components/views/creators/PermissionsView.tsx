"use client";

import { managers, roleLabel, type Profile } from "@/lib/mock";

// UI-only rebuild of the prototype permissionsView (app.js ~line 3143) and its
// three sub-panels: teamAccessAdminView, requestDelegationAdminView, approvalRoutesAdminView.
// Static data: line reports, request delegation permissions and approval routes all
// default to empty on first load, so every table renders its prototype empty state.
// Current user is Admin, so canAdminister is true (admin + operations can administer).

const managerUsers: Profile[] = managers;
const operationsUsers: Profile[] = [];

export default function PermissionsView() {
  const teamMembers: Profile[] = [...managerUsers, ...operationsUsers];
  const approvers: Profile[] = [...managerUsers, ...operationsUsers];
  const canAdminister = true;

  // Derived rows — all empty on first load.
  const lineReportRows: { lineManagerId: string; reportManagerId: string }[] = [];
  const automaticRows: { lineManagerId: string; reportManagerId: string }[] = [];
  const explicitRows: { delegatorManagerId: string; targetManagerId: string }[] = [];

  const managerName = (id: string): string => {
    if (id === "admin") return "Admin";
    return teamMembers.find((user) => user.id === id)?.name || "Unassigned";
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Permissions</h1>
        </div>
        <div className="asof">Team access and approval routing controls</div>
      </div>

      {/* Team CRM and report access */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>Team CRM and report access</h2>
          {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
        </div>
        <div className="section-body">
          <div className="notice">
            Use this for talent assistants or line managers who need to see another manager&apos;s CRM and Reports
            without becoming admin.
          </div>
          {canAdminister ? (
            <form className="form-grid" data-line-report-form onSubmit={(e) => e.preventDefault()}>
              <div className="field">
                <label htmlFor="lineManagerId">Team member</label>
                <select id="lineManagerId" name="lineManagerId">
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {roleLabel(member.role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="reportManagerId">Can access manager</label>
                <select id="reportManagerId" name="reportManagerId">
                  {managerUsers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary wide" type="submit">
                Grant CRM and Reports access
              </button>
            </form>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>CRM and Reports access</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {lineReportRows.length ? (
                lineReportRows.map((row) => (
                  <tr key={`${row.lineManagerId}::${row.reportManagerId}`}>
                    <td>{managerName(row.lineManagerId)}</td>
                    <td>{managerName(row.reportManagerId)}</td>
                    <td>
                      {canAdminister ? (
                        <button
                          className="secondary danger-button"
                          data-remove-line-report={`${row.lineManagerId}::${row.reportManagerId}`}
                        >
                          Remove
                        </button>
                      ) : (
                        "View only"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>No line report access added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Request delegation access */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>Request delegation access</h2>
          {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
        </div>
        <div className="section-body">
          <div className="notice">
            Line managers can automatically delegate PR and event requests to the managers they manage. Use this
            section only for extra delegation access across the team.
          </div>
          {canAdminister ? (
            <form className="form-grid" data-request-delegation-form onSubmit={(e) => e.preventDefault()}>
              <div className="field">
                <label htmlFor="requestDelegatorId">Team member can delegate</label>
                <select id="requestDelegatorId" name="delegatorManagerId">
                  {managerUsers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="requestTargetId">To manager</label>
                <select id="requestTargetId" name="targetManagerId">
                  {managerUsers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary wide" type="submit">
                Grant request delegation access
              </button>
            </form>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Can delegate</th>
                <th>To manager</th>
                <th>Access type</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {automaticRows.map((row) => (
                <tr key={`auto-${row.lineManagerId}::${row.reportManagerId}`}>
                  <td>{managerName(row.lineManagerId)}</td>
                  <td>{managerName(row.reportManagerId)}</td>
                  <td>Automatic line manager access</td>
                  <td>Managed in Team CRM and report access</td>
                </tr>
              ))}
              {explicitRows.map((row) => (
                <tr key={`explicit-${row.delegatorManagerId}::${row.targetManagerId}`}>
                  <td>{managerName(row.delegatorManagerId)}</td>
                  <td>{managerName(row.targetManagerId)}</td>
                  <td>Admin granted</td>
                  <td>
                    {canAdminister ? (
                      <button
                        className="secondary danger-button"
                        data-remove-request-delegation={`${row.delegatorManagerId}::${row.targetManagerId}`}
                      >
                        Remove
                      </button>
                    ) : (
                      "View only"
                    )}
                  </td>
                </tr>
              ))}
              {automaticRows.length || explicitRows.length ? null : (
                <tr>
                  <td colSpan={4}>No request delegation access set up yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deal approval routing */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>Deal approval routing</h2>
          {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
        </div>
        <div className="section-body">
          <div className="notice">
            If no approval route is set, a deal goes to the manager&apos;s line manager. If they do not have a line
            manager, it goes to Admin.
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Submitting manager</th>
                <th>Approver</th>
                <th>Default route</th>
              </tr>
            </thead>
            <tbody>
              {managerUsers.map((manager) => (
                <tr key={manager.id}>
                  <td>{manager.name}</td>
                  <td>
                    <select className="compact-select" data-approval-route={manager.id} disabled={!canAdminister} defaultValue="">
                      <option value="">Use default</option>
                      <option value="admin">Admin</option>
                      {approvers
                        .filter((approver) => approver.id !== manager.id)
                        .map((approver) => (
                          <option key={approver.id} value={approver.id}>
                            {approver.name} - {roleLabel(approver.role)}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>{managerName("admin")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
