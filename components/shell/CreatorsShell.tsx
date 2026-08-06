"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { logoutCreators, resetPortal } from "@/redux/features/session/sessionSlice";
import { creatorViewsByRole } from "@/config/navigation";
import { YearSwitcher } from "./YearSwitcher";
import { roleLabel } from "@/lib/mock";
import { money, months, currentMonthIndex } from "@/lib/format";
import { dealRevenue } from "@/lib/pl";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetApprovalsQuery } from "@/redux/api/approvalApi";
import { useGetProductionRequestsQuery } from "@/redux/api/productionRequestApi";
import { useGetSettingsQuery } from "@/redux/api/settingsApi";
import { toDeal } from "@/lib/adapters";
import { financeActionCount } from "@/lib/financeActions";

/**
 * How many things need doing on each screen. These drive the numbered badge in
 * the sidebar so nobody has to open a page to discover there is work waiting.
 */
function actionCountForView(
  viewId: string,
  pendingApprovals: number,
  financeActions: number,
  productionRequests: number,
): number {
  if (viewId === "approvals") return pendingApprovals;
  if (viewId === "finance-actions") return financeActions;
  // Production only ever sees their own two screens, so the queue has to be
  // visible from the sidebar or nobody knows a shoot is waiting on them.
  if (viewId === "production-requests") return productionRequests;
  return 0;
}

export function CreatorsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.session.user);
  const hydrated = useSelector((s: RootState) => s.session.hydrated);
  const selectedYear = useSelector((s: RootState) => s.year.selectedYear);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/creators/login");
  }, [hydrated, user, router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open on mobile.
  useEffect(() => {
    document.body.classList.toggle("drawer-open", menuOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [menuOpen]);

  const views = user ? creatorViewsByRole[user.role] || [] : [];
  const activeView = pathname.split("/").filter(Boolean)[1] || views[0]?.id;

  // Route-level guard. The sidebar only renders permitted links, but the route is
  // still reachable by typing the URL — without this a manager could open
  // /creators/permissions or the company-wide P&L. Bounce them to their first view.
  const viewAllowed = !activeView || views.some((v) => v.id === activeView);
  useEffect(() => {
    if (hydrated && user && !viewAllowed && views[0]) {
      router.replace(`/creators/${views[0].id}`);
    }
  }, [hydrated, user, viewAllowed, views, router]);

  const { data: dealData = [] } = useGetDealsQuery();
  const { data: approvalData = [] } = useGetApprovalsQuery();
  const { data: productionData = [] } = useGetProductionRequestsQuery();
  const { data: settings } = useGetSettingsQuery();

  const deals = useMemo(() => dealData.map(toDeal), [dealData]);

  // Anything waiting on a person, surfaced as a number on the sidebar link.
  const pendingApprovals = useMemo(
    () => approvalData.filter((a) => a.status === "pending").length,
    [approvalData],
  );
  // Anything the production team still has to schedule or turn down.
  const productionRequests = useMemo(
    () => productionData.filter((r) => r.status === "pending").length,
    [productionData],
  );
  // Exactly what the Finance Actions page lists — see lib/financeActions.ts.
  // These were worked out separately and drifted, so the badge showed a number
  // the page could not account for.
  const financeActions = useMemo(() => financeActionCount(deals), [deals]);

  const monthIndex = currentMonthIndex();
  const target = Number(settings?.targets?.[monthIndex] || 0);
  const confirmed = useMemo(
    () => Number(dealRevenue(deals, "live")[monthIndex] || 0),
    [deals, monthIndex],
  );
  const targetMet = confirmed >= target;

  const totalActions = views.reduce(
    (total, v) => total + actionCountForView(v.id, pendingApprovals, financeActions, productionRequests),
    0,
  );

  if (!hydrated || !user) return null;
  // Hold the frame while the guard above redirects, so a disallowed view never paints.
  if (!viewAllowed) return null;

  return (
    <div className={`shell ${menuOpen ? "menu-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          className="menu-toggle"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="menu-toggle-bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        <Image className="mobile-topbar-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={132} height={44} />
        <div className={`mobile-actions-pill ${totalActions ? "has-actions" : ""}`}>{totalActions}</div>
      </header>
      <div
        className="sidebar-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className="sidebar">
        <div className="brand">
          <Image className="brand-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={176} height={58} />
          <span>Creator Portal</span>
          <div className={`global-actions ${totalActions ? "has-actions" : ""}`}>
            <span>{totalActions ? "Actions to do" : "No actions"}</span>
            <strong>{totalActions}</strong>
          </div>
          <div className={`sidebar-target ${targetMet ? "target-hit" : "target-miss"}`}>
            <div>
              <span>{months[monthIndex]} target revenue</span>
              <strong>{money(target)}</strong>
            </div>
            <div>
              <span>Confirmed deals</span>
              <strong>{money(confirmed)}</strong>
            </div>
          </div>
          <YearSwitcher />
        </div>
        <nav className="nav">
          {views.map((view) => {
            const count = actionCountForView(view.id, pendingApprovals, financeActions, productionRequests);
            // The P&L link carries the selected financial year so it stays in sync.
            const label = view.id === "pl-live" ? `P&L ${selectedYear}` : view.label;
            return (
              <Link
                key={view.id}
                href={`/creators/${view.id}`}
                className={activeView === view.id ? "active" : ""}
                aria-label={`Open ${label}`}
              >
                <span className="nav-handle" aria-hidden="true">::</span>
                <span className="nav-text">
                  <span dangerouslySetInnerHTML={{ __html: label }} />
                  {count ? <span className="nav-badge">{count}</span> : null}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="user-card">
          <strong>{user.name}</strong>
          <span>{roleLabel(user.role)} access</span>
          <button
            className="ghost"
            onClick={() => {
              dispatch(logoutCreators());
              router.replace("/creators/login");
            }}
          >
            Sign out
          </button>
          <button
            className="ghost"
            onClick={() => {
              dispatch(resetPortal());
              router.replace("/");
            }}
          >
            All portals
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
