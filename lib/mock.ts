// Types + static CONFIGURATION only. There is no mock/demo data here anymore —
// every list, deal, talent, overhead, user, etc. comes from the backend via RTK
// Query. The constants below (pipeline stage names, payment terms, production
// roles) are app configuration, not data.

export type Role = "admin" | "finance" | "operations" | "production" | "manager";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  email: string;
  /** Who this person reports to — drives line-report visibility on Commission. */
  lineManagerId?: string;
}

export interface Deal {
  id: string;
  managerId: string;
  talentName: string;
  status: "Confirmed" | "Pipeline";
  campaignName: string;
  stage?: string;
  monthValues: number[];
  costRate: number;
  // CRM / cashflow / invoicing
  inboundOrOutbound?: "Inbound" | "Outbound";
  useUSD?: boolean;
  paymentTerms?: string;
  ownTimeDays?: number;
  companyName?: string;
  emailAddresses?: string;
  companyAddress?: string;
  noPoNumber?: boolean;
  xeroAccountCode?: string;
  xeroTaxRate?: string;
  contractUrl?: string;
  noContract?: boolean;
  approvalStatus?: "Pending" | "Approved" | "Rejected";
  company?: string;
  contactEmail?: string;
  paymentTerm?: string;
  customPaymentDays?: number;
  signedMonthIndex?: number;
  currency?: "GBP" | "USD";
  poNumber?: string;
  /** Chosen Xero contact — avoids creating a duplicate brand contact. */
  xeroContactId?: string;
  xeroContactName?: string;
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  xeroStatus?: string;
  /** Raw Xero status: DRAFT | SUBMITTED | AUTHORISED | PAID | VOIDED. */
  xeroState?: string;
  xeroDueDate?: string;
  financeStatus?: string;
  invoiceDate?: string;
  remittanceStatus?: string;
  xeroBillId?: string;
  xeroBillNumber?: string;
  xeroBillState?: string;
}

export interface OverheadRow {
  id: string;
  label: string;
  values: number[];
}

export interface EmailLead {
  id: string;
  managerId: string;
  /** Set when the request has been handed to another team member. */
  delegatedToId?: string;
  delegatedById?: string;
  from: string;
  subject: string;
  receivedAt: string;
  category: "Deal" | "PR" | "Event";
  talentName: string;
  company: string;
  campaignName: string;
  amount: number;
  monthIndex: number;
  paymentTerm: string;
  contactEmail: string;
  eventDate?: string;
  actionPoint: string;
  body: string;
}

/** One month of a sales deal's payment schedule, invoiced on its own. */
export interface Installment {
  monthIndex: number;
  amount: number;
  stage: string;
  xeroInvoiceId: string;
  xeroInvoiceNumber: string;
  xeroStatus: string;
  invoiceDate: string;
}

export interface CollectiveDeal {
  id: string;
  ownerId: string;
  company: string;
  dealName: string;
  contactName: string;
  emailContact: string;
  companyAddress: string;
  poNumber: string;
  noPoNumber: boolean;
  contractUrl: string;
  noContract: boolean;
  stage: string;
  amount: number;
  paymentTerm: string;
  customPaymentDays: number;
  monthValues: number[];
  installments: Installment[];
  xeroOrg: string;
  xeroInvoiceId: string;
  xeroStatus: string;
  notes: string;
  updatedAt: string;
}

// ─── Configuration (not data) ────────────────────────────────────────────────

export const crmStages = ["Conversation", "Negotiation", "Contract Signed", "To Be Invoiced", "Invoiced", "On Next Payment Run", "Paid"];
export const reportStages = ["Conversation", "Negotiation", "Contract Signed", "Invoiced", "On Next Payment Run", "Paid"];
export const collectiveStages = ["Conversation", "Negotiation", "Contract Signed", "To Be Invoiced", "Invoiced", "Paid"];
// Stages that represent committed (live) revenue on the Sales CRM. Anything
// before Contract Signed is still pipeline.
export const collectiveLiveStages = ["Contract Signed", "To Be Invoiced", "Invoiced", "Paid"];
export const collectivePipelineStages = ["Conversation", "Negotiation"];
// The lifecycle of a single scheduled payment within a deal.
export const installmentStages = ["Scheduled", "To Be Invoiced", "Invoiced", "Paid"];
export const productionItems = ["Producer", "DOP", "Editor"];

export const paymentTerms = [
  { label: "Upfront", value: "upfront", days: 0 },
  { label: "30 days", value: "30", days: 30 },
  { label: "45 days", value: "45", days: 45 },
  { label: "60 days", value: "60", days: 60 },
  { label: "90 days", value: "90", days: 90 },
  { label: "Custom", value: "custom", days: 0 },
];

export function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "finance") return "Finance";
  if (role === "operations") return "Operations";
  if (role === "production") return "Production";
  return "Talent manager";
}
