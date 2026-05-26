"use client";

import { useCallback, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg, EventInput } from "@fullcalendar/core";
import { format } from "date-fns";
import type { FleetCar } from "@/lib/fleet/queries";

type BookingRow = {
  id: string;
  carId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  bookerName: string;
  car: FleetCar;
};

function eventTitle(b: Pick<BookingRow, "car" | "bookerName" | "reason">): string {
  const base = `${b.car.label}: ${b.bookerName}`;
  const r = b.reason?.trim();
  if (!r) return base;
  const short = r.length > 44 ? `${r.slice(0, 41)}…` : r;
  return `${base} — ${short}`;
}

type Props = {
  cars: FleetCar[];
  refreshKey: number;
  onBookingChanged: () => void;
};

export function BookingCalendar({ cars, refreshKey, onBookingChanged }: Props) {
  const [modal, setModal] = useState<{
    mode: "create";
    start: Date;
    end: Date;
  } | null>(null);
  const [detail, setDetail] = useState<EventClickArg | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [reason, setReason] = useState("");

  const carIdForForm = useMemo(
    () => (cars.some((c) => c.id === carId) ? carId : (cars[0]?.id ?? "")),
    [cars, carId],
  );

  const fetchEvents = useCallback(
    async (info: { startStr: string; endStr: string }): Promise<EventInput[]> => {
      const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
      const res = await fetch(`/api/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      const data: {
        bookings: BookingRow[];
        carThemes: Record<string, { backgroundColor: string; borderColor: string; textColor: string }>;
      } = await res.json();
      const defaultTheme = {
        backgroundColor: "#eceef2",
        borderColor: "#64748b",
        textColor: "#1e293b",
      };
      return data.bookings.map((b) => {
        const theme = data.carThemes[b.carId] ?? defaultTheme;
        return {
          id: b.id,
          title: eventTitle(b),
          start: b.startAt,
          end: b.endAt,
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          extendedProps: {
            bookerName: b.bookerName,
            reason: b.reason,
            carLabel: b.car.label,
          },
        };
      });
    },
    [],
  );

  const handleSelect = (arg: DateSelectArg) => {
    setError(null);
    setReason("");
    setFormName("");
    setModal({ mode: "create", start: arg.start, end: arg.end });
    setCarId(cars[0]?.id ?? "");
  };

  const handleCreate = async () => {
    if (!modal || !carIdForForm) return;
    if (!formName.trim()) {
      setError("Enter your name.");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for this booking.");
      return;
    }

    if (modal.end.getTime() <= modal.start.getTime()) {
      setError("Drag across a longer period on the calendar (end time must be after start).");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: carIdForForm,
          startAt: modal.start.toISOString(),
          endAt: modal.end.toISOString(),
          reason: reason.trim(),
          bookerName: formName.trim(),
        }),
      });
      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { error?: string }) : {};
      } catch {
        /* non-JSON error page */
      }
      if (!res.ok) {
        const fromApi = typeof data.error === "string" ? data.error : null;
        const fallback =
          raw && !raw.trimStart().startsWith("{")
            ? raw.replace(/<[^>]+>/g, " ").slice(0, 180).trim()
            : null;
        setError(
          fromApi ??
            fallback ??
            `Request failed (${res.status}). Check the browser network tab or server logs.`,
        );
        return;
      }
      setModal(null);
      onBookingChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id: string, bookerName: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookerName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not cancel");
        return;
      }
      setDetail(null);
      onBookingChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, interactionPlugin], []);

  const confirmDisabled = submitting || !carIdForForm || !formName.trim() || !reason.trim();

  const inputClassName =
    "mt-2 w-full rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm outline-none transition-[box-shadow] focus:ring-2 focus:ring-[color:var(--ring-focus)]";

  return (
    <div className="space-y-5">
      <div
        className="optimus-calendar overflow-hidden rounded-2xl border shadow-[var(--shadow-calendar)]"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--surface-elevated)",
        }}
      >
        <div className="min-h-[34rem] h-[min(70vh,40rem)] sm:min-h-[36rem]">
          <FullCalendar
            key={refreshKey}
            plugins={plugins}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            initialView="timeGridWeek"
            firstDay={1}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            slotLabelInterval="01:00:00"
            editable={false}
            selectable
            selectMirror
            dayMaxEvents
            weekends
            height="100%"
            allDaySlot={false}
            nowIndicator
            select={handleSelect}
            eventClick={(info) => {
              info.jsEvent.preventDefault();
              setDetail(info);
            }}
            events={async (info, successCallback, failureCallback) => {
              try {
                const evts = await fetchEvents(info);
                successCallback(evts);
              } catch (e) {
                failureCallback(e as Error);
              }
            }}
          />
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div
            className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl p-7 shadow-[var(--shadow-card)] ring-1 ring-black/5 dark:ring-white/10"
            style={{ background: "var(--surface-elevated)", borderColor: "var(--border-subtle)" }}
            role="dialog"
            aria-modal
          >
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              New booking
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {format(modal.start, "PPp")} – {format(modal.end, "PPp")}
            </p>

            <div className="mt-5 space-y-5">
              <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Name
                <input
                  type="text"
                  autoComplete="name"
                  required
                  className={inputClassName}
                  style={{
                    background: "var(--surface-input)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Who is booking"
                />
              </label>

              <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Vehicle
                <select
                  className={inputClassName}
                  style={{
                    background: "var(--surface-input)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  value={carIdForForm}
                  onChange={(e) => setCarId(e.target.value)}
                >
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                      {c.plate ? ` (${c.plate})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Reason
                <input
                  className={inputClassName}
                  style={{
                    background: "var(--surface-input)",
                    borderColor: "var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Client meeting downtown"
                  maxLength={500}
                />
              </label>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-red-600 dark:text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDisabled}
                className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-45"
                style={{ background: "var(--accent)" }}
                onClick={() => void handleCreate()}
              >
                {submitting ? "Saving…" : "Confirm booking"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div
            className="w-full max-w-md rounded-2xl p-7 shadow-[var(--shadow-card)] ring-1 ring-black/5 dark:ring-white/10"
            style={{ background: "var(--surface-elevated)" }}
            role="dialog"
            aria-modal
          >
            <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Booking details
            </h2>
            <p className="mt-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {detail.event.title}
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--text-muted)" }}>Driver: </span>
              {String(detail.event.extendedProps.bookerName)}
            </p>
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {format(detail.event.start!, "PPp")} – {format(detail.event.end!, "p")}
            </p>
            {detail.event.extendedProps.reason ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Reason
                </p>
                <p
                  className="mt-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-sm"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: "var(--surface-muted)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {String(detail.event.extendedProps.reason)}
                </p>
              </div>
            ) : null}
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setDetail(null)}
              >
                Close
              </button>
              <button
                type="button"
                disabled={submitting}
                className="rounded-[var(--radius-sm)] bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-45 dark:bg-red-700 dark:hover:bg-red-600"
                onClick={() =>
                  void handleCancelBooking(
                    detail.event.id,
                    String(detail.event.extendedProps.bookerName),
                  )
                }
              >
                Cancel booking
              </button>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-red-600 dark:text-rose-400" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
