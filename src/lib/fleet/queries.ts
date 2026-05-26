import type { Prisma } from "@prisma/client";

/** Shared Prisma select for fleet cars in UI and booking API responses. */
export const fleetCarSelect = {
  id: true,
  label: true,
  plate: true,
  fuelLitres: true,
  fuelTankLitres: true,
} satisfies Prisma.CarSelect;

export type FleetCar = Prisma.CarGetPayload<{ select: typeof fleetCarSelect }>;

export async function listActiveFleetCars(prisma: {
  car: { findMany: (args: object) => Promise<FleetCar[]> };
}) {
  return prisma.car.findMany({
    where: { active: true },
    orderBy: { label: "asc" },
    select: fleetCarSelect,
  });
}
