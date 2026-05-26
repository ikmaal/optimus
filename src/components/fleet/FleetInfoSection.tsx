"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CarSchedulePanel } from "@/components/fleet/CarSchedulePanel";
import { FuelPanel } from "@/components/fleet/FuelPanel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatRow } from "@/components/ui/StatRow";
import { fleetSpecsForCar } from "@/lib/fleet/car-info";
import type { FleetCar } from "@/lib/fleet/queries";
import type { FleetBookingPreview } from "@/lib/fleet/schedule";

const FleetCarViewer = dynamic(
  () => import("@/components/fleet/FleetCarViewer").then((m) => ({ default: m.FleetCarViewer })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[min(56vh,480px)] items-center justify-center rounded-[var(--radius-lg)] border text-sm shadow-[var(--shadow-card)]"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--surface-muted)",
          color: "var(--text-muted)",
        }}
      >
        Loading viewer…
      </div>
    ),
  },
);

type Props = {
  cars: FleetCar[];
  bookings: FleetBookingPreview[];
};

export function FleetInfoSection({ cars, bookings }: Props) {
  const [pickedId, setPickedId] = useState(cars[0]?.id ?? "");

  const selected = useMemo(() => cars.find((c) => c.id === pickedId) ?? cars[0], [cars, pickedId]);
  const specs = useMemo(() => (selected ? fleetSpecsForCar(selected) : null), [selected]);

  if (!selected || !specs) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        No active vehicles configured.
      </p>
    );
  }

  const carOptions = cars.map((c) => ({ id: c.id, label: c.label }));

  return (
    <div className="space-y-6">
      {cars.length > 1 ? (
        <SegmentedControl
          options={carOptions}
          value={selected.id}
          onChange={setPickedId}
          ariaLabel="Choose vehicle"
          size="sm"
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.15fr_minmax(0,0.85fr)] lg:items-start">
        <FleetCarViewer specs={specs} />

        <aside
          className="rounded-[var(--radius-lg)] border px-6 py-6 shadow-[var(--shadow-card)]"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--surface-elevated)",
          }}
        >
          <h2
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Vehicle details
          </h2>
          <p className="mt-2 text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {selected.label}
          </p>
          {selected.plate ? (
            <p className="mt-1 font-mono text-sm" style={{ color: "var(--text-secondary)" }}>
              {selected.plate}
            </p>
          ) : null}

          <FuelPanel litres={selected.fuelLitres} tankLitres={selected.fuelTankLitres} />

          <CarSchedulePanel carId={selected.id} bookings={bookings} />

          <dl className="mt-8 space-y-4 text-sm">
            <StatRow label="Body" value={specs.bodyStyle} />
            <StatRow label="Seats" value={String(specs.seats)} />
            <StatRow label="Drivetrain" value={specs.drivetrain} />
            <StatRow label="Est. range" value={`${specs.estimatedRangeKm} km`} />
            <StatRow label="Power" value={`${specs.powerKw} kW`} />
            <StatRow label="Torque" value={`${specs.torqueNm} N·m`} />
            <StatRow label="0–100 km/h" value={`${specs.zeroTo100Sec}s`} />
          </dl>
        </aside>
      </div>
    </div>
  );
}
