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
import { roleLabel, type EmailLead } from "@/lib/mock";
import { money, months, currentMonthIndex } from "@/lib/format";
import { dealRevenue } from "@/lib/pl";
import { useGetEmailLeadsQuery } from "@/redux/api/emailLeadApi";
import { useGetDealsQuery } from "@/redux/api/dealApi";
import { useGetSettingsQuery } from "@/redux/api/settingsApi";
import { toEmailLead, toDeal } from "@/lib/adapters";

function actionCountForView(viewId: string, leads: EmailLead[]): number {
  if (viewId === "email-leads") return leads.filter((l) => l.category === "Deal").length;
  if (viewId === "pr-requests") return leads.filter((l) => l.category === "PR").length;
  if (viewId === "events") return leads.filter((l) => l.category === "Event").length;
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
  const managerId = user?.role === "manager" ? user.id : null;

  const { data: leadData = [] } = useGetEmailLeadsQuery(managerId ? { manager: managerId } : undefined);
  const { data: dealData = [] } = useGetDealsQuery();
  const { data: settings } = useGetSettingsQuery();

  const leads = useMemo(() => leadData.map(toEmailLead), [leadData]);
  const deals = useMemo(() => dealData.map(toDeal), [dealData]);

  const monthIndex = currentMonthIndex();
  const target = Number(settings?.targets?.[monthIndex] || 0);
  const confirmed = useMemo(
    () => Number(dealRevenue(deals, "live")[monthIndex] || 0),
    [deals, monthIndex],
  );
  const targetMet = confirmed >= target;

  const totalActions = views.reduce((total, v) => total + actionCountForView(v.id, leads), 0);

  if (!hydrated || !user) return null;

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
            const count = actionCountForView(view.id, leads);
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
