"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { logoutCollective, resetPortal } from "@/redux/features/session/sessionSlice";
import { collectiveViews } from "@/config/navigation";
import { defaultCollectiveDeals } from "@/lib/mock";
import { money, sum } from "@/lib/format";

export function CollectiveShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.session.collectiveUser);
  const hydrated = useSelector((s: RootState) => s.session.hydrated);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/collective/login");
  }, [hydrated, user, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", menuOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [menuOpen]);

  const activeView = pathname.split("/").filter(Boolean)[1] || collectiveViews[0]?.id;

  const visibleDeals = user
    ? user.role === "admin"
      ? defaultCollectiveDeals
      : defaultCollectiveDeals.filter((d) => d.ownerId === user.id)
    : [];
  const totalPipeline = visibleDeals.reduce((total, d) => total + Number(d.amount || sum(d.monthValues || [])), 0);

  if (!hydrated || !user) return null;

  return (
    <div className={`shell collective-shell ${menuOpen ? "menu-open" : ""}`}>
      <header className="mobile-topbar collective-mobile-topbar">
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
        <Image className="mobile-topbar-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={132} height={44} />
        <span className="mobile-topbar-title">Sales CRM</span>
      </header>
      <div
        className="sidebar-backdrop"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside className="sidebar collective-sidebar">
        <div className="brand collective-brand">
          <Image className="brand-logo collective-brand-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={178} height={58} />
          <span>Sales CRM</span>
          <div className="sidebar-target target-hit">
            <div>
              <span>Visible pipeline</span>
              <strong>{money(totalPipeline)}</strong>
            </div>
            <div>
              <span>Xero organisation</span>
              <strong>Collective</strong>
            </div>
          </div>
        </div>
        <nav className="nav">
          {collectiveViews.map((view) => (
            <Link
              key={view.id}
              href={`/collective/${view.id}`}
              className={activeView === view.id ? "active" : ""}
            >
              <span className="nav-text">{view.label}</span>
            </Link>
          ))}
        </nav>
        <div className="user-card">
          <strong>{user.name}</strong>
          <span>{user.role === "admin" ? "Admin" : "Sales"} access</span>
          <button
            className="ghost"
            onClick={() => {
              dispatch(logoutCollective());
              router.replace("/collective/login");
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
