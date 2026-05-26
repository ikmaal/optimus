import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  let body: { bookerName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body with bookerName required" }, { status: 400 });
  }

  const bookerName = typeof body.bookerName === "string" ? body.bookerName.trim() : "";
  if (!bookerName) {
    return NextResponse.json({ error: "bookerName is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({
    where: { id, cancelledAt: null },
  });

  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (booking.bookerName.trim().toLowerCase() !== bookerName.toLowerCase()) {
    return NextResponse.json(
      { error: "Name does not match this booking’s driver (check spelling)." },
      { status: 403 },
    );
  }

  await prisma.booking.update({
    where: { id },
    data: { cancelledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
