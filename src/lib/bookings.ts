import { prisma } from "@/lib/prisma";

/**
 * Standard interval overlap: [start1,end1) style not used — closed intervals, overlap if start1 < end2 && start2 < end1
 */
export async function hasOverlap(
  carId: string,
  startAt: Date,
  endAt: Date,
  excludeBookingId?: string,
): Promise<boolean> {
  if (startAt >= endAt) return true;

  const conflict = await prisma.booking.findFirst({
    where: {
      carId,
      cancelledAt: null,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
    },
    select: { id: true },
  });

  return conflict !== null;
}
