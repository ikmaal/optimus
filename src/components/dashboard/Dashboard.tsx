"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { DashboardHeader, type DashboardView } from "@/components/dashboard/DashboardHeader";
import type { FleetCar } from "@/lib/fleet/queries";
import {
  scheduleRangeIso,
  type FleetBookingPreview,
  SCHEDULE_LOOKAHEAD_DAYS,
} from "@/lib/fleet/schedule";

const FleetInfoSection = dynamic(
  () => import("@/components/fleet/FleetInfoSection").then((m) => ({ default: m.FleetInfoSection })),
  { loading: () => <ViewLoading label="Loading vehicle info…" /> },
);

const BookingCalendar = dynamic(
  () => import("@/components/booking/BookingCalendar").then((m) => ({ default: m.BookingCalendar })),
  { loading: () => <ViewLoading label="Loading calendar…" /> },
);

type Props = {
  cars: FleetCar[];
  upcomingBookings: FleetBookingPreview[];
};

export function Dashboard({ cars, upcomingBookings: initialBookings }: Props) {
  const [view, setView] = useState<DashboardView>("calendar");
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookings, setBookings] = useState(initialBookings);

  const refreshSchedule = useCallback(async () => {
    const { start, end } = scheduleRangeIso(SCHEDULE_LOOKAHEAD_DAYS);
    const params = new URLSearchParams({ start, end });
    const res = await fetch(`/api/bookings?${params}`);
    if (!res.ok) return;
    const data: {
      bookings: Array<FleetBookingPreview & { car?: unknown }>;
    } = await res.json();
    setBookings(
      data.bookings.map(({ id, carId, bookerName, startAt, endAt, reason }) => ({
        id,
        carId,
        bookerName,
        startAt,
        endAt,
        reason,
      })),
    );
  }, []);

  const bumpCalendar = useCallback(() => {
    setRefreshKey((k) => k + 1);
    void refreshSchedule();
  }, [refreshSchedule]);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 md:px-8 lg:py-14">
      <div className="flex min-w-0 flex-col space-y-8">
        <DashboardHeader view={view} onViewChange={setView} />

        {view === "info" ? (
          <FleetInfoSection cars={cars} bookings={bookings} />
        ) : (
          <>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Click and drag on the grid to choose a time. Each block shows who booked and why.
            </p>
            <BookingCalendar cars={cars} refreshKey={refreshKey} onBookingChanged={bumpCalendar} />
          </>
        )}
      </div>
    </div>
  );
}

function ViewLoading({ label }: { label: string }) {
  return (
    <p className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}
