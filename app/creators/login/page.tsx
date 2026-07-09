"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { loginCreators, resetPortal } from "@/redux/features/session/sessionSlice";
import { creatorViewsByRole } from "@/config/navigation";
import { useLoginMutation } from "@/redux/api/authApi";

// A few seeded demo logins so the app is usable out of the box.
const demoAccounts = [
  { name: "Admin", email: "admin@cowshed.test" },
  { name: "Finance", email: "finance@cowshed.test" },
  { name: "Amelia (Manager)", email: "amelia@cowshed.test" },
  { name: "Production", email: "production@cowshed.test" },
];
const DEMO_PASSWORD = "cowshed";

export default function CreatorsLoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [email, setEmail] = useState("admin@cowshed.test");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const { token, user } = await login({ email, password, portal: "creators" }).unwrap();
      dispatch(loginCreators({ user, token }));
      const firstView = creatorViewsByRole[user.role]?.[0]?.id || "pl-live";
      router.push(`/creators/${firstView}`);
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Could not sign in. Is the backend running?";
      setError(message);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-intro">
          <div>
            <p className="eyebrow">Creator Portal</p>
            <Image className="login-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={360} height={120} priority />
            <h1>Sign in</h1>
            <p>Role-based workspace for live P&amp;L, pipeline, overheads, manager rosters, and deal submissions.</p>
          </div>
          <div className="login-demo">
            <p className="eyebrow">Demo accounts</p>
            <span>Password for all: <code>{DEMO_PASSWORD}</code></span>
            <ul>
              {demoAccounts.map((a) => (
                <li key={a.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                      setError(null);
                    }}
                  >
                    {a.name} — {a.email}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in to your workspace</h2>
          </div>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cowshed.test"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          <button className="primary" type="submit" disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-alt">
            New here? <Link href="/creators/signup">Create an account</Link>
          </p>

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
