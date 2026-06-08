import { SegmentedControl } from "@/components/ui/SegmentedControl";

export type DashboardView = "info" | "calendar" | "map";

const VIEW_OPTIONS = [
  { id: "info" as const, label: "Info" },
  { id: "calendar" as const, label: "Calendar" },
  { id: "map" as const, label: "Map" },
];

type Props = {
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
};

export function DashboardHeader({ view, onViewChange }: Props) {
  return (
    <header className="space-y-6" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="border-b pb-8" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="max-w-2xl">
            <p
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--text-muted)" }}
            >
              Fleet schedule
            </p>
            <h1 className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/optimus_logo.png"
                alt="Optimus"
                className="mx-auto h-9 w-auto sm:h-11"
              />
            </h1>
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
