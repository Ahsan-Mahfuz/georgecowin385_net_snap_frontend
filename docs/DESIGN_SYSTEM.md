# Cowshed Creators / Collective — Design System (for view builders)

The exact prototype stylesheet is preserved verbatim in `app/globals.css`. **Use the prototype's
semantic class names directly** (e.g. `section`, `section-head`, `section-body`, `kpi-grid`,
`kpi`, `pill`, `pill confirmed`, `table-wrap`, `segmented`, `crm-board`, `crm-card`, etc.).
Do **not** re-derive styles with Tailwind utilities for anything that already has a prototype class —
that is how we stay pixel-perfect. Tailwind is available for one-off layout tweaks only.

## Tokens (CSS variables, already in globals.css)
--ink #202326 (text) · --muted #687178 (labels) · --line #d9e0e4 (borders) ·
--panel #fff (cards) · --page #f5f7f3 (bg) · --green #1f6b52 (brand/primary/positive) ·
--green-soft #d9ece3 (selected/success) · --blue #244c77 · --blue-soft #dde8f3 ·
--amber #946512 · --amber-soft #f2e7cf · --rose #9d3030 (danger) · --rose-soft #f1dcdc ·
sidebar #17221f · shadow 0 12px 34px rgba(30,36,40,.08).

## Font
Inter stack. Emphasis weights: 700 (labels), 800 (buttons/pills/eyebrows), 900 (badges/totals/links).

## Buttons
`primary` (green, h44), `secondary` (#eef3ed, h34), `ghost` (sidebar), `danger-button` (rose-soft/rose),
`table-link` (green underline), `save-detail-button`, `delegate-button`.

## Key layout classes
`shell` (grid 248px + 1fr) · `sidebar` · `main` · `topbar` + `eyebrow` + `h1` + `asof` (page header) ·
`kpi-grid`/`kpi` · `layout` (1.45fr/0.75fr) · `section`/`section-head`/`section-actions`/`section-body` ·
`table-wrap` + `table` (th uppercase #f0f4f1; `tr.total-row`, `tr.section-row`, `selected-row`).

## Components
pill (+ confirmed/pipeline/draft/admin/rejected/inbound/outbound) · chip · segmented (+ segmented-three) ·
kpi · metric-card · deal-card · crm-board/crm-column/crm-card + stage-* chips · leaderboard-row/rank ·
earnings-grid/earning · report-card/report-stage · email-lead-card · calendar-month/calendar-event ·
notice/action-notice/delegation-notice/success-notice/overdue-message · field/field-hint/form-grid ·
table-input/mini-input/compact-select · sidebar-target (target-hit/target-miss) · global-actions (has-actions) ·
crm-detail-overlay/crm-detail-modal/crm-detail-close (modals).

## Icons
No icon set. Nav drag grip is the literal text `::`. Close buttons use `×`. Logos are PNGs in `/public`.

## Modals
Overlay `crm-detail-overlay` (fixed inset-0, rgba(23,34,31,.34)); panel `crm-detail-modal`; close `crm-detail-close`.

See `demo/outputs/creator-pl-mvp/styles.css` and `app.js` for the source of truth.
