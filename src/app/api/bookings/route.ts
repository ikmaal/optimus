import { NextResponse } from "next/server";
import { hasOverlap } from "@/lib/bookings";
import { eventThemeForCarLabel, type CarEventTheme } from "@/lib/fleet/car-themes";
import { fleetCarSelect, listActiveFleetCars } from "@/lib/fleet/queries";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const startRaw = url.searchParams.get("start");
  const endRaw = url.searchParams.get("end");
  if (!startRaw || !endRaw) {
    return NextResponse.json({ error: "start and end query params required (ISO)" }, { status: 400 });
  }

  const rangeStart = new Date(startRaw);
  const rangeEnd = new Date(endRaw);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return NextResponse.json({ error: "Invalid start or end date" }, { status: 400 });
  }

  const cars = await listActiveFleetCars(prisma);
  const themeByCarId = new Map<string, CarEventTheme>();
  cars.forEach((c) => themeByCarId.set(c.id, eventThemeForCarLabel(c.label)));

  const bookings = await prisma.booking.findMany({
    where: {
      cancelledAt: null,
      startAt: { lt: rangeEnd },
      endAt: { gt: rangeStart },
    },
    include: { car: { select: fleetCarSelect } },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json({ bookings, carThemes: Object.fromEntries(themeByCarId) });
}

export async function POST(req: Request) {
  let body: { carId?: string; startAt?: string; endAt?: string; reason?: string; bookerName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const carId = typeof body.carId === "string" ? body.carId : "";
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;
  const bookerName = typeof body.bookerName === "string" ? body.bookerName.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!carId || !startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "carId, startAt, endAt required (ISO datetimes)" }, { status: 400 });
  }

  if (!bookerName) {
    return NextResponse.json({ error: "bookerName is required" }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  if (startAt >= endAt) {
    return NextResponse.json({ error: "End must be after start" }, { status: 400 });
  }

  const car = await prisma.car.findFirst({ where: { id: carId, active: true } });
  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  if (await hasOverlap(carId, startAt, endAt)) {
    return NextResponse.json(
      { error: "This car is already booked for part of that time range." },
      { status: 409 },
    );
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        bookerName,
        startAt,
        endAt,
        reason,
        car: { connect: { id: carId } },
      },
      include: { car: { select: fleetCarSelect } },
    });

    return NextResponse.json({ booking });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/bookings]", message);
    const hint =
      /bookerName|Unknown column|does not exist|Argument `car`/i.test(message)
        ? " Run `npx prisma generate`, delete the `.next` folder, and restart `npm run dev`. If the DB is old, run `npx prisma migrate deploy`."
        : "";
    return NextResponse.json(
      { error: `Could not save booking.${hint} (${message.slice(0, 500)})` },
      { status: 500 },
    );
  }
}
