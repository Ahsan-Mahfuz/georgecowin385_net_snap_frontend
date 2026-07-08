import { ComponentType } from "react";
import PlLiveView from "./PlLiveView";
import LeaderboardView from "./LeaderboardView";
import CommissionView from "./CommissionView";
import CrmView from "./CrmView";
import BrandsView from "./BrandsView";
import ReportsView from "./ReportsView";
import ProductionView from "./ProductionView";
import ProductionRequestsView from "./ProductionRequestsView";
import ProductionRatesView from "./ProductionRatesView";
import CashflowView from "./CashflowView";
import ManagersView from "./ManagersView";
import PermissionsView from "./PermissionsView";
import ApprovalsView from "./ApprovalsView";
import TalentView from "./TalentView";
import MediaPacksView from "./MediaPacksView";
import TalentInvoicesView from "./TalentInvoicesView";
import FinanceActionsView from "./FinanceActionsView";
import ProductionChargebacksView from "./ProductionChargebacksView";
import OverheadsView from "./OverheadsView";
import TalentExpensesView from "./TalentExpensesView";
import ExpensesView from "./ExpensesView";
import EmailLeadsView from "./EmailLeadsView";
import PrRequestsView from "./PrRequestsView";
import EventsView from "./EventsView";

export const creatorRegistry: Record<string, ComponentType> = {
  "pl-live": PlLiveView,
  "leaderboard": LeaderboardView,
  "commission": CommissionView,
  "crm": CrmView,
  "brands": BrandsView,
  "reports": ReportsView,
  "production": ProductionView,
  "production-requests": ProductionRequestsView,
  "production-rates": ProductionRatesView,
  "cashflow": CashflowView,
  "managers": ManagersView,
  "permissions": PermissionsView,
  "approvals": ApprovalsView,
  "talent": TalentView,
  "media-packs": MediaPacksView,
  "talent-invoices": TalentInvoicesView,
  "finance-actions": FinanceActionsView,
  "production-chargebacks": ProductionChargebacksView,
  "overheads": OverheadsView,
  "talent-expenses": TalentExpensesView,
  "expenses": ExpensesView,
  "email-leads": EmailLeadsView,
  "pr-requests": PrRequestsView,
  "events": EventsView,
};
