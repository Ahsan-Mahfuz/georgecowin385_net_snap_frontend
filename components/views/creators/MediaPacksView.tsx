"use client";

import { useMemo, useState } from "react";
import { useCreatorsTeam } from "@/hooks/useCreatorsTeam";
import { useGetTalentsQuery } from "@/redux/api/talentApi";
import { refId } from "@/lib/adapters";
import type { ApiTalent } from "@/redux/api/types";

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
  talent: ApiTalent;
}

export default function MediaPacksView() {
  const { users } = useCreatorsTeam();
  const { data: talentData = [] } = useGetTalentsQuery();
  const managerName = (id: string) => users.find((u) => u.id === id)?.name || "Unassigned";

  const rows = useMemo<RosterRow[]>(
    () =>
      (talentData as ApiTalent[])
        .map((t) => {
          const managerId = refId(t.manager);
          return { key: talentKey(managerId, t.name), managerId, talentName: t.name, talent: t };
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

  const downloadMediaPack = () => {
    const chosen = rows.filter((row) => selectedKeys.includes(row.key));
    if (!chosen.length) {
      if (typeof window !== "undefined") window.alert("Select at least one talent first.");
      return;
    }
    const cards = chosen
      .map((row) => {
        const t = row.talent;
        const img = t.imageUrl || generatedTalentImage(row.managerId, row.talentName);
        const bioText = t.bio || "No bio added yet.";
        const handlesHtml = [
          t.handles?.instagram ? `<p><strong>Instagram:</strong> ${t.handles.instagram}</p>` : "",
          t.handles?.tiktok ? `<p><strong>TikTok:</strong> ${t.handles.tiktok}</p>` : "",
          t.handles?.youtube ? `<p><strong>YouTube:</strong> ${t.handles.youtube}</p>` : "",
        ].filter(Boolean).join("");

        return `
          <section class="pack">
            <img src="${img}" alt="" />
            <div class="meta">
              <h2>${row.talentName}</h2>
              <p class="manager">Managed by ${managerName(row.managerId)}</p>
              <div class="bio">${bioText}</div>
              <div class="socials">${handlesHtml || "<p>No social handles added yet.</p>"}</div>
              <p class="brand">COWSHED CREATORS · MEDIA PACK</p>
            </div>
          </section>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Cowshed Media Pack</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111; background: #fdfdfd; }
        .pack { page-break-after: always; padding: 48px; display: flex; gap: 32px; align-items: center; min-height: 100vh; }
        .pack img { width: 45%; max-width: 420px; border-radius: 16px; object-fit: cover; }
        .meta { flex: 1; }
        .meta h2 { font-size: 44px; margin: 0 0 8px; color: #111; }
        .meta .manager { font-size: 18px; margin: 4px 0 16px; color: #666; }
        .meta .bio { font-size: 16px; line-height: 1.5; margin-bottom: 24px; color: #333; }
        .meta .socials p { font-size: 16px; margin: 6px 0; color: #222; }
        .meta .brand { margin-top: 32px; letter-spacing: 4px; font-weight: 800; font-size: 14px; color: #111; }
        @media print { .pack { min-height: auto; height: 100vh; } }
      </style></head><body>${cards}</body></html>`;
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Please allow pop-ups to download the media pack.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => win.print();
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
            Managers can build a media pack for any talent on the roster. Edit profile and social details in the Talent tab.
          </div>
        </div>
        <div className="section-body media-pack-grid">
          {rows.map((row) => {
            const t = row.talent;
            const activeHandles = Object.values(t.handles || {}).filter(Boolean);
            const platformCount = activeHandles.length;
            const bioReady = Boolean(t.bio?.trim());
            return (
              <label className="media-pack-option" key={row.key}>
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(row.key)}
                  onChange={() => toggleKey(row.key)}
                />
                <img src={t.imageUrl || generatedTalentImage(row.managerId, row.talentName)} alt="" />
                <span>
                  <strong>{row.talentName}</strong>
                  <small>
                    {managerName(row.managerId)} · {platformCount} social handle{platformCount === 1 ? "" : "s"} ·{" "}
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
          <button className="primary" type="button" onClick={downloadMediaPack}>
            Download media pack PDF
          </button>
        </div>
      </section>
    </>
  );
}
