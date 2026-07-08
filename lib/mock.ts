// Static seed data mirrored from the prototype (app.js). UI-only — no persistence.

export type Role = "admin" | "finance" | "operations" | "production" | "manager";

export interface Profile {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface Deal {
  id: string;
  managerId: string;
  talentName: string;
  status: "Confirmed" | "Pipeline";
  campaignName: string;
  monthValues: number[];
  costRate: number;
}

export interface OverheadRow {
  id: string;
  label: string;
  values: number[];
}

export interface EmailLead {
  id: string;
  managerId: string;
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

export interface CollectiveDeal {
  id: string;
  ownerId: string;
  company: string;
  dealName: string;
  contactName: string;
  emailContact: string;
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

export const crmStages = ["Conversation", "Negotiation", "Contract Signed", "To Be Invoiced", "Invoiced", "On Next Payment Run", "Paid"];
export const reportStages = ["Conversation", "Negotiation", "Contract Signed", "Invoiced", "On Next Payment Run", "Paid"];
export const collectiveStages = ["Conversation", "Negotiation", "Contract Signed", "To Be Invoiced", "Invoiced", "Paid"];
export const productionItems = ["Producer", "DOP", "Editor"];
export const defaultProductionRates: Record<string, number> = { Producer: 650, DOP: 850, Editor: 450 };

export const paymentTerms = [
  { label: "Upfront", value: "upfront", days: 0 },
  { label: "30 days", value: "30", days: 30 },
  { label: "45 days", value: "45", days: 45 },
  { label: "60 days", value: "60", days: 60 },
  { label: "90 days", value: "90", days: 90 },
  { label: "Custom", value: "custom", days: 0 },
];

export const users: Profile[] = [
  { id: "admin", name: "Admin", role: "admin", email: "admin@cowshed.test" },
  { id: "finance", name: "Finance", role: "finance", email: "finance@cowshed.test" },
  { id: "production", name: "Production", role: "production", email: "production@cowshed.test" },
  { id: "amelia", name: "Amelia", role: "manager", email: "amelia@cowshed.test" },
  { id: "sam", name: "Sam", role: "manager", email: "sam@cowshed.test" },
  { id: "holly", name: "Holly", role: "manager", email: "holly@cowshed.test" },
  { id: "kareem", name: "Kareem", role: "manager", email: "kareem@cowshed.test" },
  { id: "alex", name: "Alex", role: "manager", email: "alex@cowshed.test" },
];

export const managers = users.filter((u) => u.role === "manager");

export const collectiveSalesUsers: Profile[] = [
  { id: "collective-admin", name: "Collective Admin", role: "admin", email: "admin@cowshedcollective.test" },
  { id: "collective-george", name: "George", role: "manager", email: "george@cowshedcollective.test" },
  { id: "collective-mia", name: "Mia", role: "manager", email: "mia@cowshedcollective.test" },
  { id: "collective-james", name: "James", role: "manager", email: "james@cowshedcollective.test" },
];

export const defaultTargets = [75000, 79000, 91000, 109650, 135347.5, 143399.625, 174159.5688, 188033.5041, 207185.1793, 216794.4382, 216884.1601, 237478.3681];

export const defaultOverheads: OverheadRow[] = [
  { id: "staff", label: "Staff inc PAYE and NI", values: [12057.36, 12057.36, 15471, 15471, 18834.4, 18834.4, 18834.4, 18834.4, 18834.4, 18834.4, 18834.4, 18834.4] },
  { id: "bonus", label: "Bonuses and commission", values: [971.88, 635.12, 1112.94, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: "fixed", label: "Fixed and variable overheads", values: [1575, 1575, 1575, 1600, 1600, 1620, 1620, 1620, 1800, 1800, 1800, 1800] },
  { id: "entertaining", label: "Client entertaining", values: [440.94, 458.93, 0, 258, 192.06, 0, 0, 0, 0, 0, 0, 0] },
  { id: "marketing", label: "Marketing", values: [647.89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

export const defaultManagerSalaries: Record<string, number> = { amelia: 5000, sam: 5000, holly: 5000, kareem: 5000, alex: 5000 };
export const defaultCommissionRates: Record<string, number> = { amelia: 1, sam: 1, holly: 1, kareem: 1, alex: 1 };

export const defaultTalents: Record<string, string[]> = {
  amelia: ["Layo", "Issy", "Mia Rae", "Nell"],
  sam: ["Zayzz", "Flynn", "Talia", "Kai"],
  holly: ["GVO", "Chloe", "Marnie", "Jules"],
  kareem: ["Kareem Talent", "Niko", "Asha"],
  alex: ["Alex Talent", "Rumi", "Bea"],
};

export const seedDeals: Deal[] = [
  { id: "seed-amelia-layo", managerId: "amelia", talentName: "Layo", status: "Confirmed", campaignName: "Roster", monthValues: [72305, 43380, 64550, 91965, 132922, 51048.47, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "seed-sam-zayzz", managerId: "sam", talentName: "Zayzz", status: "Confirmed", campaignName: "Roster", monthValues: [15110, 18500, 27111.26, 71867.94, 25675.19, 28810.94, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "seed-holly-gvo", managerId: "holly", talentName: "GVO", status: "Confirmed", campaignName: "Roster", monthValues: [25383, 20131.74, 19633, 32738, 52262, 37242.66, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "seed-kareem-talent", managerId: "kareem", talentName: "Kareem Talent", status: "Confirmed", campaignName: "Roster", monthValues: [0, 0, 0, 0, 0, 5000, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "seed-alex-talent", managerId: "alex", talentName: "Alex Talent", status: "Confirmed", campaignName: "Roster", monthValues: [0, 0, 0, 0, 0, 500, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "seed-sam-pipeline", managerId: "sam", talentName: "Flynn", status: "Pipeline", campaignName: "Brand launch", monthValues: [0, 0, 0, 0, 0, 0, 28000, 0, 0, 0, 0, 0], costRate: 80 },
];

export const sampleDeals: Deal[] = [
  { id: "sample-amelia-issy-skincare", managerId: "amelia", talentName: "Issy", status: "Confirmed", campaignName: "Glow skincare", monthValues: [0, 18500, 0, 0, 24500, 0, 0, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "sample-amelia-mia-fitness", managerId: "amelia", talentName: "Mia Rae", status: "Confirmed", campaignName: "Fitness app launch", monthValues: [0, 0, 13200, 0, 0, 18800, 0, 0, 0, 0, 0, 0], costRate: 78 },
  { id: "sample-amelia-nell-fashion", managerId: "amelia", talentName: "Nell", status: "Pipeline", campaignName: "Autumn fashion edit", monthValues: [0, 0, 0, 0, 0, 0, 0, 31500, 0, 0, 0, 0], costRate: 82 },
  { id: "sample-sam-flynn-travel", managerId: "sam", talentName: "Flynn", status: "Confirmed", campaignName: "City break content", monthValues: [0, 0, 0, 16900, 0, 0, 20500, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "sample-sam-talia-beauty", managerId: "sam", talentName: "Talia", status: "Confirmed", campaignName: "Beauty drops", monthValues: [0, 9200, 0, 0, 0, 15100, 0, 0, 0, 0, 0, 0], costRate: 76 },
  { id: "sample-sam-kai-audio", managerId: "sam", talentName: "Kai", status: "Pipeline", campaignName: "Audio brand test", monthValues: [0, 0, 0, 0, 0, 0, 0, 0, 17800, 0, 0, 0], costRate: 80 },
  { id: "sample-holly-chloe-food", managerId: "holly", talentName: "Chloe", status: "Confirmed", campaignName: "Food delivery burst", monthValues: [0, 0, 11200, 0, 0, 0, 16400, 0, 0, 0, 0, 0], costRate: 80 },
  { id: "sample-holly-marnie-home", managerId: "holly", talentName: "Marnie", status: "Confirmed", campaignName: "Homeware refresh", monthValues: [0, 0, 0, 0, 22100, 0, 0, 0, 0, 0, 0, 0], costRate: 79 },
  { id: "sample-holly-jules-tech", managerId: "holly", talentName: "Jules", status: "Pipeline", campaignName: "Tech bundle", monthValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 26500, 0, 0], costRate: 81 },
  { id: "sample-kareem-niko-gaming", managerId: "kareem", talentName: "Niko", status: "Confirmed", campaignName: "Gaming headset", monthValues: [0, 0, 0, 9400, 0, 0, 0, 13800, 0, 0, 0, 0], costRate: 80 },
  { id: "sample-kareem-asha-wellness", managerId: "kareem", talentName: "Asha", status: "Pipeline", campaignName: "Wellness retreat", monthValues: [0, 0, 0, 0, 0, 0, 0, 0, 24200, 0, 0, 0], costRate: 78 },
  { id: "sample-alex-rumi-finance", managerId: "alex", talentName: "Rumi", status: "Confirmed", campaignName: "Money app", monthValues: [0, 0, 7600, 0, 0, 0, 0, 11900, 0, 0, 0, 0], costRate: 80 },
  { id: "sample-alex-bea-pets", managerId: "alex", talentName: "Bea", status: "Confirmed", campaignName: "Pet food trial", monthValues: [0, 0, 0, 0, 8600, 0, 0, 0, 0, 12750, 0, 0], costRate: 77 },
  { id: "sample-alex-talent-film", managerId: "alex", talentName: "Alex Talent", status: "Pipeline", campaignName: "Streaming premiere", monthValues: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 19500, 0], costRate: 80 },
];

export const allDeals: Deal[] = [...seedDeals, ...sampleDeals];

export const defaultEmailLeads: EmailLead[] = [
  { id: "email-lead-nyx-layo", managerId: "amelia", from: "partnerships@nyxcosmetics.com", subject: "Layo campaign enquiry - August launch", receivedAt: "2026-07-02T09:18:00.000Z", category: "Deal", talentName: "Layo", company: "NYX Cosmetics", campaignName: "August lip launch", amount: 18000, monthIndex: 7, paymentTerm: "30", contactEmail: "partnerships@nyxcosmetics.com", actionPoint: "Confirm deliverables and proposed usage with Layo.", body: "We would love to discuss Layo for our August lip launch. Budget is around GBP 18,000 for social content and usage." },
  { id: "email-lead-pr-flynn", managerId: "sam", from: "press@daily-drip.co", subject: "PR gifting for Flynn", receivedAt: "2026-07-02T11:42:00.000Z", category: "PR", talentName: "Flynn", company: "Daily Drip", campaignName: "Cold brew PR drop", amount: 0, monthIndex: 6, paymentTerm: "30", contactEmail: "press@daily-drip.co", actionPoint: "Send Flynn's preferred postal details if they want the PR drop.", body: "We would love to send Flynn our new cold brew launch package. No commercial deliverables, just gifting." },
  { id: "email-lead-event-chloe", managerId: "holly", from: "events@prime-studios.com", subject: "Chloe event invite - creator dinner", receivedAt: "2026-07-02T15:05:00.000Z", category: "Event", talentName: "Chloe", company: "Prime Studios", campaignName: "Creator dinner", amount: 0, monthIndex: 6, paymentTerm: "30", contactEmail: "events@prime-studios.com", eventDate: "2026-07-24", actionPoint: "Check Chloe's availability and dietary requirements.", body: "We would like to invite Chloe to an intimate creator dinner on 24 July. Please let us know availability." },
];

export const defaultCollectiveDeals: CollectiveDeal[] = [
  { id: "collective-sample-retail-launch", ownerId: "collective-george", company: "John Lewis", dealName: "Retail creator strategy", contactName: "Priya Shah", emailContact: "priya.shah@johnlewis.example", stage: "Negotiation", amount: 84000, paymentTerm: "30", customPaymentDays: 0, monthValues: [0, 28000, 0, 28000, 0, 28000, 0, 0, 0, 0, 0, 0], xeroOrg: "Cowshed Collective Sales", xeroInvoiceId: "", xeroStatus: "", notes: "Split across campaign planning, launch and reporting.", updatedAt: "2026-07-03T08:00:00.000Z" },
  { id: "collective-sample-hospitality", ownerId: "collective-mia", company: "Soho House", dealName: "Membership content partnership", contactName: "Alex Green", emailContact: "alex.green@sohohouse.example", stage: "Contract Signed", amount: 56000, paymentTerm: "45", customPaymentDays: 0, monthValues: [0, 0, 0, 0, 28000, 0, 28000, 0, 0, 0, 0, 0], xeroOrg: "Cowshed Collective Sales", xeroInvoiceId: "", xeroStatus: "", notes: "Awaiting final PO before invoicing.", updatedAt: "2026-07-03T08:05:00.000Z" },
  { id: "collective-sample-tech", ownerId: "collective-james", company: "Samsung", dealName: "Always-on social retainer", contactName: "Nadia Wells", emailContact: "nadia.wells@samsung.example", stage: "To Be Invoiced", amount: 120000, paymentTerm: "60", customPaymentDays: 0, monthValues: [0, 0, 0, 0, 0, 30000, 30000, 30000, 30000, 0, 0, 0], xeroOrg: "Cowshed Collective Sales", xeroInvoiceId: "CC-XERO-DRAFT-1024", xeroStatus: "Draft invoice created in Collective Xero", notes: "Different Xero organisation to Creators.", updatedAt: "2026-07-03T08:10:00.000Z" },
];

export function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "finance") return "Finance";
  if (role === "operations") return "Operations";
  if (role === "production") return "Production";
  return "Talent manager";
}

export function talentOptions(managerId: string): string[] {
  return defaultTalents[managerId] || [];
}
