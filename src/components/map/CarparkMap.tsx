"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventThemeForCarLabel } from "@/lib/fleet/car-themes";
import { findLotByLabel, lobbyCentroid, loadCarparkMapData } from "@/lib/map/load-map-data";
import { buildNavGrid, findGridPath, type NavGrid } from "@/lib/map/pathfinding";
import { createProjection, pointsToSvgPath, ringToSvgPath, viewportGeoBounds } from "@/lib/map/projection";
import { routeLobbyToLot } from "@/lib/map/route";
import { mapboxAccessToken, mapboxTilesForBounds } from "@/lib/map/tiles";
import type { CarLotInfo, CarparkMapData, MapPoint } from "@/lib/map/types";

export type CarMarker = {
  carId?: string;
  label: string;
  /** e.g. "Car Lot 42" */
  lot: string | null;
  color?: string;
};

type Props = {
  /** Lot the route should lead to, e.g. "Car Lot 42". */
  targetLot?: string | null;
  showRoute?: boolean;
  /** Cars to plot as colour-coded pins. */
  carMarkers?: CarMarker[];
  /** Enable hover, click-to-select, zoom and pan. */
  interactive?: boolean;
  selectedLot?: string | null;
  onSelectLot?: (lot: string) => void;
  showAllLotLabels?: boolean;
  heightClass?: string;
  className?: string;
};

const VIEW_W = 720;
const VIEW_H = 520;
const GRID_CELL = 5;
const MIN_VIEW_W = VIEW_W / 6;

type View = { x: number; y: number; w: number; h: number };
const FULL_VIEW: View = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function carColorFor(label: string, fallback?: string): string {
  const theme = eventThemeForCarLabel(label);
  return fallback ?? theme.borderColor;
}

export function CarparkMap({
  targetLot,
  showRoute = false,
  carMarkers = [],
  interactive = false,
  selectedLot,
  onSelectLot,
  showAllLotLabels = false,
  heightClass,
  className = "",
}: Props) {
  const [data, setData] = useState<CarparkMapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(FULL_VIEW);
  const [hover, setHover] = useState<{ label: string; carLabel?: string; left: number; top: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ active: boolean; moved: boolean; lastX: number; lastY: number }>({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });

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

  const projection = useMemo(
    () => (data ? createProjection(data.bounds, VIEW_W, VIEW_H) : null),
    [data],
  );

  const mapboxToken = mapboxAccessToken();

  const mapboxTiles = useMemo(() => {
    if (!data || !projection || !mapboxToken) return [];
    const tileBounds = viewportGeoBounds(data.bounds, VIEW_W, VIEW_H);
    return mapboxTilesForBounds(tileBounds, projection.project, mapboxToken);
  }, [data, projection, mapboxToken]);

  // One occupancy grid for the whole floor (pillars + all lots are obstacles).
  const grid: NavGrid | null = useMemo(() => {
    if (!data || !projection) return null;
    const project = projection.project;
    const projectRings = (rings: MapPoint[][]) => rings.map((ring) => ring.map(project));
    const insideRings = [
      ...projectRings(data.layers.background),
      ...projectRings(data.layers.passengerLobby),
    ];
    const blockRings = [
      ...projectRings(data.layers.pillars),
      ...projectRings(data.layers.carLots.flatMap((l) => l.rings)),
    ];
    return buildNavGrid({ width: VIEW_W, height: VIEW_H, cell: GRID_CELL, insideRings, blockRings });
  }, [data, projection]);

  const targetLotInfo: CarLotInfo | null = useMemo(
    () => (data ? findLotByLabel(data, targetLot) : null),
    [data, targetLot],
  );

  const lobby = useMemo(() => (data ? lobbyCentroid(data) : null), [data]);

  const route = useMemo(() => {
    if (!showRoute || !projection || !lobby || !targetLotInfo) return null;
    const start = projection.project(lobby);
    const end = projection.project(targetLotInfo.centroid);
    let points: MapPoint[] | null = grid ? findGridPath(grid, start, end) : null;
    if (points && points.length) {
      points = [...points, end];
    } else {
      points = routeLobbyToLot(start, end);
    }
    return { points, path: pointsToSvgPath(points) };
  }, [showRoute, projection, lobby, targetLotInfo, grid]);

  const routeLength = useMemo(() => {
    if (!route) return 0;
    let len = 0;
    for (let i = 1; i < route.points.length; i++) {
      len += Math.hypot(route.points[i]!.x - route.points[i - 1]!.x, route.points[i]!.y - route.points[i - 1]!.y);
    }
    return len;
  }, [route]);

  const markerByLot = useMemo(() => {
    const m = new Map<string, CarMarker>();
    for (const cm of carMarkers) {
      if (cm.lot) m.set(cm.lot.toLowerCase(), cm);
    }
    return m;
  }, [carMarkers]);

  const zoomScale = VIEW_W / view.w; // ≥ 1 when zoomed in
  const k = view.w / VIEW_W; // multiply base sizes to keep constant screen size
  const showEveryLabel = showAllLotLabels || zoomScale > 2.4;

  // Native, non-passive wheel zoom (so we can prevent page scroll).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      setView((prev) => {
        const sx = prev.x + mx * prev.w;
        const sy = prev.y + my * prev.h;
        const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
        const nw = clamp(prev.w * factor, MIN_VIEW_W, VIEW_W);
        const nh = nw * (VIEW_H / VIEW_W);
        const nx = clamp(sx - mx * nw, 0, VIEW_W - nw);
        const ny = clamp(sy - my * nh, 0, VIEW_H - nh);
        return { x: nx, y: ny, w: nw, h: nh };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [interactive]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      panRef.current = { active: true, moved: false, lastX: e.clientX, lastY: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [interactive],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive) return;
      const svg = svgRef.current;
      if (hover && svg) {
        const rect = svg.getBoundingClientRect();
        setHover((h) => (h ? { ...h, left: e.clientX - rect.left, top: e.clientY - rect.top } : h));
      }
      const pan = panRef.current;
      if (!pan.active || !svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - pan.lastX) / rect.width) * view.w;
      const dy = ((e.clientY - pan.lastY) / rect.height) * view.h;
      if (Math.abs(e.clientX - pan.lastX) + Math.abs(e.clientY - pan.lastY) > 3) pan.moved = true;
      pan.lastX = e.clientX;
      pan.lastY = e.clientY;
      setView((prev) => ({
        ...prev,
        x: clamp(prev.x - dx, 0, VIEW_W - prev.w),
        y: clamp(prev.y - dy, 0, VIEW_H - prev.h),
      }));
    },
    [interactive, view.w, view.h, hover],
  );

  const endPan = useCallback(() => {
    panRef.current.active = false;
  }, []);

  const handleLotClick = useCallback(
    (label: string) => {
      if (!interactive || !onSelectLot) return;
      if (panRef.current.moved) return;
      onSelectLot(label);
    },
    [interactive, onSelectLot],
  );

  const onLotEnter = useCallback(
    (label: string, e: React.PointerEvent) => {
      if (!interactive) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cm = markerByLot.get(label.toLowerCase());
      setHover({ label, carLabel: cm?.label, left: e.clientX - rect.left, top: e.clientY - rect.top });
    },
    [interactive, markerByLot],
  );

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-red-600 dark:text-rose-400" role="alert">
        {error}
      </p>
    );
  }

  if (!data || !projection) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-[var(--radius-lg)] border text-sm ${className}`}
        style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)", background: "var(--surface-muted)" }}
      >
        Loading basement map…
      </div>
    );
  }

  const project = projection.project;
  const lobbyPx = lobby ? project(lobby) : null;
  const selectedLc = selectedLot?.toLowerCase();
  const targetLc = targetLot?.toLowerCase();

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-card)]"
        style={{ borderColor: "var(--border-subtle)", background: "var(--surface-elevated)" }}
      >
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className={`block w-full ${heightClass ?? "h-auto"}`}
          style={{
            touchAction: interactive ? "none" : "pan-y",
            cursor: interactive ? (panRef.current.active ? "grabbing" : "grab") : "default",
          }}
          role="img"
          aria-label={
            targetLot
              ? `Basement carpark map highlighting ${targetLot}${showRoute ? " with walking route from lobby" : ""}`
              : "Basement carpark map"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPan}
          onPointerLeave={() => {
            endPan();
            setHover(null);
          }}
          onDoubleClick={() => interactive && setView(FULL_VIEW)}
        >
          <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="#d8dee8" />

          {mapboxTiles.map((tile) => (
            <image
              key={tile.key}
              href={tile.href}
              x={tile.x}
              y={tile.y}
              width={tile.width}
              height={tile.height}
              preserveAspectRatio="none"
            />
          ))}

          {data.layers.background.map((ring, i) => (
            <path
              key={`bg-${i}`}
              d={ringToSvgPath(ring, project)}
              fill="#e8ecf1"
              stroke="#c5cdd8"
              strokeWidth={1 * k}
            />
          ))}

          {data.layers.lobby.map((ring, i) => (
            <path
              key={`lobby-${i}`}
              d={ringToSvgPath(ring, project)}
              fill="#dbeafe"
              stroke="#93c5fd"
              strokeWidth={1 * k}
            />
          ))}

          {data.layers.carLots.map((lot) => {
            const lc = lot.label.toLowerCase();
            const isTarget = lc === targetLc;
            const isSelected = lc === selectedLc;
            const car = markerByLot.get(lc);
            let fill = "#f1f5f9";
            let stroke = "#94a3b8";
            let sw = 0.75 * k;
            if (car) {
              fill = `${carColorFor(car.label, car.color)}22`;
              stroke = carColorFor(car.label, car.color);
              sw = 1.25 * k;
            }
            if (isSelected) {
              fill = "color-mix(in srgb, var(--accent) 22%, #ffffff)";
              stroke = "var(--accent)";
              sw = 2 * k;
            }
            if (isTarget) {
              fill = "#fde68a";
              stroke = "#ca8a04";
              sw = 2 * k;
            }
            return lot.rings.map((ring, i) => (
              <path
                key={`${lot.label}-${i}`}
                d={ringToSvgPath(ring, project)}
                fill={fill}
                stroke={stroke}
                strokeWidth={sw}
                style={{ cursor: interactive && onSelectLot ? "pointer" : undefined }}
                onPointerEnter={(e) => onLotEnter(lot.label, e)}
                onPointerLeave={() => setHover(null)}
                onClick={() => handleLotClick(lot.label)}
              />
            ));
          })}

          {data.layers.pillars.map((ring, i) => (
            <path
              key={`pillar-${i}`}
              d={ringToSvgPath(ring, project)}
              fill="#64748b"
              stroke="#475569"
              strokeWidth={0.5 * k}
            />
          ))}

          {/* Lot number labels */}
          {data.layers.carLots.map((lot) => {
            const lc = lot.label.toLowerCase();
            const isTarget = lc === targetLc;
            const car = markerByLot.get(lc);
            if (!showEveryLabel && !isTarget && !car) return null;
            const p = project(lot.centroid);
            return (
              <text
                key={`label-${lot.label}`}
                x={p.x}
                y={p.y + 1.2 * k}
                textAnchor="middle"
                fontSize={6.5 * k}
                fontWeight={isTarget || car ? 700 : 500}
                fill={isTarget ? "#854d0e" : car ? carColorFor(car.label, car.color) : "#64748b"}
                pointerEvents="none"
              >
                {lot.lotNumber}
              </text>
            );
          })}

          {/* Walking route */}
          {route ? (
            <g pointerEvents="none">
              <path
                d={route.path}
                fill="none"
                stroke="#2563eb"
                strokeWidth={5 * k}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.22}
              />
              <path
                d={route.path}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2.4 * k}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${7 * k} ${5 * k}`}
              />
              <circle r={4.5 * k} fill="#1d4ed8" stroke="#fff" strokeWidth={1.2 * k}>
                <animateMotion
                  dur={`${clamp(routeLength / 90, 2.5, 9)}s`}
                  repeatCount="indefinite"
                  path={route.path}
                  rotate="auto"
                />
              </circle>
            </g>
          ) : null}

          {/* Car pins */}
          {carMarkers.map((cm) => {
            if (!cm.lot) return null;
            const info = findLotByLabel(data, cm.lot);
            if (!info) return null;
            const p = project(info.centroid);
            const color = carColorFor(cm.label, cm.color);
            const isTarget = cm.lot.toLowerCase() === targetLc;
            return (
              <g key={`pin-${cm.label}`} pointerEvents="none">
                <circle cx={p.x} cy={p.y} r={(isTarget ? 7 : 5.5) * k} fill={color} stroke="#fff" strokeWidth={1.6 * k} />
                <text
                  x={p.x}
                  y={p.y - 9 * k}
                  textAnchor="middle"
                  fontSize={7 * k}
                  fontWeight={700}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={0.5 * k}
                  paintOrder="stroke"
                >
                  {cm.label}
                </text>
              </g>
            );
          })}

          {/* You are here */}
          {lobbyPx ? (
            <g pointerEvents="none">
              <circle cx={lobbyPx.x} cy={lobbyPx.y} r={6 * k} fill="#16a34a" stroke="#fff" strokeWidth={1.8 * k} />
              <circle cx={lobbyPx.x} cy={lobbyPx.y} r={6 * k} fill="none" stroke="#16a34a" strokeWidth={1.2 * k}>
                <animate attributeName="r" values={`${6 * k};${12 * k};${6 * k}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
              </circle>
              <text
                x={lobbyPx.x}
                y={lobbyPx.y - 11 * k}
                textAnchor="middle"
                fontSize={8 * k}
                fontWeight={700}
                fill="#15803d"
                stroke="#fff"
                strokeWidth={0.6 * k}
                paintOrder="stroke"
              >
                You are here
              </text>
            </g>
          ) : null}
        </svg>

        {/* Tooltip */}
        {hover ? (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium shadow-md"
            style={{
              left: hover.left,
              top: hover.top,
              background: "var(--surface-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {hover.label}
            {hover.carLabel ? ` · ${hover.carLabel}` : ""}
          </div>
        ) : null}

        {/* Zoom controls */}
        {interactive ? (
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            <ZoomButton
              label="+"
              onClick={() =>
                setView((p) => {
                  const nw = clamp(p.w * 0.7, MIN_VIEW_W, VIEW_W);
                  const nh = nw * (VIEW_H / VIEW_W);
                  return {
                    x: clamp(p.x + (p.w - nw) / 2, 0, VIEW_W - nw),
                    y: clamp(p.y + (p.h - nh) / 2, 0, VIEW_H - nh),
                    w: nw,
                    h: nh,
                  };
                })
              }
            />
            <ZoomButton
              label="−"
              onClick={() =>
                setView((p) => {
                  const nw = clamp(p.w / 0.7, MIN_VIEW_W, VIEW_W);
                  const nh = nw * (VIEW_H / VIEW_W);
                  return {
                    x: clamp(p.x - (nw - p.w) / 2, 0, VIEW_W - nw),
                    y: clamp(p.y - (nh - p.h) / 2, 0, VIEW_H - nh),
                    w: nw,
                    h: nh,
                  };
                })
              }
            />
            {zoomScale > 1.02 ? <ZoomButton label="⤢" title="Reset view" onClick={() => setView(FULL_VIEW)} /> : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" /> You are here (lobby)
        </span>
        {carMarkers.map((cm) => (
          <span key={`lg-${cm.label}`} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: carColorFor(cm.label, cm.color) }} />
            {cm.label}
            {cm.lot ? ` · ${cm.lot.replace("Car Lot ", "Lot ")}` : " · not parked"}
          </span>
        ))}
        {showRoute ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4" style={{ background: "#2563eb" }} /> Walking route
          </span>
        ) : null}
        {interactive ? <span className="ml-auto opacity-80">Scroll to zoom · drag to pan · double-click to reset</span> : null}
        {mapboxToken ? (
          <span className="w-full opacity-70 sm:ml-auto sm:w-auto">
            ©{" "}
            <a
              href="https://www.mapbox.com/about/maps/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Mapbox
            </a>{" "}
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              OpenStreetMap
            </a>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ZoomButton({ label, onClick, title }: { label: string; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md border text-sm font-semibold shadow-sm transition-colors"
      style={{ background: "var(--surface-elevated)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
    >
      {label}
    </button>
  );
}
