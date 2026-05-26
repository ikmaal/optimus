import {
  formatFuelLitres,
  fuelLevel,
  fuelPercent,
  fuelTopUpHint,
  type FuelLevel,
} from "@/lib/fleet/fuel";

type Props = {
  litres: number;
  tankLitres: number;
};

export function FuelPanel({ litres, tankLitres }: Props) {
  const level = fuelLevel(litres, tankLitres);
  const percent = fuelPercent(litres, tankLitres);
  const hint = fuelTopUpHint(level);

  return (
    <div
      className="mt-6 rounded-[var(--radius-md)] border px-4 py-4"
      style={{
        borderColor:
          level === "low"
            ? "color-mix(in srgb, var(--danger) 35%, var(--border-subtle))"
            : "var(--border-subtle)",
        background:
          level === "low"
            ? "color-mix(in srgb, var(--danger) 6%, var(--surface-muted))"
            : "var(--surface-muted)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--text-muted)" }}
          >
            Petrol
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight" style={{ color: "var(--text-primary)" }}>
            {formatFuelLitres(litres)} L
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {" "}
              / {formatFuelLitres(tankLitres)} L
            </span>
          </p>
        </div>
        <FuelBadge level={level} percent={percent} />
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full"
        style={{ background: "color-mix(in srgb, var(--border-subtle) 65%, transparent)" }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Petrol tank level"
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${percent}%`, background: fuelBarColor(level) }}
        />
      </div>

      {hint ? (
        <p
          className="mt-3 text-xs leading-relaxed"
          style={{ color: level === "low" ? "var(--danger)" : "var(--text-secondary)" }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function FuelBadge({ level, percent }: { level: FuelLevel; percent: number }) {
  const label = level === "low" ? "Top up" : level === "medium" ? "Half tank" : "OK";
  const color =
    level === "low" ? "var(--danger)" : level === "medium" ? "var(--accent-muted)" : "var(--text-secondary)";

  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide tabular-nums"
      style={{
        color,
        background: "var(--surface-elevated)",
        boxShadow: "0 0 0 1px var(--border-subtle)",
      }}
    >
      {label} · {Math.round(percent)}%
    </span>
  );
}

function fuelBarColor(level: FuelLevel): string {
  switch (level) {
    case "low":
      return "var(--danger)";
    case "medium":
      return "var(--accent-muted)";
    default:
      return "var(--accent)";
  }
}
