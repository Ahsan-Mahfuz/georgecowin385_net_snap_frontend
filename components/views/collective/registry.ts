import { ComponentType } from "react";
import CollectiveCrmView from "./CollectiveCrmView";
import CollectiveMonthsView from "./CollectiveMonthsView";
import CollectiveQuartersView from "./CollectiveQuartersView";

export const collectiveRegistry: Record<string, ComponentType> = {
  "collective-crm": CollectiveCrmView,
  "collective-months": CollectiveMonthsView,
  "collective-quarters": CollectiveQuartersView,
};
