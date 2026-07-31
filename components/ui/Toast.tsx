"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, tone, message }]);
    // Errors linger — the user usually needs to read and act on them.
    window.setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id));
    }, tone === "error" ? 6000 : 3200);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <span className="toast-dot" aria-hidden="true" />
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss"
              onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Toasts are optional — a view rendered outside the provider (or in a test) gets
 * no-ops rather than a crash.
 */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  return (
    ctx ?? {
      success: () => {},
      error: () => {},
      info: () => {},
    }
  );
}

/** Pull a human-readable message out of an RTK Query error. */
export function apiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = err as { data?: { message?: string }; error?: string; status?: number };
  return e?.data?.message || e?.error || (e?.status ? `Request failed (${e.status})` : fallback);
}
