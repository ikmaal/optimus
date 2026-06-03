"use client";

import { useState } from "react";
import { CarparkMap } from "@/components/map/CarparkMap";
import { ParkLotSelect } from "@/components/map/ParkLotSelect";
import type { FleetCar } from "@/lib/fleet/queries";

type Props = {
  car: FleetCar;
  onUpdated?: (parkedLot: string) => void;
};

export function ReportParkingForm({ car, onUpdated }: Props) {
  const [lot, setLot] = useState(car.parkedLot ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!lot) {
      setError("Select the lot where you parked.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/cars/${car.id}/park`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parkedLot: lot }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save parking location");
        return;
      }
      setSaved(true);
      onUpdated?.(lot);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`park-${car.id}`} className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Where did you park {car.label}?
        </label>
        <ParkLotSelect id={`park-${car.id}`} value={lot} onChange={setLot} disabled={submitting} />
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-green-700 dark:text-green-400" role="status">
          Parking location saved — the next driver will see this on the map.
        </p>
      ) : null}
      <button
        type="button"
        disabled={submitting || !lot}
        className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-45"
        style={{ background: "var(--accent)" }}
        onClick={() => void handleSave()}
      >
        {submitting ? "Saving…" : "Save parking location"}
      </button>
    </div>
  );
}

type CollectProps = {
  carLabel: string;
  parkedLot: string | null;
};

export function CollectCarPanel({ carLabel, parkedLot }: CollectProps) {
  if (!parkedLot) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border px-4 py-5 text-sm"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--surface-muted)",
          color: "var(--text-secondary)",
        }}
      >
        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
          Parking location unknown
        </p>
        <p className="mt-1.5 leading-relaxed">
          The last driver has not reported where {carLabel} is parked. Check the basement or ask the team.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[var(--radius-lg)] border px-4 py-4"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-muted)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Collect {carLabel}
        </p>
        <p className="mt-1.5 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Head to {parkedLot}
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Enter the basement from the passenger lobby and follow the route below.
        </p>
      </div>
      <CarparkMap highlightLot={parkedLot} showRoute carLabel={carLabel} />
    </div>
  );
}
