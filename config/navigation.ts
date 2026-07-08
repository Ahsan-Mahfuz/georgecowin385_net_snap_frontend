import { Role } from "@/lib/mock";

export interface ViewItem {
  id: string;
  label: string;
}

// Per-role allowed views, mirrored from the prototype allowedViews() (app.js).
export const creatorViewsByRole: Record<Role, ViewItem[]> = {
  admin: [
    { id: "pl-live", label: "P&L 2026" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "commission", label: "Commission" },
    { id: "crm", label: "CRM" },
    { id: "brands", label: "Brands" },
    { id: "reports", label: "Reports" },
    { id: "production", label: "Production" },
    { id: "cashflow", label: "Cashflow" },
    { id: "managers", label: "Team" },
    { id: "permissions", label: "Permissions" },
    { id: "approvals", label: "Approvals" },
    { id: "talent", label: "Talent" },
    { id: "media-packs", label: "Media Packs" },
    { id: "talent-invoices", label: "Talent Invoices" },
    { id: "finance-actions", label: "Finance Actions" },
    { id: "production-chargebacks", label: "Production chargebacks" },
    { id: "overheads", label: "Overheads" },
    { id: "talent-expenses", label: "Talent Expenses" },
    { id: "expenses", label: "Expenses" },
  ],
  finance: [
    { id: "pl-live", label: "P&L 2026" },
    { id: "crm", label: "CRM" },
    { id: "brands", label: "Brands" },
    { id: "reports", label: "Reports" },
    { id: "cashflow", label: "Cashflow" },
    { id: "expenses", label: "Expenses" },
    { id: "talent", label: "Talent" },
    { id: "media-packs", label: "Media Packs" },
    { id: "talent-invoices", label: "Talent Invoices" },
    { id: "finance-actions", label: "Actions" },
    { id: "production-chargebacks", label: "Production chargebacks" },
  ],
  operations: [
    { id: "pl-live", label: "P&L 2026" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "commission", label: "Commission" },
    { id: "crm", label: "CRM" },
    { id: "brands", label: "Brands" },
    { id: "reports", label: "Reports" },
    { id: "production", label: "Production" },
    { id: "managers", label: "Team" },
    { id: "permissions", label: "Permissions" },
    { id: "approvals", label: "Approvals" },
    { id: "talent", label: "Talent" },
    { id: "media-packs", label: "Media Packs" },
    { id: "overheads", label: "Overheads" },
    { id: "talent-expenses", label: "Talent Expenses" },
    { id: "expenses", label: "Expenses" },
  ],
  production: [
    { id: "production-requests", label: "Production Requests" },
    { id: "production-rates", label: "Rates" },
  ],
  manager: [
    { id: "commission", label: "Commission" },
    { id: "crm", label: "CRM" },
    { id: "email-leads", label: "Email Leads" },
    { id: "pr-requests", label: "PR Requests" },
    { id: "events", label: "Events" },
    { id: "brands", label: "Brands" },
    { id: "reports", label: "Reports" },
    { id: "production", label: "Production" },
    { id: "talent", label: "Talent" },
    { id: "media-packs", label: "Media Packs" },
    { id: "talent-expenses", label: "Talent Expenses" },
    { id: "expenses", label: "Expenses" },
    { id: "approvals", label: "Approvals" },
  ],
};

export const collectiveViews: ViewItem[] = [
  { id: "collective-crm", label: "CRM" },
  { id: "collective-months", label: "Deals by month" },
  { id: "collective-quarters", label: "Quarter view" },
];

// Full catalogue of creator views (superset used to build the registry / routes).
export const allCreatorViews: ViewItem[] = [
  { id: "pl-live", label: "P&L 2026" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "commission", label: "Commission" },
  { id: "crm", label: "CRM" },
  { id: "brands", label: "Brands" },
  { id: "reports", label: "Reports" },
  { id: "production", label: "Production" },
  { id: "production-requests", label: "Production Requests" },
  { id: "production-rates", label: "Rates" },
  { id: "cashflow", label: "Cashflow" },
  { id: "managers", label: "Team" },
  { id: "permissions", label: "Permissions" },
  { id: "approvals", label: "Approvals" },
  { id: "talent", label: "Talent" },
  { id: "media-packs", label: "Media Packs" },
  { id: "talent-invoices", label: "Talent Invoices" },
  { id: "finance-actions", label: "Finance Actions" },
  { id: "production-chargebacks", label: "Production chargebacks" },
  { id: "overheads", label: "Overheads" },
  { id: "talent-expenses", label: "Talent Expenses" },
  { id: "expenses", label: "Expenses" },
  { id: "email-leads", label: "Email Leads" },
  { id: "pr-requests", label: "PR Requests" },
  { id: "events", label: "Events" },
];
