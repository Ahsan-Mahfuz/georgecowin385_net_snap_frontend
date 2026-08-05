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
} from "@/redux/api/types";
import type { Profile, Deal, EmailLead, OverheadRow, CollectiveDeal } from "@/lib/mock";

/** The id of a reference, whether the API populated it or left it as an id. */
export function refId(ref: { _id: string } | string | undefined | null): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

export function toProfile(u: ApiUser): Profile {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    email: u.email,
    lineManagerId: refId(u.lineManager || undefined) || undefined,
  };
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
    inboundOrOutbound: d.inboundOrOutbound,
    useUSD: d.useUSD,
    paymentTerms: d.paymentTerms,
    ownTimeDays: d.ownTimeDays,
    companyName: d.companyName,
    emailAddresses: d.emailAddresses,
    companyAddress: d.companyAddress,
    noPoNumber: d.noPoNumber,
    xeroAccountCode: d.xeroAccountCode,
    xeroTaxRate: d.xeroTaxRate,
    contractUrl: d.contractUrl,
    noContract: d.noContract,
    approvalStatus: d.approvalStatus,
    company: d.company || d.companyName,
    contactEmail: d.contactEmail || d.emailAddresses,
    paymentTerm: d.paymentTerm || d.paymentTerms,
    customPaymentDays: d.customPaymentDays,
    signedMonthIndex: d.signedMonthIndex,
    currency: d.useUSD ? "USD" : d.currency || "GBP",
    poNumber: d.poNumber,
    xeroContactId: d.xeroContactId,
    xeroContactName: d.xeroContactName,
    xeroInvoiceId: d.xeroInvoiceId,
    xeroInvoiceNumber: d.xeroInvoiceNumber,
    xeroStatus: d.xeroStatus,
    xeroState: d.xeroState,
    xeroDueDate: d.xeroDueDate,
    xeroOverdueDays: Number(d.xeroOverdueDays || 0),
    financeStatus: d.financeStatus,
    invoiceDate: d.invoiceDate,
    remittanceStatus: d.remittanceStatus,
    remittanceSentAt: d.remittanceSentAt,
    remittancePaidAt: d.remittancePaidAt,
    xeroBillId: d.xeroBillId,
    xeroBillNumber: d.xeroBillNumber,
    xeroBillState: d.xeroBillState,
  };
}

export function toEmailLead(l: ApiEmailLead): EmailLead {
  return {
    id: l._id,
    managerId: refId(l.manager),
    delegatedToId: refId(l.delegatedTo || undefined) || undefined,
    delegatedById: refId(l.delegatedBy || undefined) || undefined,
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
    companyAddress: d.companyAddress || "",
    poNumber: d.poNumber || "",
    noPoNumber: Boolean(d.noPoNumber),
    contractUrl: d.contractUrl || "",
    noContract: Boolean(d.noContract),
    stage: d.stage,
    amount: d.amount,
    businessType: d.businessType || "New Business",
    paymentTerm: d.paymentTerm,
    customPaymentDays: d.customPaymentDays,
    monthValues: d.monthValues || [],
    installments: (d.installments || []).map((i) => ({
      monthIndex: i.monthIndex,
      amount: Number(i.amount || 0),
      percent: Number(i.percent || 0),
      stage: i.stage || "Scheduled",
      // Each payment carries its own terms — dropping them here made every row
      // fall back to the deal default on screen.
      paymentTerm: i.paymentTerm || "",
      customPaymentDays: Number(i.customPaymentDays || 0),
<<<<<<< HEAD
      dueDate: i.dueDate || "",
      reminderSentAt: i.reminderSentAt || "",
=======
>>>>>>> ba96e6915236f6d3ec5f95840650ef0d94946b70
      xeroInvoiceId: i.xeroInvoiceId || "",
      xeroInvoiceNumber: i.xeroInvoiceNumber || "",
      xeroStatus: i.xeroStatus || "",
      overdueDays: Number(i.overdueDays || 0),
      invoiceDate: i.invoiceDate || "",
    })),
    xeroContactId: d.xeroContactId || "",
    xeroContactName: d.xeroContactName || "",
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
