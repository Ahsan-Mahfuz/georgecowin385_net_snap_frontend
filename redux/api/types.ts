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
  createdAt: string;
  updatedAt: string;
}

export interface ApiTalent {
  _id: string;
  name: string;
  manager: ApiManagerRef | string;
  createdAt: string;
}

export interface ApiOverhead {
  _id: string;
  label: string;
  values: number[];
}

export interface ApiEmailLead {
  _id: string;
  manager: ApiManagerRef | string;
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
  label: string;
  manager?: ApiManagerRef | string;
  talentName?: string;
  amount: number;
  monthIndex: number;
  note?: string;
}

export interface ApiSettings {
  targets: number[];
  managerSalaries: Record<string, number>;
  commissionRates: Record<string, number>;
  productionRates: Record<string, number>;
}

export interface ApiCollectiveDeal {
  _id: string;
  owner: ApiManagerRef | string;
  company: string;
  dealName: string;
  contactName?: string;
  emailContact?: string;
  stage: string;
  amount: number;
  paymentTerm: string;
  customPaymentDays: number;
  monthValues: number[];
  xeroOrg: string;
  xeroInvoiceId: string;
  xeroStatus: string;
  notes: string;
  updatedAt: string;
}
