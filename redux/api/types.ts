import { Role } from "@/lib/mock";

export type Portal = "creators" | "collective";
export type AccountStatus = "pending" | "active" | "disabled";

// Envelope every backend response uses: { success, statusCode, message, token?, meta?, data }.
export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  token?: string;
  meta?: { page: number; limit: number; total: number; totalPage: number };
  data: T;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  portal: Portal;
  status: AccountStatus;
  lineManager?: ApiManagerRef | string | null;
}

export interface ApiManagerRef {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiDeal {
  _id: string;
  manager: ApiManagerRef | string;
  talentName: string;
  status: "Confirmed" | "Pipeline";
  campaignName: string;
  company?: string;
  stage?: string;
  monthValues: number[];
  costRate: number;
  year?: number;
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
  contactEmail?: string;
  paymentTerm: string;
  customPaymentDays: number;
  signedMonthIndex: number;
  currency: "GBP" | "USD";
  poNumber?: string;
  xeroOrg: string;
  xeroContactId?: string;
  xeroContactName?: string;
  xeroInvoiceId: string;
  xeroInvoiceNumber?: string;
  xeroStatus: string;
  /** Raw Xero status: DRAFT | SUBMITTED | AUTHORISED | PAID | VOIDED. */
  xeroState?: string;
  xeroDueDate?: string;
  invoiceDate?: string;
  financeStatus: string;
  remittanceStatus?: string;
  remittanceSentAt?: string;
  remittancePaidAt?: string;
  xeroBillId?: string;
  xeroBillNumber?: string;
  xeroBillStatus?: string;
  xeroBillState?: string;
  createdAt: string;
  updatedAt: string;
}

/** A contact that already exists in the connected Xero organisation. */
export interface ApiXeroContact {
  contactId: string;
  name: string;
  email: string;
  address: string;
  bankAccount: string;
  taxNumber: string;
  currency: string;
}

export interface ApiXeroSync {
  checked: number;
  invoiced: string[];
  paid: string[];
  billsPaid?: string[];
  errors: string[];
}

export interface ApiProductionItem {
  name: string;
  days: number;
  rate: number;
}

export interface ApiProductionRequest {
  _id: string;
  manager: ApiManagerRef | string;
  submittedBy: ApiManagerRef | string;
  talentName: string;
  shootDate: string;
  videoBrief: string;
  items: ApiProductionItem[];
  total: number;
  status: "pending" | "scheduled" | "completed" | "rejected";
  note?: string;
  rejectionReason?: string;
  /** Set once the rejection notice has been read and cleared off the screen. */
  rejectionDismissedAt?: string | null;
  /** Set once finance has raised the chargeback against the manager's P&L. */
  chargebackRequestedAt?: string | null;
  /** The talent bill this shoot has already been deducted from. */
  xeroBillId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTalent {
  _id: string;
  name: string;
  email?: string;
  manager: ApiManagerRef | string;
  /** Linked Xero contact, so bills carry the bank and tax details Finance holds. */
  xeroContactId?: string;
  xeroContactName?: string;
  xeroBankAccount?: string;
  xeroTaxNumber?: string;
  /** What happened last time the portal mirrored these details onto Xero. */
  xeroSyncStatus?: string;
  invoiceName?: string;
  invoiceEmail?: string;
  invoiceAddress?: string;
  bankName?: string;
  accountName?: string;
  sortCode?: string;
  accountNumber?: string;
  vatNumber?: string;
  handles?: { instagram?: string; tiktok?: string; youtube?: string };
  bio?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ApiBrand {
  _id: string;
  name: string;
  emailContact?: string;
  billingAddress?: string;
  paymentTerm?: string;
  customPaymentDays?: number;
  updatedAt?: string;
}

export interface ApiOverhead {
  _id: string;
  label: string;
  values: number[];
}

export interface ApiEmailLead {
  _id: string;
  manager: ApiManagerRef | string;
  /** Team member the request was handed to; they see it in their own portal. */
  delegatedTo?: ApiManagerRef | string | null;
  delegatedBy?: ApiManagerRef | string | null;
  delegatedAt?: string | null;
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

export interface ApiExpense {
  _id: string;
  kind: "general" | "talent";
  category?: string;
  label: string;
  manager?: ApiManagerRef | string;
  /** Set on talent expenses that are recharged against a specific CRM deal. */
  deal?: ApiManagerRef | string;
  talentName?: string;
  amount: number;
  monthIndex: number;
  note?: string;
  /** The Xero invoice recharging this expense to the brand, once raised. */
  xeroInvoiceId?: string;
  xeroInvoiceNumber?: string;
  xeroStatus?: string;
  xeroState?: string;
  /** The talent bill this expense has been reimbursed on. */
  xeroBillId?: string;
  createdAt?: string;
}

/** A date on which talent are paid — maintained under Payment Runs. */
export interface ApiPaymentRun {
  _id: string;
  date: string;
  label?: string;
  note?: string;
}

export interface ApiSettings {
  targets: number[];
  managerSalaries: Record<string, number>;
  commissionRates: Record<string, number>;
  productionRates: Record<string, number>;
}

export interface ApiApproval {
  _id: string;
  kind: "deal" | "expense";
  title: string;
  amount: number;
  monthIndex: number;
  submittedBy: ApiManagerRef | string;
  approver?: ApiManagerRef | string;
  manager?: ApiManagerRef | string;
  /** The CRM deal this request is for — populated with a summary of the deal. */
  deal?: { _id: string; talentName?: string; campaignName?: string } | string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string;
  note: string;
  createdAt: string;
}

export interface ApiInstallment {
  monthIndex: number;
  amount: number;
  stage: string;
  paymentTerm?: string;
  customPaymentDays?: number;
  xeroInvoiceId: string;
  xeroInvoiceNumber: string;
  xeroStatus: string;
  invoiceDate: string;
}

export interface ApiCollectiveDeal {
  _id: string;
  owner: ApiManagerRef | string;
  company: string;
  dealName: string;
  contactName?: string;
  emailContact?: string;
  companyAddress?: string;
  poNumber?: string;
  noPoNumber?: boolean;
  contractUrl?: string;
  noContract?: boolean;
  stage: string;
  amount: number;
  paymentTerm: string;
  customPaymentDays: number;
  monthValues: number[];
  installments?: ApiInstallment[];
  /** Per-month payment terms sent when saving the schedule (write-only). */
  installmentTerms?: { monthIndex: number; paymentTerm?: string; customPaymentDays?: number }[];
  xeroContactId?: string;
  xeroContactName?: string;
  xeroOrg: string;
  xeroInvoiceId: string;
  xeroStatus: string;
  notes: string;
  updatedAt: string;
}
