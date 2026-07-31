"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  useGetUsersQuery,
  useApproveUserMutation,
  useRejectUserMutation,
  useSetUserStatusMutation,
  useSetUserRoleMutation,
  useSetUserLineManagerMutation,
} from "@/redux/api/userApi";
import { roleLabel, type Profile, type Role } from "@/lib/mock";
import { refId } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const assignableRoles: Role[] = ["admin", "finance", "operations", "production", "manager"];

function statusPillClass(status: string): string {
  if (status === "active") return "status-pill status-active";
  if (status === "pending") return "status-pill status-pending";
  return "status-pill status-disabled";
}

// Permissions screen. The top two sections (New user requests, Team directory) are
// fully functional against the account directory in redux — approving a signup here
// is what lets that person actually log in. The lower three sections
// (teamAccessAdminView, requestDelegationAdminView, approvalRoutesAdminView) remain
// prototype placeholders that default to empty on first load.

export default function PermissionsView() {
  const currentUser = useSelector((s: RootState) => s.session.user);

  // Only admin / operations may administer access & approvals.
  const canAdminister = currentUser?.role === "admin" || currentUser?.role === "operations";

  // Live account directory from the backend (Creators portal only).
  const { data: creatorAccounts = [], isLoading } = useGetUsersQuery({ portal: "creators" });
  const [approveUser] = useApproveUserMutation();
  const [rejectUser] = useRejectUserMutation();
  const [setUserStatus] = useSetUserStatusMutation();
  const [setUserRole] = useSetUserRoleMutation();
  const [setUserLineManager, { isLoading: savingLine }] = useSetUserLineManagerMutation();
  const [lineForm, setLineForm] = useState({ memberId: "", lineManagerId: "" });
  const confirm = useConfirm();
  const toast = useToast();

  const pendingAccounts = creatorAccounts.filter((a) => a.status === "pending");
  const activeAndDisabled = creatorAccounts.filter((a) => a.status !== "pending");

  // Per-row role choice for pending approvals (defaults to the requested role).
  const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({});
  const roleFor = (id: string, fallback: Role): Role => roleChoice[id] ?? fallback;

  // Live managers (for the lower routing/delegation placeholder sections).
  const managerUsers: Profile[] = activeAndDisabled
    .filter((a) => a.role === "manager" && a.status === "active")
    .map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      email: a.email,
      lineManagerId: refId(a.lineManager || undefined) || undefined,
    }));
  const teamMembers: Profile[] = managerUsers;
  const approvers: Profile[] = managerUsers;

  // Live reporting lines, read straight off the accounts.
  const lineReportRows = managerUsers
    .filter((m) => m.lineManagerId)
    .map((m) => ({ reportManagerId: m.id, lineManagerId: m.lineManagerId as string }));
  const automaticRows: { lineManagerId: string; reportManagerId: string }[] = [];
  const explicitRows: { delegatorManagerId: string; targetManagerId: string }[] = [];

  const managerName = (id: string): string => {
    if (id === "admin") return "Admin";
    return teamMembers.find((user) => user.id === id)?.name || "Unassigned";
  };

  const handleSetLineManager = async (event: React.FormEvent) => {
    event.preventDefault();
    const memberId = lineForm.memberId || teamMembers[0]?.id;
    if (!memberId) return toast.error("Add a manager to the team first.");
    try {
      await setUserLineManager({ id: memberId, lineManager: lineForm.lineManagerId }).unwrap();
      toast.success(
        lineForm.lineManagerId
          ? `${managerName(memberId)} now reports to ${managerName(lineForm.lineManagerId)}.`
          : `Cleared ${managerName(memberId)}'s reporting line.`,
      );
      setLineForm({ memberId: "", lineManagerId: "" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not set that reporting line."));
    }
  };

  const handleClearLineManager = async (memberId: string) => {
    const ok = await confirm({
      tone: "danger",
      title: "Remove reporting line?",
      confirmLabel: "Remove",
      message: (
        <>
          <strong>{managerName(memberId)}</strong> will no longer report to anyone, and their line
          manager will stop seeing their commission.
        </>
      ),
    });
    if (!ok) return;
    try {
      await setUserLineManager({ id: memberId, lineManager: "" }).unwrap();
      toast.success("Reporting line removed.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not remove that reporting line."));
    }
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

      {/* New user requests — approve or reject signups */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>New user requests</h2>
          <span className="pill admin">{pendingAccounts.length} pending</span>
        </div>
        <div className="section-body">
          <div className="notice">
            People who sign up start as <b>pending</b> and cannot log in until approved here. Set their role,
            then approve — or reject to remove the request.
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Requested role</th>
                <th>Assign role</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingAccounts.length ? (
                pendingAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>{roleLabel(account.role)}</td>
                    <td>
                      <select
                        className="compact-select"
                        value={roleFor(account.id, account.role)}
                        disabled={!canAdminister}
                        onChange={(e) =>
                          setRoleChoice((prev) => ({ ...prev, [account.id]: e.target.value as Role }))
                        }
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {canAdminister ? (
                        <div className="row-actions">
                          <button
                            className="primary small"
                            type="button"
                            onClick={() =>
                              approveUser({ id: account.id, role: roleFor(account.id, account.role) })
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="secondary danger-button small"
                            type="button"
                            onClick={() => rejectUser(account.id)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        "View only"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    {isLoading ? "Loading…" : "No pending requests. New sign-ups will appear here."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Team directory — all approved accounts */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>Team directory</h2>
          <span className="pill">{activeAndDisabled.length} accounts</span>
        </div>
        <div className="section-body">
          <div className="notice">
            Everyone with a Creators account. Change a role, or disable someone to block sign-in without deleting
            their account.
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeAndDisabled.map((account) => {
                const isSelf = account.id === currentUser?.id;
                return (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>
                      <select
                        className="compact-select"
                        value={account.role}
                        disabled={!canAdminister || isSelf}
                        onChange={(e) =>
                          setUserRole({ id: account.id, role: e.target.value as Role })
                        }
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={statusPillClass(account.status)}>{account.status}</span>
                    </td>
                    <td>
                      {canAdminister && !isSelf ? (
                        account.status === "active" ? (
                          <button
                            className="secondary danger-button small"
                            type="button"
                            onClick={() => setUserStatus({ id: account.id, status: "disabled" })}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            className="primary small"
                            type="button"
                            onClick={() => setUserStatus({ id: account.id, status: "active" })}
                          >
                            Enable
                          </button>
                        )
                      ) : (
                        isSelf ? "You" : "View only"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Team CRM and report access */}
      <section className="section soft-section">
        <div className="section-head">
          <h2>Team CRM and report access</h2>
          {canAdminister ? <span className="pill admin">Admin + Operations</span> : null}
        </div>
        <div className="section-body">
          <div className="notice">
            Set who each manager reports to. A manager sees their own commission sheet plus the
            commission of everyone reporting to them — nobody else&apos;s.
          </div>
          {canAdminister ? (
            <form className="form-grid" onSubmit={handleSetLineManager}>
              <div className="field">
                <label htmlFor="lineReportMember">Team member</label>
                <select
                  id="lineReportMember"
                  value={lineForm.memberId || teamMembers[0]?.id || ""}
                  onChange={(e) => setLineForm({ ...lineForm, memberId: e.target.value })}
                >
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {roleLabel(member.role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="lineReportManager">Reports to</label>
                <select
                  id="lineReportManager"
                  value={lineForm.lineManagerId}
                  onChange={(e) => setLineForm({ ...lineForm, lineManagerId: e.target.value })}
                >
                  <option value="">Nobody (clear)</option>
                  {managerUsers
                    .filter((m) => m.id !== (lineForm.memberId || teamMembers[0]?.id))
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                </select>
              </div>
              <button className="primary wide" type="submit" disabled={savingLine}>
                {savingLine ? "Saving…" : "Set reporting line"}
              </button>
            </form>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>Reports to</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {lineReportRows.length ? (
                lineReportRows.map((row) => (
                  <tr key={row.reportManagerId}>
                    <td>{managerName(row.reportManagerId)}</td>
                    <td>{managerName(row.lineManagerId)}</td>
                    <td>
                      {canAdminister ? (
                        <button
                          className="secondary danger-button"
                          type="button"
                          onClick={() => handleClearLineManager(row.reportManagerId)}
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
                  <td colSpan={3}>No reporting lines set yet.</td>
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
