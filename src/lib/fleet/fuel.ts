export type FuelLevel = "low" | "medium" | "ok";

const LOW_THRESHOLD = 0.25;
const MEDIUM_THRESHOLD = 0.5;

export function fuelPercent(litres: number, tankLitres: number): number {
  if (tankLitres <= 0) return 0;
  return Math.min(100, Math.max(0, (litres / tankLitres) * 100));
}

export function fuelLevel(litres: number, tankLitres: number): FuelLevel {
  const ratio = fuelPercent(litres, tankLitres) / 100;
  if (ratio <= LOW_THRESHOLD) return "low";
  if (ratio <= MEDIUM_THRESHOLD) return "medium";
  return "ok";
}

export function formatFuelLitres(litres: number): string {
  const rounded = Math.round(litres * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function fuelTopUpHint(level: FuelLevel): string | null {
  switch (level) {
    case "low":
      return "Petrol is low — please top up before your next booking.";
    case "medium":
      return "About half a tank — consider topping up on longer trips.";
    default:
      return null;
  }
}
