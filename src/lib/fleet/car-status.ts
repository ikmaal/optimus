import type { FleetCar } from "@/lib/fleet/queries";
import { activeBookingForCar, type FleetBookingPreview } from "@/lib/fleet/schedule";

export type CarOperationalStatus = "parked" | "driving" | "workshop";

const WORKSHOP_REASON = /workshop|service|repair|maintenance|servicing|mechanic|tyre|tire|wash/i;

function isWorkshopBooking(booking: FleetBookingPreview): boolean {
  return WORKSHOP_REASON.test(booking.reason ?? "");
}

/** Where the car is right now — inferred from active bookings and parking. */
export function carOperationalStatus(
  car: FleetCar,
  bookings: FleetBookingPreview[],
  now = new Date(),
): CarOperationalStatus {
  const active = activeBookingForCar(bookings, car.id, now);
  if (active) {
    if (isWorkshopBooking(active)) return "workshop";
    return "driving";
  }
  return "parked";
}

export function statusLabel(status: CarOperationalStatus): string {
  switch (status) {
    case "parked":
      return "Parked";
    case "driving":
      return "Out driving";
    case "workshop":
      return "At workshop";
  }
}

export function statusDetail(
  car: FleetCar,
  status: CarOperationalStatus,
  bookings: FleetBookingPreview[],
  now = new Date(),
): string {
  const active = activeBookingForCar(bookings, car.id, now);
  switch (status) {
    case "parked":
      return car.parkedLot ? `Basement · ${car.parkedLot}` : "In basement carpark";
    case "driving":
      return active ? `With ${active.bookerName}` : "On the road";
    case "workshop":
      return active?.reason?.trim() || "Scheduled for service";
  }
}
