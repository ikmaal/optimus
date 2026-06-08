import type { MapPoint } from "@/lib/map/types";

export type MapProjection = {
  project: (p: MapPoint) => MapPoint;
  width: number;
  height: number;
};

const PADDING = 24;

/** Map WGS84 lng/lat to SVG pixel space (y increases downward). */
export function createProjection(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  viewportWidth: number,
  viewportHeight: number,
): MapProjection {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const innerW = viewportWidth - PADDING * 2;
  const innerH = viewportHeight - PADDING * 2;
  const scale = Math.min(innerW / lngSpan, innerH / latSpan);
  const drawnW = lngSpan * scale;
  const drawnH = latSpan * scale;
  const offsetX = PADDING + (innerW - drawnW) / 2;
  const offsetY = PADDING + (innerH - drawnH) / 2;

  return {
    width: viewportWidth,
    height: viewportHeight,
    project: ({ x: lng, y: lat }) => ({
      x: offsetX + (lng - bounds.minLng) * scale,
      y: offsetY + (bounds.maxLat - lat) * scale,
    }),
  };
}

export function ringToSvgPath(ring: MapPoint[], project: (p: MapPoint) => MapPoint): string {
  if (ring.length === 0) return "";
  const pts = ring.map(project);
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ") + " Z";
}

export function pointsToSvgPath(points: MapPoint[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/** Geographic bounds that cover the full SVG viewport (for map tiles outside the floor plan). */
export function viewportGeoBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  viewportWidth: number,
  viewportHeight: number,
  marginFraction = 0.35,
): { minLng: number; minLat: number; maxLng: number; maxLat: number } {
  const lngSpan = bounds.maxLng - bounds.minLng || 1;
  const latSpan = bounds.maxLat - bounds.minLat || 1;
  const innerW = viewportWidth - PADDING * 2;
  const innerH = viewportHeight - PADDING * 2;
  const scale = Math.min(innerW / lngSpan, innerH / latSpan);
  const drawnW = lngSpan * scale;
  const drawnH = latSpan * scale;
  const offsetX = PADDING + (innerW - drawnW) / 2;
  const offsetY = PADDING + (innerH - drawnH) / 2;

  const unproject = (px: number, py: number) => ({
    lng: bounds.minLng + (px - offsetX) / scale,
    lat: bounds.maxLat - (py - offsetY) / scale,
  });

  const nw = unproject(0, 0);
  const se = unproject(viewportWidth, viewportHeight);

  const lngPad = (se.lng - nw.lng) * marginFraction;
  const latPad = (nw.lat - se.lat) * marginFraction;

  return {
    minLng: nw.lng - lngPad,
    maxLat: nw.lat + latPad,
    maxLng: se.lng + lngPad,
    minLat: se.lat - latPad,
  };
}
