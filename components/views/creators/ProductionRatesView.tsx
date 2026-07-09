"use client";

import { useEffect, useState } from "react";
import { productionItems } from "@/lib/mock";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/redux/api/settingsApi";

export default function ProductionRatesView() {
  const { data: settings } = useGetSettingsQuery();
  const [updateSettings, { isLoading }] = useUpdateSettingsMutation();

  const [rates, setRates] = useState<Record<string, string>>({});

  // Seed the editable fields from live settings once they arrive.
  useEffect(() => {
    const live = settings?.productionRates || {};
    setRates(productionItems.reduce<Record<string, string>>((acc, item) => {
      acc[item] = String(live[item] ?? 0);
      return acc;
    }, {}));
  }, [settings]);

  const handleSave = async () => {
    const productionRates = productionItems.reduce<Record<string, number>>((acc, item) => {
      acc[item] = Number(rates[item]) || 0;
      return acc;
    }, {});
    await updateSettings({ productionRates });
  };

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
                  <label>{item} (£/day)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={rates[item] ?? ""}
                    onChange={(e) => setRates((prev) => ({ ...prev, [item]: e.target.value }))}
                  />
                </div>
              ))}
              <button className="primary wide" type="button" onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving…" : "Save rates"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
