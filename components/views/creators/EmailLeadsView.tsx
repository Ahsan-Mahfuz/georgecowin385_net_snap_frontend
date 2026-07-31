"use client";

import LeadsWorkspace from "./LeadsWorkspace";

export default function EmailLeadsView() {
  return (
    <LeadsWorkspace
      category="Deal"
      title="Email Leads"
      subtitle="Scanned manager emails ready to review, convert, and route"
      listLabel="Email intake"
      emptyMessage="No email leads yet. Add one to start the pipeline."
    />
  );
}
