"use client";

import { money } from "@/lib/format";

// ---------------------------------------------------------------------------
// Local types + static data. In the prototype these live on `state.productionRequests`,
// which is empty on first load, so this view renders its empty states.
// ---------------------------------------------------------------------------
type ProductionRequest = {
  id: string;
  managerId: string;
  talentName: string;
  amount: number;
  shootDate: string;
  videoBrief?: string;
  status: string;
  financeStatus?: string;
  items?: string[];
  itemDays?: Record<string, number>;
  chargebackPaymentRunDate?: string;
  chargebackRequestedAt?: string;
};

type CalendarEvent = {
  id: string;
  date: string;
  type: "Shoot" | "Chargeback";
  title: string;
  meta: string;
  amount: number;
};

const productionRequests: ProductionRequest[] = [];

// ---------------------------------------------------------------------------
// Helpers ported from the prototype (app.js)
// ---------------------------------------------------------------------------
function managerName(id: string): string {
  // Production requests are empty until wired to live data; passthrough keeps the
  // (unrendered) cards compiling.
  if (id === "admin") return "Admin";
  return id || "Unassigned";
}

function displayDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function paymentRunDate(year: number, monthIndex: number, runDay: number): string {
  const runDate = new Date(year, monthIndex, runDay);
  if (runDate.getDay() === 6) runDate.setDate(runDate.getDate() - 1);
  if (runDate.getDay() === 0) runDate.setDate(runDate.getDate() - 2);
  return runDate.toISOString().slice(0, 10);
}

function productionPaymentRunDate(shootDate?: string): string {
  if (!shootDate) return "";
  const date = new Date(`${shootDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  const runDay = date.getDate() <= 14 ? 14 : 28;
  return paymentRunDate(date.getFullYear(), date.getMonth(), runDay);
}

function productionItemsLabel(request: ProductionRequest): string {
  const days = request.itemDays || {};
  return (request.items || [])
    .map((item) => {
      const count = Math.max(1, Number(days[item] || 1));
      return `${item} x ${count} ${count === 1 ? "day" : "days"}`;
    })
    .join(", ");
}

function calendarMonthKey(value: string): string {
  if (!value) return "";
  return value.slice(0, 7);
}

function calendarMonthLabel(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}-01T00:00:00`);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function calendarDayNumber(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-GB", { day: "2-digit" });
}

function productionCalendarEvents(requests: ProductionRequest[], includeChargebacks = false): CalendarEvent[] {
  return requests
    .flatMap((request) => {
      const events: CalendarEvent[] = [
        {
          id: `${request.id}-shoot`,
          date: request.shootDate,
          type: "Shoot",
          title: request.talentName,
          meta: `${managerName(request.managerId)} · ${productionItemsLabel(request)}`,
          amount: request.amount,
        },
      ];
      if (includeChargebacks) {
        const chargebackDate = request.chargebackPaymentRunDate || productionPaymentRunDate(request.shootDate);
        if (chargebackDate) {
          events.push({
            id: `${request.id}-chargeback`,
            date: chargebackDate,
            type: "Chargeback",
            title: request.talentName,
            meta: `${managerName(request.managerId)} · ${money(request.amount)}`,
            amount: request.amount,
          });
        }
      }
      return events;
    })
    .filter((event) => event.date)
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.type.localeCompare(b.type)
    );
}

function financeProductionChargebacks(): ProductionRequest[] {
  return productionRequests
    .filter((request) => request.status === "Accepted" && request.financeStatus !== "Chargeback requested")
    .sort((a, b) => new Date(a.shootDate).getTime() - new Date(b.shootDate).getTime());
}

function historicalProductionChargebacks(): ProductionRequest[] {
  return productionRequests
    .filter((request) => request.status === "Accepted" && request.financeStatus === "Chargeback requested")
    .sort(
      (a, b) =>
        new Date(b.chargebackRequestedAt || b.shootDate).getTime() -
        new Date(a.chargebackRequestedAt || a.shootDate).getTime()
    );
}

// ---------------------------------------------------------------------------
// Sub-render components
// ---------------------------------------------------------------------------
function ProductionCalendarEvents({ events, emptyMessage }: { events: CalendarEvent[]; emptyMessage: string }) {
  if (!events.length) {
    return (
      <div className="section-body">
        <div className="notice">{emptyMessage}</div>
      </div>
    );
  }
  const grouped = events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    const key = calendarMonthKey(event.date);
    groups[key] = groups[key] || [];
    groups[key].push(event);
    return groups;
  }, {});
  return (
    <div className="section-body production-calendar">
      {Object.entries(grouped).map(([monthKey, monthEvents]) => (
        <div className="calendar-month" key={monthKey}>
          <h3>{calendarMonthLabel(monthKey)}</h3>
          <div className="calendar-event-grid">
            {monthEvents.map((event) => (
              <article
                className={`calendar-event ${event.type === "Chargeback" ? "chargeback-event" : "shoot-event"}`}
                key={event.id}
              >
                <div className="calendar-date">
                  <span>{calendarDayNumber(event.date)}</span>
                  <small>{event.type}</small>
                </div>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.meta}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceProductionChargebackCard({
  request,
  showAction = true,
}: {
  request: ProductionRequest;
  showAction?: boolean;
}) {
  return (
    <article className="deal">
      <div className="deal-line">
        <strong>{request.talentName}</strong>
        <span>{money(request.amount)}</span>
      </div>
      <div className="deal-line muted">
        <span>Manager</span>
        <span>{managerName(request.managerId)}</span>
      </div>
      <div className="deal-line muted">
        <span>Date of shoot</span>
        <span>{displayDate(request.shootDate)}</span>
      </div>
      <div className="deal-line muted">
        <span>Video</span>
        <span>{request.videoBrief || "-"}</span>
      </div>
      <div className="deal-line muted">
        <span>Items</span>
        <span>{productionItemsLabel(request)}</span>
      </div>
      {request.chargebackRequestedAt ? (
        <div className="deal-line muted">
          <span>Requested</span>
          <span>{displayDate(request.chargebackRequestedAt.slice(0, 10))}</span>
        </div>
      ) : null}
      {showAction ? (
        <div className="deal-actions">
          <button className="primary" type="button" data-production-chargeback={request.id}>
            Request charge back
          </button>
        </div>
      ) : null}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export default function ProductionChargebacksView() {
  const pending = financeProductionChargebacks();
  const historical = historicalProductionChargebacks();
  const visibleRequests = productionRequests.filter((request) => request.status === "Accepted");
  const pendingTotal = pending.reduce((total, request) => total + Number(request.amount || 0), 0);
  const historicalTotal = historical.reduce((total, request) => total + Number(request.amount || 0), 0);

  const shootEvents = productionCalendarEvents(visibleRequests, false);
  const chargebackEvents = productionCalendarEvents(visibleRequests, true).filter(
    (event) => event.type === "Chargeback"
  );

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Cowshed Creators Portal</p>
          <h1>Production chargebacks</h1>
        </div>
        <div className="asof">Pending and historical production chargebacks</div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Shoot calendar</h2>
          <span className="pill confirmed">{visibleRequests.length} accepted shoots</span>
        </div>
        <ProductionCalendarEvents events={shootEvents} emptyMessage="No shoot days to show on the calendar yet." />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Chargeback calendar</h2>
          <span className="pill confirmed">{visibleRequests.length} chargeback dates</span>
        </div>
        <ProductionCalendarEvents
          events={chargebackEvents}
          emptyMessage="No chargeback dates to show on the calendar yet."
        />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Pending requests</h2>
          <div className="section-actions">
            <span className="pill pipeline">{pending.length} pending</span>
            <span className="pill confirmed">{money(pendingTotal)}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {pending.length ? (
            pending.map((request) => <FinanceProductionChargebackCard key={request.id} request={request} />)
          ) : (
            <div className="notice">No production chargebacks waiting right now.</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Historical chargebacks</h2>
          <div className="section-actions">
            <span className="pill confirmed">{historical.length} requested</span>
            <span className="pill confirmed">{money(historicalTotal)}</span>
          </div>
        </div>
        <div className="section-body manager-list">
          {historical.length ? (
            historical.map((request) => (
              <FinanceProductionChargebackCard key={request.id} request={request} showAction={false} />
            ))
          ) : (
            <div className="notice">No historical production chargebacks yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
