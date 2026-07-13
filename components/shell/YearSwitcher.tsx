"use client";

import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { setYear } from "@/redux/features/year/yearSlice";
import { availableYears } from "@/lib/format";

// Global financial-year picker shown in the sidebar. Selecting a year filters
// every deal-driven view (P&L, Cashflow, Commission, Leaderboard, CRM).
// Custom dropdown (not a native <select>) so it can be styled to match the shell.
export function YearSwitcher() {
  const dispatch = useDispatch();
  const year = useSelector((s: RootState) => s.year.selectedYear);
  const years = availableYears();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (y: number) => {
    dispatch(setYear(y));
    setOpen(false);
  };

  return (
    <div className={`year-switcher ${open ? "open" : ""}`} ref={ref}>
      <span className="year-switcher-label">Financial year</span>
      <button
        type="button"
        className="year-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="year-switcher-value">{year}</span>
        <svg className="year-switcher-caret" viewBox="0 0 12 8" aria-hidden="true">
          <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="year-switcher-menu" role="listbox" aria-label="Financial year">
          {years.map((y) => (
            <li key={y} role="option" aria-selected={y === year}>
              <button
                type="button"
                className={`year-switcher-option ${y === year ? "selected" : ""}`}
                onClick={() => choose(y)}
              >
                {y}
                {y === year ? (
                  <svg className="year-switcher-check" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
