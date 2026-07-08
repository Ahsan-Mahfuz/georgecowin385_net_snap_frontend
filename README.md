# Cowshed Creators Portal — Next.js frontend

Production-quality **UI-only** rebuild of the `creator-pl-mvp` prototype, using Next.js (App Router),
React 19, Redux Toolkit, and Tailwind CSS v4. The visual design is a faithful, pixel-level match of the
prototype; data is static/placeholder, ready to be wired to real APIs later.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Structure

```
app/
  page.tsx                     Portal choice (Creators / Collective)
  creators/login/page.tsx      Creators prototype login (profile picker)
  creators/(shell)/            Dark sidebar shell + dynamic [view] routing
  collective/login/page.tsx    Collective sales login
  collective/(shell)/          Collective shell + dynamic [view] routing
  globals.css                  Design system (tokens + ported prototype component classes)
components/
  shell/                       CreatorsShell, CollectiveShell (sidebar, nav, target widget)
  views/creators/              One component per creator view + registry.ts
  views/collective/            Collective views + registry.ts
config/navigation.ts           Per-role allowed views (mirrors prototype allowedViews)
lib/format.ts                  money(), sum(), months, currentMonthIndex(), …
lib/mock.ts                    Static seed data (profiles, deals, targets, overheads, …)
lib/pl.ts                      P&L computation (plModel, dealRevenue, dealCost)
redux/                         session slice (portal + profile) + layout slice
docs/DESIGN_SYSTEM.md          Design-system reference
```

## Roles / logins

The prototype has two portals. **Creators** offers profiles: Admin, Finance, Operations, Production,
and talent managers (Amelia, Sam, Holly, Kareem, Alex) — each sees a role-specific set of views.
**Collective** offers a separate sales CRM with Admin + sales profiles. Session is held in Redux and
persisted to `localStorage`.

## Notes

- The prototype (`../demo/outputs/creator-pl-mvp`) is the single source of truth for the design.
- All styling reuses the prototype's semantic class names, ported verbatim into `app/globals.css`.
- No backend, API, or real integrations — those are the next step.
