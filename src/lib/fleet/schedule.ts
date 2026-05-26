import { addDays, startOfDay } from "date-fns";
import type { PrismaClient } from "@prisma/client";

export const SCHEDULE_LOOKAHEAD_DAYS = 7;

/** Booking row used in the fleet info schedule (ISO datetimes over the wire). */
export type FleetBookingPreview = {
  id: string;
  carId: string;
  bookerName: string;
  startAt: string;
  endAt: string;
  reason: string | null;
};

type DbBooking = {
  id: string;
  carId: string;
  bookerName: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
};

export function serializeBookingPreview(b: DbBooking): FleetBookingPreview {
  return {
    id: b.id,
    carId: b.carId,
    bookerName: b.bookerName,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    reason: b.reason,
  };
}

export async function listUpcomingFleetBookings(
  prisma: PrismaClient,
  days = SCHEDULE_LOOKAHEAD_DAYS,
): Promise<FleetBookingPreview[]> {
  const now = new Date();
  const rangeEnd = addDays(startOfDay(now), days);

  const rows = await prisma.booking.findMany({
    where: {
      cancelledAt: null,
      endAt: { gt: now },
      startAt: { lt: rangeEnd },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      carId: true,
      bookerName: true,
      startAt: true,
      endAt: true,
      reason: true,
    },
  });

  return rows.map(serializeBookingPreview);
}

export function isBookingActiveNow(booking: FleetBookingPreview, now = new Date()): boolean {
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  return start <= now && now < end;
}

export function activeBookingForCar(
  bookings: FleetBookingPreview[],
  carId: string,
  now = new Date(),
): FleetBookingPreview | null {
  return bookings.find((b) => b.carId === carId && isBookingActiveNow(b, now)) ?? null;
}

export function upcomingBookingsForCar(
  bookings: FleetBookingPreview[],
  carId: string,
  now = new Date(),
): FleetBookingPreview[] {
  return bookings
    .filter((b) => b.carId === carId && new Date(b.endAt) > now)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

export function scheduleRangeIso(days = SCHEDULE_LOOKAHEAD_DAYS): { start: string; end: string } {
  const start = startOfDay(new Date());
  const end = addDays(start, days);
  return { start: start.toISOString(), end: end.toISOString() };
}
