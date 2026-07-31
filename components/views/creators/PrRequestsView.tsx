"use client";

import LeadsWorkspace from "./LeadsWorkspace";

export default function PrRequestsView() {
  return (
    <LeadsWorkspace
      category="PR"
      title="PR Requests"
      subtitle="Gifting, press samples and non-commercial talent requests"
      listLabel="Active PR requests"
      emptyMessage="No active PR requests. Add them here or from Email Leads."
    />
  );
}
