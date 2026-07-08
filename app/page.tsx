"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

export default function PortalChoicePage() {
  const router = useRouter();

  return (
    <main className="portal-choice-page">
      <section className="portal-choice-panel">
        <Image className="portal-main-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={340} height={120} priority />
        <div className="portal-choice-copy">
          <p className="eyebrow">Choose portal</p>
          <h1>Cowshed workspace</h1>
          <p>
            Select the business you want to work in. Creators opens the existing talent portal; Collective Sales opens the
            separate sales CRM and cashflow view.
          </p>
        </div>
        <div className="portal-choice-grid">
          <button className="portal-choice-card creators" type="button" onClick={() => router.push("/creators/login")}>
            <Image src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={260} height={94} />
            <span>Cowshed Creators</span>
            <strong>Creators portal</strong>
            <small>P&amp;L, talent CRM, reports, production, expenses and invoices.</small>
          </button>
          <button className="portal-choice-card collective" type="button" onClick={() => router.push("/collective/login")}>
            <Image src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={260} height={94} />
            <span>Cowshed Collective</span>
            <strong>Sales CRM</strong>
            <small>Sales pipeline, Collective Xero status, monthly cash due and quarter view.</small>
          </button>
        </div>
      </section>
    </main>
  );
}
