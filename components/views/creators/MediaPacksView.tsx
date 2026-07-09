"use client";

import { useMemo, useState } from "react";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { refId } from "@/lib/adapters";

function talentKey(managerId: string, talentName: string): string {
  return `${managerId}::${talentName}`;
}

function hashString(value: string): number {
  return String(value || "")
    .split("")
    .reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function generatedTalentImage(managerId: string, talentName: string): string {
  const colors = ["#f6ee45", "#37b8a9", "#ef6aa4", "#111111", "#f1f4ef"];
  const hash = Math.abs(hashString(`${managerId}-${talentName}`));
  const bg = colors[hash % colors.length];
  const fg = bg === "#111111" ? "#f6ee45" : "#111111";
  const initials = String(talentName || "?")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100" viewBox="0 0 900 1100"><rect width="900" height="1100" fill="${bg}"/><circle cx="735" cy="185" r="120" fill="${fg}" opacity=".12"/><circle cx="135" cy="920" r="180" fill="${fg}" opacity=".1"/><text x="450" y="560" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="170" font-weight="900" fill="${fg}">${initials}</text><text x="450" y="680" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" letter-spacing="8" fill="${fg}">COWSHED</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface RosterRow {
  key: string;
  managerId: string;
  talentName: string;
}

export default function MediaPacksView() {
  const { users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  const rows = useMemo<RosterRow[]>(
    () =>
      talentData
        .map((t) => {
          const managerId = refId(t.manager);
          return { key: talentKey(managerId, t.name), managerId, talentName: t.name };
        })
        .sort(
          (a, b) =>
            a.talentName.localeCompare(b.talentName) ||
            (users.find((u) => u.id === a.managerId)?.name || "").localeCompare(
              users.find((u) => u.id === b.managerId)?.name || "",
            ),
        ),
    [talentData, users],
  );
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Media Packs</h1>
        </div>
        <div className="asof">Build polished talent media packs from the roster database</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Media pack builder</h2>
          <span className="pill">{selectedKeys.length} selected</span>
        </div>
        <div className="section-body">
          <div className="notice">
            Managers can build a media pack for any talent on the roster. Only the owning manager can
            edit that talent&apos;s profile details.
          </div>
        </div>
        <div className="section-body media-pack-grid">
          {rows.map((row) => {
            // Default profile on first load: no bio, no enabled platforms.
            const platformCount = 0;
            const bioReady = false;
            return (
              <label className="media-pack-option" key={row.key}>
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(row.key)}
                  onChange={() => toggleKey(row.key)}
                />
                <img src={generatedTalentImage(row.managerId, row.talentName)} alt="" />
                <span>
                  <strong>{row.talentName}</strong>
                  <small>
                    {managerName(row.managerId)} · {platformCount} platforms ·{" "}
                    {bioReady ? "Bio ready" : "Bio needed"}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        <div className="section-body media-action-row">
          <button
            className="secondary"
            type="button"
            onClick={() => setSelectedKeys(rows.map((row) => row.key))}
          >
            Select all
          </button>
          <button className="secondary" type="button" onClick={() => setSelectedKeys([])}>
            Clear
          </button>
          <button className="primary" type="button">
            Download media pack PDF
          </button>
        </div>
      </section>
    </>
  );
}
