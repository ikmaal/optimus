export type ReadingCaptureKind = "dashboard" | "cashcard";

export type ExteriorCaptureKind = "front" | "back" | "passenger_side" | "driver_side";

export type CaptureKind = ReadingCaptureKind | ExteriorCaptureKind;

export type CaptureTile = {
  kind: CaptureKind;
  icon: string;
  title: string;
  desc: string;
};

export const READING_CAPTURES: CaptureTile[] = [
  {
    kind: "dashboard",
    icon: "🚗",
    title: "Dashboard",
    desc: "Odometer + fuel gauge in one shot",
  },
  {
    kind: "cashcard",
    icon: "💳",
    title: "Cashcard",
    desc: "Balance, date & time on screen",
  },
];

export const EXTERIOR_CAPTURES: CaptureTile[] = [
  {
    kind: "front",
    icon: "⬆️",
    title: "Front",
    desc: "Full front view of the vehicle",
  },
  {
    kind: "back",
    icon: "⬇️",
    title: "Back",
    desc: "Full rear view including plate",
  },
  {
    kind: "passenger_side",
    icon: "◀️",
    title: "Passenger side",
    desc: "Left side, doors closed",
  },
  {
    kind: "driver_side",
    icon: "▶️",
    title: "Driver side",
    desc: "Right side, doors closed",
  },
];

export const ALL_CAPTURE_KINDS: CaptureKind[] = [
  ...READING_CAPTURES.map((t) => t.kind),
  ...EXTERIOR_CAPTURES.map((t) => t.kind),
];
