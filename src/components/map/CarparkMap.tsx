"use client";

import { useEffect, useMemo, useState } from "react";
import { lobbyCentroid, findLotByLabel, loadCarparkMapData } from "@/lib/map/load-map-data";
import { createProjection, pointsToSvgPath, ringToSvgPath } from "@/lib/map/projection";
import { routeLobbyToLot } from "@/lib/map/route";
import type { CarparkMapData } from "@/lib/map/types";

type Props = {
  /** e.g. "Car Lot 42" */
  highlightLot?: string | null;
  showRoute?: boolean;
  carLabel?: string;
  className?: string;
};

const VIEW_W = 720;
const VIEW_H = 520;

export function CarparkMap({ highlightLot, showRoute = false, carLabel, className = "" }: Props) {
  const [data, setData] = useState<CarparkMapData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCarparkMapData()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load map");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rendered = useMemo(() => {
    if (!data) return null;
    const projection = createProjection(data.bounds, VIEW_W, VIEW_H);
    const targetLot = findLotByLabel(data, highlightLot);
    const lobby = lobbyCentroid(data);

    let routePath: string | null = null;
    let routePoints: { x: number; y: number }[] = [];
    if (showRoute && lobby && targetLot) {
      const start = projection.project(lobby);
      const end = projection.project(targetLot.centroid);
      routePoints = routeLobbyToLot(start, end);
      routePath = pointsToSvgPath(routePoints);
    }

    return { projection, targetLot, lobby, routePath, routePoints };
  }, [data, highlightLot, showRoute]);

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-red-600 dark:text-rose-400" role="alert">
        {error}
      </p>
    );
  }

  if (!data || !rendered) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-[var(--radius-lg)] border text-sm ${className}`}
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)", background: "var(--surface-muted)" }}
      >
        Loading basement map…
      </div>
    );
  }

  const { projection, targetLot, lobby, routePath, routePoints } = rendered;

  return (
    <div className={`space-y-3 ${className}`}>
      {carLabel && highlightLot ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>
            {carLabel}
          </span>{" "}
          is at{" "}
          <span className="font-medium" style={{ color: "var(--accent)" }}>
            {highlightLot}
          </span>
          {showRoute ? " — follow the route from the passenger lobby." : "."}
        </p>
      ) : null}

      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-card)]"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={
            highlightLot
              ? `Basement carpark map highlighting ${highlightLot}${showRoute ? " with route from lobby" : ""}`
              : "Basement carpark map"
          }
        >
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="var(--surface-muted)" />

          {data.layers.background.map((ring, i) => (
            <path
              key={`bg-${i}`}
              d={ringToSvgPath(ring, projection.project)}
              fill="#e8ecf1"
              stroke="#c5cdd8"
              strokeWidth={1}
            />
          ))}

          {data.layers.lobby.map((ring, i) => (
            <path
              key={`lobby-${i}`}
              d={ringToSvgPath(ring, projection.project)}
              fill="#dbeafe"
              stroke="#93c5fd"
              strokeWidth={1}
            />
          ))}

          {data.layers.carLots.map((lot) => {
            const isTarget = targetLot?.label === lot.label;
            return lot.rings.map((ring, i) => (
              <path
                key={`${lot.label}-${i}`}
                d={ringToSvgPath(ring, projection.project)}
                fill={isTarget ? "#fef08a" : "#f1f5f9"}
                stroke={isTarget ? "#ca8a04" : "#94a3b8"}
                strokeWidth={isTarget ? 2 : 0.75}
              />
            ));
          })}

          {data.layers.pillars.map((ring, i) => (
            <path
              key={`pillar-${i}`}
              d={ringToSvgPath(ring, projection.project)}
              fill="#64748b"
              stroke="#475569"
              strokeWidth={0.5}
            />
          ))}

          {routePath ? (
            <>
              <path
                d={routePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="10 6"
                opacity={0.35}
              />
              <path
                d={routePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="optimus-route-line"
              />
            </>
          ) : null}

          {lobby ? (
            <g>
              <circle
                cx={projection.project(lobby).x}
                cy={projection.project(lobby).y}
                r={7}
                fill="#16a34a"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={projection.project(lobby).x}
                y={projection.project(lobby).y - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#15803d"
              >
                Lobby
              </text>
            </g>
          ) : null}

          {targetLot ? (
            <g>
              <circle
                cx={projection.project(targetLot.centroid).x}
                cy={projection.project(targetLot.centroid).y}
                r={7}
                fill="#ca8a04"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={projection.project(targetLot.centroid).x}
                y={projection.project(targetLot.centroid).y - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#a16207"
              >
                {targetLot.label.replace("Car Lot ", "Lot ")}
              </text>
            </g>
          ) : null}

          {routePoints.length >= 2 ? (
            <polygon
              points={`${routePoints[routePoints.length - 1]!.x},${routePoints[routePoints.length - 1]!.y} ${routePoints[routePoints.length - 1]!.x - 5},${routePoints[routePoints.length - 1]!.y - 8} ${routePoints[routePoints.length - 1]!.x + 5},${routePoints[routePoints.length - 1]!.y - 8}`}
              fill="#2563eb"
              transform={`rotate(${Math.atan2(
                routePoints[routePoints.length - 1]!.y - routePoints[routePoints.length - 2]!.y,
                routePoints[routePoints.length - 1]!.x - routePoints[routePoints.length - 2]!.x,
              ) * (180 / Math.PI) + 90}, ${routePoints[routePoints.length - 1]!.x}, ${routePoints[routePoints.length - 1]!.y})`}
            />
          ) : null}
        </svg>
      </div>

      <div className="flex flex-wrap gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" /> Passenger lobby
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-600" /> Your car
        </span>
        {showRoute ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 bg-blue-600" /> Walking route
          </span>
        ) : null}
      </div>
    </div>
  );
}
