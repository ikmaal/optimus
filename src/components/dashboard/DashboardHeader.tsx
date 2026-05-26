import { SegmentedControl } from "@/components/ui/SegmentedControl";

export type DashboardView = "info" | "calendar";

const VIEW_OPTIONS = [
  { id: "info" as const, label: "Info" },
  { id: "calendar" as const, label: "Calendar" },
];

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

export function DashboardHeader({ view, onViewChange }: Props) {
  return (
    <header className="space-y-6" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="border-b pb-8" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--text-muted)" }}
            >
              Fleet schedule
            </p>
            <h1
              className="mt-1.5 text-[1.65rem] font-semibold leading-tight tracking-tight sm:text-3xl"
              style={{ color: "var(--text-primary)" }}
            >
              Company vehicles
            </h1>
            <p className="max-w-2xl pt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Anyone can view and book. Add your name, vehicle, and reason when you reserve. To cancel, open the
              booking and use your name to confirm.
            </p>
          </div>

          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onChange={onViewChange}
            ariaLabel="Main view"
          />
        </div>
      </div>
    </header>
  );
}
