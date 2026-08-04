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
import ManagersView from "./ManagersView";
import PermissionsView from "./PermissionsView";
import ApprovalsView from "./ApprovalsView";
import TalentView from "./TalentView";
import TalentInvoicesView from "./TalentInvoicesView";
import FinanceActionsView from "./FinanceActionsView";
import PaymentRunsView from "./PaymentRunsView";
import ProductionChargebacksView from "./ProductionChargebacksView";
import OverheadsView from "./OverheadsView";
import TalentExpensesView from "./TalentExpensesView";
import ExpensesView from "./ExpensesView";

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
  "managers": ManagersView,
  "permissions": PermissionsView,
  "approvals": ApprovalsView,
  "talent": TalentView,
  "talent-invoices": TalentInvoicesView,
  "finance-actions": FinanceActionsView,
  "payment-runs": PaymentRunsView,
  "production-chargebacks": ProductionChargebacksView,
  "overheads": OverheadsView,
  "talent-expenses": TalentExpensesView,
  "expenses": ExpensesView,
};
