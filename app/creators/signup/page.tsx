"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { resetPortal } from "@/redux/features/session/sessionSlice";
import { useSignupMutation } from "@/redux/api/authApi";
import { roleLabel, type Role } from "@/lib/mock";

// Roles a person may request for themselves. Admin is assigned by an admin at approval.
const requestableRoles: Role[] = ["manager", "finance", "operations", "production"];

export default function CreatorsSignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [signup, { isLoading }] = useSignupMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("manager");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Please enter your full name.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        portal: "creators",
      }).unwrap();
      setDone(true);
    } catch (err) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Could not create account. Is the backend running?";
      setError(message);
    }
  };

  if (done) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="login-intro">
            <div>
              <p className="eyebrow">Creator Portal</p>
              <Image className="login-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={360} height={120} priority />
              <h1>Almost there</h1>
              <p>Your request has been submitted.</p>
            </div>
          </div>
          <div className="login-form">
            <div className="auth-success" role="status">
              <strong>Account created — pending approval</strong>
              <p>
                Thanks, {name.trim()}. An admin needs to approve your <b>{roleLabel(role)}</b> access before
                you can sign in. You&apos;ll be able to log in with <b>{email.trim().toLowerCase()}</b> once approved.
              </p>
            </div>
            <Link className="primary as-button" href="/creators/login">Go to sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-intro">
          <div>
            <p className="eyebrow">Creator Portal</p>
            <Image className="login-logo" src="/cowshed-creators-logo.png" alt="Cowshed Creators" width={360} height={120} priority />
            <h1>Create account</h1>
            <p>Request access to the Creators workspace. An admin approves new accounts before first sign-in.</p>
          </div>
          <div className="notice">New accounts start as <b>pending</b> and appear in the admin&apos;s Permissions screen for approval.</div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Sign up</p>
            <h2>Request workspace access</h2>
          </div>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cowshed.test" />
          </div>
          <div className="field">
            <label htmlFor="role">Requested role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {requestableRoles.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </div>

          <button className="primary" type="submit" disabled={isLoading}>
            {isLoading ? "Creating…" : "Create account"}
          </button>

          <p className="auth-alt">
            Already have an account? <Link href="/creators/login">Sign in</Link>
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
