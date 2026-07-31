"use client";

import React, { useCallback, useEffect, useRef } from "react";

export interface ConfirmOptions {
  title: string;
  /** Body copy — say exactly what is about to happen and to what. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styles the confirm button red and focuses Cancel instead. */
  tone?: "danger" | "default";
}

interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  busy = false,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the safe choice first on a destructive prompt so a stray Enter cancels.
  useEffect(() => {
    if (!open) return;
    const target = tone === "danger" ? cancelRef.current : confirmRef.current;
    target?.focus();
  }, [open, tone]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!busy) onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      // Trap focus inside the dialog.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [busy, onCancel],
  );

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className="confirm-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        ref={panelRef}
      >
        <div className={`confirm-icon ${tone === "danger" ? "is-danger" : "is-default"}`} aria-hidden="true">
          {tone === "danger" ? "!" : "?"}
        </div>
        <h3 id="confirm-title">{title}</h3>
        <div id="confirm-message" className="confirm-message">
          {message}
        </div>
        <div className="confirm-actions">
          <button type="button" className="ghost" ref={cancelRef} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "danger" : "primary"}
            ref={confirmRef}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
