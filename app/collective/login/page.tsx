"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { loginCollective, resetPortal } from "@/redux/features/session/sessionSlice";
import { collectiveSalesUsers } from "@/lib/mock";

export default function CollectiveLoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [profileId, setProfileId] = useState(collectiveSalesUsers[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = collectiveSalesUsers.find((u) => u.id === profileId);
    if (!profile) return;
    dispatch(loginCollective(profile));
    router.push("/collective/collective-crm");
  };

  return (
    <main className="login-page">
      <section className="login-panel collective-login-panel">
        <div className="login-intro collective-login-intro">
          <div>
            <p className="eyebrow">Cowshed Collective</p>
            <Image className="login-logo collective-login-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={360} height={120} priority />
            <h1>Sales CRM</h1>
            <p>A separate sales workspace with its own CRM, payment schedule and simulated Collective Xero status.</p>
          </div>
          <div className="notice">Prototype login: choose a Collective sales profile to test the separate business workspace.</div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Sign in</p>
            <h2>Choose sales access</h2>
          </div>
          <div className="field">
            <label htmlFor="collectiveProfile">Profile</label>
            <select id="collectiveProfile" name="profile" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              {collectiveSalesUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} - {user.role === "admin" ? "Admin" : "Sales"}
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
