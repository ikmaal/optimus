import { NextResponse } from "next/server";
import { fleetCarSelect } from "@/lib/fleet/queries";
import { findLotByLabel } from "@/lib/map/load-map-data";
import { loadCarparkMapDataServer } from "@/lib/map/load-map-data-server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  let body: { parkedLot?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parkedLot = typeof body.parkedLot === "string" ? body.parkedLot.trim() : "";
  if (!parkedLot) {
    return NextResponse.json({ error: "parkedLot is required" }, { status: 400 });
  }

  const mapData = await loadCarparkMapDataServer();
  if (!findLotByLabel(mapData, parkedLot)) {
    return NextResponse.json({ error: "Unknown car lot — pick a lot from the map list." }, { status: 400 });
  }

  const car = await prisma.car.findFirst({ where: { id, active: true } });
  if (!car) {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }

  const updated = await prisma.car.update({
    where: { id },
    data: { parkedLot, parkedLotUpdatedAt: new Date() },
    select: fleetCarSelect,
  });

  return NextResponse.json({ car: updated });
}
