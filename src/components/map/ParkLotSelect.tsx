"use client";

import { useEffect, useState } from "react";
import { loadCarparkMapData } from "@/lib/map/load-map-data";

type Props = {
  value: string;
  onChange: (lot: string) => void;
  disabled?: boolean;
  id?: string;
};

export function ParkLotSelect({ value, onChange, disabled, id = "park-lot" }: Props) {
  const [lots, setLots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadCarparkMapData()
      .then((data) => {
        if (!cancelled) setLots(data.lotLabels);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <select
      id={id}
      className="mt-2 w-full rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-sm outline-none transition-[box-shadow] focus:ring-2 focus:ring-[color:var(--ring-focus)]"
      style={{
        background: "var(--surface-input)",
        borderColor: "var(--border-subtle)",
        color: "var(--text-primary)",
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
    >
      <option value="">{loading ? "Loading lots…" : "Select car lot"}</option>
      {lots.map((lot) => (
        <option key={lot} value={lot}>
          {lot}
        </option>
      ))}
    </select>
  );
}
