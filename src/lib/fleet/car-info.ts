import type { FleetCar } from "@/lib/fleet/queries";

/** Specs presented in the fleet info UI (not persisted in DB). */
export type FleetCarSpecs = {
  paintHex: string;
  viewerVariant: "red" | "black" | "default";
  bodyStyle: string;
  seats: number;
  drivetrain: string;
  estimatedRangeKm: number;
  powerKw: number;
  torqueNm: number;
  zeroTo100Sec: number;
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
        bodyStyle: "Executive sedan",
        estimatedRangeKm: 640,
        powerKw: 155,
        torqueNm: 335,
        zeroTo100Sec: 7.9,
      };
    case "Black Car":
      return {
        ...DEFAULT,
        paintHex: "#1a1a1a",
        viewerVariant: "black",
        bodyStyle: "Executive sedan — metallic",
        drivetrain: "AWD",
        estimatedRangeKm: 600,
        powerKw: 180,
        torqueNm: 380,
        zeroTo100Sec: 6.9,
      };
    default:
      return DEFAULT;
  }
}
