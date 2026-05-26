type Props = {
  label: string;
  value: string;
};

export function StatRow({ label, value }: Props) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="shrink-0 font-medium" style={{ color: "var(--text-muted)" }}>
        {label}
      </dt>
      <dd className="text-right font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </dd>
    </div>
  );
}
