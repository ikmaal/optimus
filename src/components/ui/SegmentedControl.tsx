type Option<T extends string> = { id: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
}: Props<T>) {
  const pad = size === "sm" ? "px-3 py-2 text-sm font-medium" : "min-w-[5.5rem] px-4 py-2 text-sm font-semibold";

  return (
    <div
      className="inline-flex shrink-0 flex-wrap gap-0 rounded-[var(--radius-md)] border p-0.5"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--surface-elevated)",
      }}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map(({ id, label }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`rounded-[calc(var(--radius-sm)-2px)] transition-colors ${pad}`}
            style={{
              background: active ? "var(--surface-muted)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: active ? "0 0 0 1px var(--border-subtle)" : undefined,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
