"use client";

import { useState } from "react";
import { productionItems, defaultProductionRates } from "@/lib/mock";

function currencyInput(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function ProductionRatesView() {
  const [rates, setRates] = useState<Record<string, string>>(() =>
    productionItems.reduce<Record<string, string>>((acc, item) => {
      acc[item] = currencyInput(defaultProductionRates[item]);
      return acc;
    }, {})
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Rates</h1>
        </div>
        <div className="asof">Production day rates</div>
      </div>
      <div className="layout">
        <section className="section soft-section">
          <div className="section-head">
            <h2>Production rates</h2>
            <span className="pill admin">Admin + Operations + Production</span>
          </div>
          <div className="section-body">
            <div className="form-grid">
              {productionItems.map((item) => (
                <div className="field" key={item}>
                  <label>{item}</label>
                  <input
                    data-production-rate={item}
                    value={rates[item]}
                    inputMode="decimal"
                    onChange={(e) =>
                      setRates((prev) => ({ ...prev, [item]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
