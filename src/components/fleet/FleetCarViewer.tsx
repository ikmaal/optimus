"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { FleetCarSpecs } from "@/lib/fleet/car-info";
import { statusLabel, type CarOperationalStatus } from "@/lib/fleet/car-status";
import { FleetViewerScene } from "@/components/fleet/FleetViewerScene";

type Props = {
  specs: FleetCarSpecs;
  status: CarOperationalStatus;
  statusDetail?: string;
};

const VIEWER_HEIGHT = "min(56vh, 480px)";

const STATUS_STYLES: Record<
  CarOperationalStatus,
  { pill: string; dot: string }
> = {
  parked: {
    pill: "rgba(22,163,74,0.14)",
    dot: "#16a34a",
  },
  driving: {
    pill: "rgba(37,99,235,0.14)",
    dot: "#2563eb",
  },
  workshop: {
    pill: "rgba(234,88,12,0.14)",
    dot: "#ea580c",
  },
};

export function FleetCarViewer({ specs, status, statusDetail }: Props) {
  const style = STATUS_STYLES[status];

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]"
      style={{
        border: "1px solid var(--border-subtle)",
        background: "#0f141c",
        height: VIEWER_HEIGHT,
        touchAction: "none",
      }}
    >
      <div
        className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm"
        style={{ background: style.pill, color: "var(--text-primary)" }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: style.dot,
            boxShadow: status === "driving" ? `0 0 8px ${style.dot}` : undefined,
          }}
        />
        <span>{statusLabel(status)}</span>
        {status === "driving" ? (
          <span className="font-normal opacity-80">· live</span>
        ) : null}
      </div>

      {statusDetail ? (
        <p
          className="pointer-events-none absolute right-3 top-3 z-10 max-w-[45%] truncate rounded-md px-2 py-1 text-[0.65rem] font-medium backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.35)", color: "#e8edf5" }}
        >
          {statusDetail}
        </p>
      ) : null}

      <Canvas
        className="block h-full w-full"
        shadows
        dpr={[1, 2]}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 35, near: 0.05, far: 120, position: [4, 2.5, 4] }}
      >
        <Suspense fallback={null}>
          <FleetViewerScene specs={specs} status={status} />
        </Suspense>
      </Canvas>

      <p
        className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs"
        style={{ color: "rgba(255,255,255,0.55)" }}
      >
        Drag to orbit · Scroll to zoom
      </p>
    </div>
  );
}
