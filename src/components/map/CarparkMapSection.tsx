"use client";

import { useMemo, useState } from "react";
import { CarparkMap, type CarMarker } from "@/components/map/CarparkMap";
import { CheckInFlow } from "@/components/map/CheckInFlow";
import { ReportParkingForm } from "@/components/map/CollectCarPanel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { FleetCar } from "@/lib/fleet/queries";

type Props = {
  cars: FleetCar[];
  /** Bubble inspection updates (fuel/odometer) up to the dashboard. */
  onCarUpdated?: (car: FleetCar) => void;
};

type MapMode = "checkin" | "report" | "overview";

const MODE_OPTIONS = [
  { id: "checkin" as const, label: "Check in" },
  { id: "report" as const, label: "Report parking" },
  { id: "overview" as const, label: "Overview" },
];

export function CarparkMapSection({ cars: initialCars, onCarUpdated }: Props) {
  const [cars, setCars] = useState(initialCars);
  const [mode, setMode] = useState<MapMode>("checkin");
  const [pickedId, setPickedId] = useState(initialCars[0]?.id ?? "");

  const selected = useMemo(() => cars.find((c) => c.id === pickedId) ?? cars[0], [cars, pickedId]);
  const carOptions = cars.map((c) => ({ id: c.id, label: c.label }));
  const allMarkers: CarMarker[] = useMemo(
    () => cars.map((c) => ({ carId: c.id, label: c.label, lot: c.parkedLot ?? null })),
    [cars],
  );

  const handleParkUpdated = (carId: string, parkedLot: string) => {
    setCars((prev) =>
      prev.map((c) =>
        c.id === carId ? { ...c, parkedLot, parkedLotUpdatedAt: new Date() } : c,
      ),
    );
  };

  const handleCarUpdated = (updated: FleetCar) => {
    setCars((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    onCarUpdated?.(updated);
  };

  if (!selected) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No active vehicles configured.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Basement carpark map — see where each car is parked and get walking directions from the passenger lobby.
      </p>

      {cars.length > 1 ? (
        <SegmentedControl
          options={carOptions}
          value={selected.id}
          onChange={setPickedId}
          ariaLabel="Choose vehicle"
        />
      ) : null}

      <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="Map mode" />

      {mode === "checkin" ? (
        <CheckInFlow car={selected} cars={cars} onCarUpdated={handleCarUpdated} />
      ) : null}

      {mode === "report" ? (
        <div
          className="rounded-[var(--radius-lg)] border p-5 shadow-[var(--shadow-card)]"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
        >
          <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Report where you parked
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            After returning {selected.label}, tell the next driver which lot you used.
          </p>
          <div className="mt-5">
            <ReportParkingForm
              car={selected}
              onUpdated={(lot) => handleParkUpdated(selected.id, lot)}
            />
          </div>
        </div>
      ) : null}

      {mode === "overview" ? (
        <CarparkMap
          targetLot={selected.parkedLot}
          showRoute={Boolean(selected.parkedLot)}
          carMarkers={allMarkers}
          interactive
          heightClass="h-[min(64vh,520px)]"
        />
      ) : null}
    </div>
  );
}
