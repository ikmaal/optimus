import type { MapPoint } from "@/lib/map/types";

/** L-shaped walking route in projected SVG space (lobby → lot). */
export function routeLobbyToLot(lobby: MapPoint, lot: MapPoint): MapPoint[] {
  const viaHorizontal: MapPoint[] = [lobby, { x: lot.x, y: lobby.y }, lot];
  const viaVertical: MapPoint[] = [lobby, { x: lobby.x, y: lot.y }, lot];

  const len = (pts: MapPoint[]) =>
    pts.slice(1).reduce((acc, p, i) => {
      const prev = pts[i]!;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      return acc + Math.hypot(dx, dy);
    }, 0);

  return len(viaHorizontal) <= len(viaVertical) ? viaHorizontal : viaVertical;
}
