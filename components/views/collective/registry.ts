import { ComponentType } from "react";
import CollectiveCrmView from "./CollectiveCrmView";
import CollectiveMonthsView from "./CollectiveMonthsView";
import CollectiveQuartersView from "./CollectiveQuartersView";
import CollectiveCommissionView from "./CollectiveCommissionView";

export const collectiveRegistry: Record<string, ComponentType> = {
  "collective-crm": CollectiveCrmView,
  "collective-months": CollectiveMonthsView,
  "collective-quarters": CollectiveQuartersView,
  "collective-commission": CollectiveCommissionView,
};
