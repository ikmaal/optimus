import type { FleetCar } from "@/lib/fleet/queries";

/** Specs presented in the fleet info UI (not persisted in DB). */
export type FleetCarSpecs = {
  paintHex: string;
  viewerVariant: "red" | "black" | "default";
  /** When set, Info tab 3D viewer loads this GLB instead of the procedural sedan. */
  modelUrl?: string;
  /** Y-axis rotation for GLB exports (radians). */
  modelRotationY?: number;
  bodyStyle: string;
  seats: number;
  drivetrain: string;
  estimatedRangeKm: number;
  powerKw: number;
  torqueNm: number;
  zeroTo100Sec: number;
  /** Hint for GPT-4o vision when reading this car's fuel gauge photo. */
  fuelGaugeHint?: string;
};

const DEFAULT: FleetCarSpecs = {
  paintHex: "#4a6278",
  viewerVariant: "default",
  bodyStyle: "Company sedan",
  seats: 5,
  drivetrain: "FWD",
  estimatedRangeKm: 580,
  powerKw: 140,
  torqueNm: 300,
  zeroTo100Sec: 9.1,
};

export function fleetSpecsForCar(car: FleetCar): FleetCarSpecs {
  switch (car.label) {
    case "Red Car":
      return {
        ...DEFAULT,
        paintHex: "#b71c1c",
        viewerVariant: "red",
        modelUrl: "/models/red-car.glb",
        modelRotationY: Math.PI / 2,
        bodyStyle: "Kia SUV",
        drivetrain: "AWD",
        estimatedRangeKm: 640,
        powerKw: 155,
        torqueNm: 335,
        zeroTo100Sec: 7.9,
        fuelGaugeHint:
          "One dashboard photo: odometer is XXXXXXkm on the centre LCD (bottom of digital display). " +
          "Fuel is the analog 0→1 needle sub-gauge at the bottom of the RIGHT speedometer — " +
          "ignore the large speedometer needle and the left temperature gauge.",
      };
    case "Black Car":
      return {
        ...DEFAULT,
        paintHex: "#1a1a1a",
        viewerVariant: "black",
        modelUrl: "/models/black-car.glb",
        modelRotationY: Math.PI / 2,
        bodyStyle: "Ride-share sedan",
        drivetrain: "AWD",
        estimatedRangeKm: 600,
        powerKw: 180,
        torqueNm: 380,
        zeroTo100Sec: 6.9,
        fuelGaugeHint:
          "One dashboard photo: odometer is XXXXXXkm on the centre LCD (bottom of digital display). " +
          "Fuel is the analog 0→1 needle sub-gauge at the bottom of the RIGHT speedometer — " +
          "ignore the large speedometer needle and the left temperature gauge.",
      };
    default:
      return DEFAULT;
  }
}
