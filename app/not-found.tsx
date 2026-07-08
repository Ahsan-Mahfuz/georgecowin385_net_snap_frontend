import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login-page">
      <section className="login-panel" style={{ gridTemplateColumns: "1fr" }}>
        <div className="login-form">
          <p className="eyebrow">404</p>
          <h2>View not found</h2>
          <p className="muted">The workspace view you requested does not exist.</p>
          <Link className="primary" href="/" style={{ display: "grid", placeItems: "center", textDecoration: "none" }}>
            Back to portals
          </Link>
        </div>
      </section>
    </main>
  );
}
