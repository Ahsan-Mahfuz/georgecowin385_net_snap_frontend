"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { resetPortal } from "@/redux/features/session/sessionSlice";
import { useSignupMutation } from "@/redux/api/authApi";

export default function CollectiveSignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [signup, { isLoading }] = useSignupMutation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        role: "manager", // "Sales" access in the Collective portal
        portal: "collective",
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
        <section className="login-panel collective-login-panel">
          <div className="login-intro collective-login-intro">
            <div>
              <p className="eyebrow">Cowshed Collective</p>
              <Image className="login-logo collective-login-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={360} height={120} priority />
              <h1>Almost there</h1>
              <p>Your request has been submitted.</p>
            </div>
          </div>
          <div className="login-form">
            <div className="auth-success" role="status">
              <strong>Account created — pending approval</strong>
              <p>
                Thanks, {name.trim()}. A Collective admin needs to approve your Sales access before you can
                sign in with <b>{email.trim().toLowerCase()}</b>.
              </p>
            </div>
            <Link className="primary as-button" href="/collective/login">Go to sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel collective-login-panel">
        <div className="login-intro collective-login-intro">
          <div>
            <p className="eyebrow">Cowshed Collective</p>
            <Image className="login-logo collective-login-logo" src="/cowshed-collective-logo.png" alt="Cowshed Collective" width={360} height={120} priority />
            <h1>Create account</h1>
            <p>Request Sales access to the Collective workspace. A Collective admin approves new accounts.</p>
          </div>
          <div className="notice">New accounts start as <b>pending</b> until a Collective admin approves them.</div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Sign up</p>
            <h2>Request sales access</h2>
          </div>

          {error ? <div className="auth-error" role="alert">{error}</div> : null}

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@cowshedcollective.test" />
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
            Already have an account? <Link href="/collective/login">Sign in</Link>
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
