// Map backend API shapes (ApiXxx, with _id + populated refs) to the frontend's
// existing flat shapes (Profile/Deal/EmailLead/OverheadRow/CollectiveDeal) so the
// view components can keep operating on the shapes they already expect.

import type {
  ApiUser,
  ApiDeal,
  ApiEmailLead,
  ApiOverhead,
  ApiCollectiveDeal,
  ApiTalent,
  ApiManagerRef,
} from "@/redux/api/types";
import type { Profile, Deal, EmailLead, OverheadRow, CollectiveDeal } from "@/lib/mock";

export function refId(ref: ApiManagerRef | string | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

export function toProfile(u: ApiUser): Profile {
  return { id: u.id, name: u.name, role: u.role, email: u.email };
}

export function toManagers(team: ApiUser[]): Profile[] {
  return team.filter((u) => u.role === "manager").map(toProfile);
}

export function toDeal(d: ApiDeal): Deal {
  return {
    id: d._id,
    managerId: refId(d.manager),
    talentName: d.talentName,
    status: d.status,
    campaignName: d.campaignName,
    stage: d.stage,
    monthValues: d.monthValues || [],
    costRate: d.costRate,
    company: d.company,
    contactEmail: d.contactEmail,
    paymentTerm: d.paymentTerm,
    customPaymentDays: d.customPaymentDays,
    signedMonthIndex: d.signedMonthIndex,
    currency: d.currency,
    poNumber: d.poNumber,
    xeroInvoiceId: d.xeroInvoiceId,
    xeroStatus: d.xeroStatus,
    financeStatus: d.financeStatus,
    invoiceDate: d.invoiceDate,
  };
}

export function toEmailLead(l: ApiEmailLead): EmailLead {
  return {
    id: l._id,
    managerId: refId(l.manager),
    from: l.from,
    subject: l.subject,
    receivedAt: l.receivedAt,
    category: l.category,
    talentName: l.talentName,
    company: l.company,
    campaignName: l.campaignName,
    amount: l.amount,
    monthIndex: l.monthIndex,
    paymentTerm: l.paymentTerm,
    contactEmail: l.contactEmail,
    eventDate: l.eventDate,
    actionPoint: l.actionPoint,
    body: l.body,
  };
}

export function toOverheadRow(o: ApiOverhead): OverheadRow {
  return { id: o._id, label: o.label, values: o.values || [] };
}

export function toCollectiveDeal(d: ApiCollectiveDeal): CollectiveDeal {
  return {
    id: d._id,
    ownerId: refId(d.owner),
    company: d.company,
    dealName: d.dealName,
    contactName: d.contactName || "",
    emailContact: d.emailContact || "",
    stage: d.stage,
    amount: d.amount,
    paymentTerm: d.paymentTerm,
    customPaymentDays: d.customPaymentDays,
    monthValues: d.monthValues || [],
    xeroOrg: d.xeroOrg,
    xeroInvoiceId: d.xeroInvoiceId,
    xeroStatus: d.xeroStatus,
    notes: d.notes,
    updatedAt: d.updatedAt,
  };
}

// Talent names for a given manager id (replaces the old talentOptions()).
export function talentNamesForManager(talents: ApiTalent[], managerId: string): string[] {
  return talents.filter((t) => refId(t.manager) === managerId).map((t) => t.name);
}
