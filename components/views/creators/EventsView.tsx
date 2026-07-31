"use client";

import LeadsWorkspace from "./LeadsWorkspace";

export default function EventsView() {
  return (
    <LeadsWorkspace
      category="Event"
      title="Events"
      subtitle="Launches, premieres and appearance requests for talent"
      listLabel="Event requests"
      emptyMessage="No event requests yet. Add them here or from Email Leads."
    />
  );
}
