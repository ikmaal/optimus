import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { fleetSpecsForCar } from "@/lib/fleet/car-info";
import {
  ALL_CAPTURE_KINDS,
  type CaptureKind,
} from "@/lib/inspection/capture-kinds";
import { inspectionConfig } from "@/lib/inspection/config";
import { extractVehicleReadings } from "@/lib/openai/vision";
import { prisma } from "@/lib/prisma";
import { uploadInspectionPhoto } from "@/lib/storage/supabase";

type Params = { params: Promise<{ id: string }> };

const MAX_BYTES = 8 * 1024 * 1024;

function bufferToDataUrl(buffer: Buffer, contentType: string): string {
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const config = inspectionConfig();

  if (!config.enabled && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "AI scanning is not configured." },
      { status: 501 },
    );
  }

  const car = await prisma.car.findFirst({ where: { id, active: true } });
  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const files = new Map<CaptureKind, { file: File; buffer: Buffer; contentType: string }>();

  for (const kind of ALL_CAPTURE_KINDS) {
    const entry = form.get(kind);
    if (!(entry instanceof File)) {
      return NextResponse.json(
        { error: `Photo '${kind}' is required.` },
        { status: 400 },
      );
    }
    if (entry.size > MAX_BYTES) {
      return NextResponse.json({ error: `Photo '${kind}' is too large.` }, { status: 413 });
    }
    const contentType = entry.type || "image/jpeg";
    files.set(kind, {
      file: entry,
      buffer: Buffer.from(await entry.arrayBuffer()),
      contentType,
    });
  }

  const dashboard = files.get("dashboard")!;
  const cashcard = files.get("cashcard")!;

  const inspectionId = randomUUID();
  const photoPaths: string[] = [];
  if (config.enabled) {
    try {
      const paths = await Promise.all(
        ALL_CAPTURE_KINDS.map((kind) => {
          const { buffer, contentType } = files.get(kind)!;
          return uploadInspectionPhoto(id, inspectionId, kind, buffer, contentType);
        }),
      );
      photoPaths.push(...paths);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Photo upload failed" },
        { status: 502 },
      );
    }
  }

  let readings;
  try {
    const specs = fleetSpecsForCar(car);
    readings = await extractVehicleReadings(
      bufferToDataUrl(dashboard.buffer, dashboard.contentType),
      bufferToDataUrl(cashcard.buffer, cashcard.contentType),
      { fuelGaugeHint: specs.fuelGaugeHint },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI extraction failed" },
      { status: 502 },
    );
  }

  const fuelLitres =
    readings.fuelFraction === null
      ? null
      : Math.round(readings.fuelFraction * car.fuelTankLitres);

  return NextResponse.json({
    odometerKm: readings.odometerKm,
    fuelFraction: readings.fuelFraction,
    fuelLitres,
    fuelTankLitres: car.fuelTankLitres,
    cashcardBalance: readings.cashcardBalance,
    cashcardCapturedAt: readings.cashcardCapturedAt,
    confidence: readings.confidence,
    notes: readings.notes,
    photoPaths,
    aiRaw: readings.raw,
  });
}
