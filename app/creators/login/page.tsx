"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { loginCreators, resetPortal } from "@/redux/features/session/sessionSlice";
import { users, roleLabel, Profile } from "@/lib/mock";
import { creatorViewsByRole } from "@/config/navigation";

// Login order mirrors loginUsers() in the prototype: admin, finance, operations, production, managers.
const loginUsers: Profile[] = [
  ...users.filter((u) => u.role === "admin"),
  ...users.filter((u) => u.role === "finance"),
  ...users.filter((u) => u.role === "operations"),
  ...users.filter((u) => u.role === "production"),
  ...users.filter((u) => u.role === "manager"),
];

export default function CreatorsLoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [profileId, setProfileId] = useState(loginUsers[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = loginUsers.find((u) => u.id === profileId);
    if (!profile) return;
    dispatch(loginCreators(profile));
    const firstView = creatorViewsByRole[profile.role][0]?.id || "pl-live";
    router.push(`/creators/${firstView}`);
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-intro">
          <div>
            <p className="eyebrow">MVP prototype</p>
            <Image className="login-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={360} height={120} priority />
            <h1>Creator Portal</h1>
            <p>Role-based workspace for live P&amp;L, pipeline, overheads, manager rosters, and deal submissions.</p>
          </div>
          <div className="notice">Prototype login: choose admin, operations, finance, or a manager profile to test each workspace view.</div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Sign in</p>
            <h2>Choose workspace access</h2>
          </div>
          <div className="field">
            <label htmlFor="profile">Profile</label>
            <select id="profile" name="profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {loginUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {roleLabel(user.role)}
                </option>
              ))}
            </select>
          </div>
          <button className="primary" type="submit">Continue</button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              dispatch(resetPortal());
              router.push("/");
            }}
          >
            Back to portal selection
          </button>
        </form>
      </section>
    </main>
  );
}
