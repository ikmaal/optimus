"use client";

import { format, isSameDay } from "date-fns";
import {
  activeBookingForCar,
  upcomingBookingsForCar,
  type FleetBookingPreview,
  SCHEDULE_LOOKAHEAD_DAYS,
} from "@/lib/fleet/schedule";

type Props = {
  carId: string;
  bookings: FleetBookingPreview[];
};

export function CarSchedulePanel({ carId, bookings }: Props) {
  const now = new Date();
  const active = activeBookingForCar(bookings, carId, now);
  const upcoming = upcomingBookingsForCar(bookings, carId, now);

  return (
    <div
      className="mt-6 rounded-[var(--radius-md)] border px-4 py-4"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--surface-muted)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Schedule
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            Next {SCHEDULE_LOOKAHEAD_DAYS} days
          </p>
        </div>
        <UsageBadge inUse={Boolean(active)} />
      </div>

      {active ? (
        <div
          className="mt-4 rounded-[var(--radius-sm)] border px-3 py-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--accent) 28%, var(--border-subtle))",
            background: "color-mix(in srgb, var(--accent) 8%, var(--surface-elevated))",
          }}
        >
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
            In use now — {active.bookerName}
          </p>
          <p className="mt-1 text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
            Until {format(new Date(active.endAt), "EEE d MMM · h:mm a")}
          </p>
          {active.reason?.trim() ? (
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {active.reason.trim()}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Available right now — no active booking.
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {upcoming.length === 0 ? (
          <li className="text-sm" style={{ color: "var(--text-muted)" }}>
            No upcoming bookings in the next {SCHEDULE_LOOKAHEAD_DAYS} days.
          </li>
        ) : (
          upcoming.map((b) => {
            const start = new Date(b.startAt);
            const end = new Date(b.endAt);
            const sameDay = isSameDay(start, end);
            const timeLabel = sameDay
              ? `${format(start, "EEE d MMM · h:mm a")} – ${format(end, "h:mm a")}`
              : `${format(start, "EEE d MMM · h:mm a")} – ${format(end, "EEE d MMM · h:mm a")}`;

            return (
              <li
                key={b.id}
                className="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--surface-elevated)",
                }}
              >
                <p className="font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {timeLabel}
                </p>
                <p className="mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {b.bookerName}
                  {b.reason?.trim() ? ` · ${b.reason.trim()}` : ""}
                </p>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function UsageBadge({ inUse }: { inUse: boolean }) {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide"
      style={{
        color: inUse ? "var(--accent)" : "var(--text-secondary)",
        background: inUse
          ? "color-mix(in srgb, var(--accent) 12%, var(--surface-elevated))"
          : "var(--surface-elevated)",
        boxShadow: "0 0 0 1px var(--border-subtle)",
      }}
    >
      {inUse ? "In use" : "Available"}
    </span>
  );
}
