import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { fleetCarSelect } from "@/lib/fleet/queries";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

type ConfirmBody = {
  driverName?: string;
  odometerKm?: number | null;
  fuelLitres?: number | null;
  fuelFraction?: number | null;
  cashcardBalance?: number | null;
  cashcardCapturedAt?: string | null;
  photoPaths?: string[];
  aiConfidence?: string | null;
  aiRaw?: unknown;
};

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const driverName = typeof body.driverName === "string" ? body.driverName.trim() : "";
  if (!driverName) {
    return NextResponse.json({ error: "driverName is required" }, { status: 400 });
  }

  const odometerKm = toNumberOrNull(body.odometerKm);
  const fuelLitres = toNumberOrNull(body.fuelLitres);
  const fuelFraction = toNumberOrNull(body.fuelFraction);
  const cashcardBalance = toNumberOrNull(body.cashcardBalance);
  const cashcardCapturedAt =
    typeof body.cashcardCapturedAt === "string" && body.cashcardCapturedAt.trim()
      ? new Date(body.cashcardCapturedAt)
      : null;
  if (cashcardCapturedAt && Number.isNaN(cashcardCapturedAt.getTime())) {
    return NextResponse.json({ error: "Invalid cashcardCapturedAt" }, { status: 400 });
  }

  const car = await prisma.car.findFirst({ where: { id, active: true } });
  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  const warnings: string[] = [];
  if (odometerKm !== null && car.odometerKm !== null && odometerKm < car.odometerKm) {
    warnings.push(
      `Odometer (${odometerKm} km) is below the last recorded value (${car.odometerKm} km).`,
    );
  }

  const photoPaths = Array.isArray(body.photoPaths)
    ? body.photoPaths.filter((p): p is string => typeof p === "string")
    : [];

  const carData: Prisma.CarUpdateInput = {};
  if (odometerKm !== null) carData.odometerKm = odometerKm;
  if (fuelLitres !== null) carData.fuelLitres = Math.min(fuelLitres, car.fuelTankLitres);

  const [, updated] = await prisma.$transaction([
    prisma.inspection.create({
      data: {
        carId: id,
        driverName,
        kind: "checkin",
        odometerKm,
        fuelLitres,
        fuelFraction,
        cashcardBalance,
        cashcardCapturedAt,
        aiConfidence: typeof body.aiConfidence === "string" ? body.aiConfidence : null,
        aiRaw: (body.aiRaw ?? undefined) as Prisma.InputJsonValue | undefined,
        photoPaths,
      },
    }),
    prisma.car.update({ where: { id }, data: carData, select: fleetCarSelect }),
  ]);

  return NextResponse.json({ car: updated, warnings });
}
