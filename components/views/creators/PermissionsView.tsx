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
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/redux/api/settingsApi";
import { roleLabel, type Profile, type Role } from "@/lib/mock";
import { refId, TALENT_MANAGER_ROLES } from "@/lib/adapters";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { apiErrorMessage, useToast } from "@/components/ui/Toast";

const assignableRoles: Role[] = ["admin", "finance", "operations", "production", "manager"];

/** Sentinel stored in approvalRoutes meaning "an admin, whoever that is". */
const ROUTE_ADMIN = "admin";

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
  const { data: settings } = useGetSettingsQuery();
  const [approveUser] = useApproveUserMutation();
  const [rejectUser] = useRejectUserMutation();
  const [setUserStatus] = useSetUserStatusMutation();
  const [setUserRole] = useSetUserRoleMutation();
  const [setUserLineManager, { isLoading: savingLine }] = useSetUserLineManagerMutation();
  const [updateSettings] = useUpdateSettingsMutation();
  const [lineForm, setLineForm] = useState({ memberId: "", lineManagerId: "" });
  const confirm = useConfirm();
  const toast = useToast();

  /*
   * Which row is mid-request. Every action on this screen is one row's action,
   * so a single "saving" flag would grey out the whole table — the key is
   * `${action}:${userId}` and only that button shows a spinner.
   */
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const isBusy = (key: string) => Boolean(busy[key]);
  const runRow = async (key: string, action: () => Promise<unknown>) => {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      await action();
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[key];
        return next;
      });
    }
  };

  const pendingAccounts = creatorAccounts.filter((a) => a.status === "pending");
  const activeAndDisabled = creatorAccounts.filter((a) => a.status !== "pending");

  // Per-row role choice for pending approvals (defaults to the requested role).
  const [roleChoice, setRoleChoice] = useState<Record<string, Role>>({});
  const roleFor = (id: string, fallback: Role): Role => roleChoice[id] ?? fallback;

  const asProfile = (a: (typeof creatorAccounts)[number]): Profile => ({
    id: a.id,
    name: a.name,
    role: a.role,
    email: a.email,
    lineManagerId: refId(a.lineManager || undefined) || undefined,
  });

  /*
   * Everyone still active. Reporting lines used to be offered only for the
   * `manager` role, which meant a talent manager sitting on the admin role —
   * how the client runs the portal — could not be given a line manager at all,
   * and so their signed deals had nobody to route to.
   */
  const activeUsers: Profile[] = activeAndDisabled
    .filter((a) => a.status === "active")
    .map(asProfile);

  // The people who carry deals, and therefore have deals to route.
  const managerUsers: Profile[] = activeUsers.filter((u) =>
    (TALENT_MANAGER_ROLES as readonly string[]).includes(u.role),
  );
  const teamMembers: Profile[] = activeUsers;
  const approvers: Profile[] = activeUsers;

  // Live reporting lines, read straight off the accounts.
  const lineReportRows = activeUsers
    .filter((m) => m.lineManagerId)
    .map((m) => ({ reportManagerId: m.id, lineManagerId: m.lineManagerId as string }));
  /*
   * Delegation that already exists by virtue of the reporting lines above — a
   * line manager can act for the people who report to them. Showing it here
   * saves anyone hunting for a switch that was never needed.
   */
  const automaticRows = lineReportRows.map((row) => ({
    lineManagerId: row.lineManagerId,
    reportManagerId: row.reportManagerId,
  }));
  const explicitRows: { delegatorManagerId: string; targetManagerId: string }[] = [];

  const managerName = (id: string): string => {
    if (id === ROUTE_ADMIN) return "Admin";
    return activeUsers.find((user) => user.id === id)?.name || "Unassigned";
  };

  // ---------------------------------------------------------------------------
  // Deal approval routing
  // ---------------------------------------------------------------------------
  const approvalRoutes = settings?.approvalRoutes || {};

  /**
   * Where a Contract Signed deal from this manager will actually land, said in
   * words. This table used to show "Admin" for everybody whatever was set,
   * which is what the client read as "all talent managers are set to admin" —
   * and then no deal arrived, because nothing on this screen was ever saved.
   */
  const routeDestination = (manager: Profile): string => {
    const route = approvalRoutes[manager.id] || "";
    if (route === ROUTE_ADMIN) return "An admin";
    if (route) return `${managerName(route)} (set here)`;
    if (manager.lineManagerId) return `${managerName(manager.lineManagerId)} (line manager)`;
    return "An admin (no line manager set)";
  };

  const handleSetRoute = async (manager: Profile, route: string) => {
    await runRow(`route:${manager.id}`, async () => {
      try {
        await updateSettings({ approvalRoutes: { [manager.id]: route } }).unwrap();
        toast.success(
          route === ROUTE_ADMIN
            ? `${manager.name}'s deals now go to an admin.`
            : route
              ? `${manager.name}'s deals now go to ${managerName(route)}.`
              : `${manager.name}'s deals now follow their line manager.`,
        );
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not save that approval route."));
      }
    });
  };

  const handleSetLineManager = async (event: React.FormEvent) => {
    event.preventDefault();
    const memberId = lineForm.memberId || teamMembers[0]?.id;
    if (!memberId) return toast.error("Add a manager to the team first.");
    try {
      await setUserLineManager({ id: memberId, lineManager: lineForm.lineManagerId }).unwrap();
      toast.success(
        lineForm.lineManagerId
          ? `${managerName(memberId)} now reports to ${managerName(lineForm.lineManagerId)}. Their deals awaiting approval have moved across.`
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
    await runRow(`line:${memberId}`, async () => {
      try {
        await setUserLineManager({ id: memberId, lineManager: "" }).unwrap();
        toast.success("Reporting line removed.");
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not remove that reporting line."));
      }
    });
  };

  const handleApproveUser = async (id: string, name: string, role: Role) => {
    await runRow(`approve:${id}`, async () => {
      try {
        await approveUser({ id, role }).unwrap();
        toast.success(`${name} approved as ${roleLabel(role)} and can now sign in.`);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not approve that account."));
      }
    });
  };

  const handleRejectUser = async (id: string, name: string) => {
    const ok = await confirm({
      tone: "danger",
      title: "Reject this sign-up?",
      confirmLabel: "Reject",
      message: (
        <>
          <strong>{name}</strong>&apos;s request will be removed. They can sign up again later with
          the same email.
        </>
      ),
    });
    if (!ok) return;
    await runRow(`reject:${id}`, async () => {
      try {
        await rejectUser(id).unwrap();
        toast.success(`${name}'s request was rejected.`);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not reject that request."));
      }
    });
  };

  const handleSetRole = async (id: string, name: string, role: Role) => {
    await runRow(`role:${id}`, async () => {
      try {
        await setUserRole({ id, role }).unwrap();
        toast.success(`${name} is now ${roleLabel(role)}.`);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not change that role."));
      }
    });
  };

  const handleSetStatus = async (id: string, name: string, status: "active" | "disabled") => {
    if (status === "disabled") {
      const ok = await confirm({
        tone: "danger",
        title: "Disable this account?",
        confirmLabel: "Disable",
        message: (
          <>
            <strong>{name}</strong> will be signed out and blocked from logging in. Their deals and
            history stay untouched.
          </>
        ),
      });
      if (!ok) return;
    }
    await runRow(`status:${id}`, async () => {
      try {
        await setUserStatus({ id, status }).unwrap();
        toast.success(status === "active" ? `${name} can sign in again.` : `${name} is disabled.`);
      } catch (err) {
        toast.error(apiErrorMessage(err, "Could not change that account."));
      }
    });
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
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Requested role</th>
                <th className="text-left">Assign role</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingAccounts.length ? (
                pendingAccounts.map((account) => (
                  <tr key={account.id}>
                    <td className="text-left">{account.name}</td>
                    <td className="text-left">{account.email}</td>
                    <td className="text-left">{roleLabel(account.role)}</td>
                    <td className="text-left">
                      <select
                        className="compact-select"
                        value={roleFor(account.id, account.role)}
                        disabled={!canAdminister || isBusy(`approve:${account.id}`)}
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
                    <td className="text-left">
                      {canAdminister ? (
                        <div className="row-actions">
                          <button
                            className="primary small"
                            type="button"
                            disabled={isBusy(`approve:${account.id}`) || isBusy(`reject:${account.id}`)}
                            onClick={() =>
                              handleApproveUser(
                                account.id,
                                account.name,
                                roleFor(account.id, account.role),
                              )
                            }
                          >
                            {isBusy(`approve:${account.id}`) ? "Approving…" : "Approve"}
                          </button>
                          <button
                            className="secondary danger-button small"
                            type="button"
                            disabled={isBusy(`approve:${account.id}`) || isBusy(`reject:${account.id}`)}
                            onClick={() => handleRejectUser(account.id, account.name)}
                          >
                            {isBusy(`reject:${account.id}`) ? "Rejecting…" : "Reject"}
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
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Role</th>
                <th className="text-left">Status</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {activeAndDisabled.map((account) => {
                const isSelf = account.id === currentUser?.id;
                return (
                  <tr key={account.id}>
                    <td className="text-left">{account.name}</td>
                    <td className="text-left">{account.email}</td>
                    <td className="text-left">
                      <select
                        className="compact-select"
                        value={account.role}
                        disabled={!canAdminister || isSelf || isBusy(`role:${account.id}`)}
                        onChange={(e) =>
                          handleSetRole(account.id, account.name, e.target.value as Role)
                        }
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>
                            {roleLabel(r)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-left">
                      <span className={statusPillClass(account.status)}>{account.status}</span>
                    </td>
                    <td className="text-left">
                      {canAdminister && !isSelf ? (
                        account.status === "active" ? (
                          <button
                            className="secondary danger-button small"
                            type="button"
                            disabled={isBusy(`status:${account.id}`)}
                            onClick={() => handleSetStatus(account.id, account.name, "disabled")}
                          >
                            {isBusy(`status:${account.id}`) ? "Disabling…" : "Disable"}
                          </button>
                        ) : (
                          <button
                            className="primary small"
                            type="button"
                            disabled={isBusy(`status:${account.id}`)}
                            onClick={() => handleSetStatus(account.id, account.name, "active")}
                          >
                            {isBusy(`status:${account.id}`) ? "Enabling…" : "Enable"}
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
            Set who each person reports to. This is also the default approver for their deals: when
            a deal reaches <b>Contract Signed</b> it goes straight to their line manager&apos;s
            Approvals tab. A manager sees their own commission sheet plus the commission of everyone
            reporting to them — nobody else&apos;s.
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
                  {approvers
                    .filter((m) => m.id !== (lineForm.memberId || teamMembers[0]?.id))
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} - {roleLabel(manager.role)}
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
                          disabled={isBusy(`line:${row.reportManagerId}`)}
                          onClick={() => handleClearLineManager(row.reportManagerId)}
                        >
                          {isBusy(`line:${row.reportManagerId}`) ? "Removing…" : "Remove"}
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
            <form
              className="form-grid"
              data-request-delegation-form
              onSubmit={(e) => {
                e.preventDefault();
                toast.info(
                  "Extra delegation is not switched on yet — set the reporting line above and the line manager can already act for their reports.",
                );
              }}
            >
              <div className="field">
                <label htmlFor="requestDelegatorId">Team member can delegate</label>
                <select id="requestDelegatorId" name="delegatorManagerId" disabled>
                  {managerUsers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="requestTargetId">To manager</label>
                <select id="requestTargetId" name="targetManagerId" disabled>
                  {managerUsers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Deliberately inert: nothing behind this saves yet, and a button
                  that looks as though it did is worse than one that says so. */}
              <button className="primary wide" type="submit" disabled>
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
                  <td className="muted">Managed in Team CRM and report access</td>
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
            When a deal reaches <b>Contract Signed</b> it is sent to one person&apos;s Approvals tab.
            Leave a manager on <b>Use line manager</b> and it follows the reporting line set above;
            pick somebody here to override that. Only once the deal is approved does it count
            towards the P&amp;L and that manager&apos;s commission sheet.
            <br />
            Changing a route here also moves that manager&apos;s deals that are already waiting.
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Submitting manager</th>
                <th>Approver</th>
                <th>Deals currently go to</th>
              </tr>
            </thead>
            <tbody>
              {managerUsers.length ? (
                managerUsers.map((manager) => (
                  <tr key={manager.id}>
                    <td>
                      {manager.name}
                      <div className="muted">{roleLabel(manager.role)}</div>
                    </td>
                    <td>
                      <select
                        className="compact-select"
                        value={approvalRoutes[manager.id] || ""}
                        disabled={!canAdminister || isBusy(`route:${manager.id}`)}
                        onChange={(e) => handleSetRoute(manager, e.target.value)}
                      >
                        <option value="">Use line manager</option>
                        <option value={ROUTE_ADMIN}>Admin</option>
                        {approvers
                          .filter((approver) => approver.id !== manager.id)
                          .map((approver) => (
                            <option key={approver.id} value={approver.id}>
                              {approver.name} - {roleLabel(approver.role)}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>{isBusy(`route:${manager.id}`) ? "Saving…" : routeDestination(manager)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    {isLoading ? "Loading…" : "No talent managers yet — approve a sign-up above."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
