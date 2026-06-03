import type { MapGeoCollection, MapGeoFeature, MapPoint, MapRing } from "@/lib/map/types";

/** Extract outer rings from MultiPolygon / Polygon coordinates. */
export function ringsFromFeature(feature: MapGeoFeature): MapRing[] {
  const { geometry } = feature;
  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates as number[][][][]).map((poly) =>
      poly[0].map(([lng, lat]) => ({ x: lng, y: lat })),
    );
  }
  return [(geometry.coordinates as number[][][])[0].map(([lng, lat]) => ({ x: lng, y: lat }))];
}

export function centroidOfRing(ring: MapRing): MapPoint {
  let sumX = 0;
  let sumY = 0;
  const n = ring.length > 1 && ring[0]!.x === ring[ring.length - 1]!.x && ring[0]!.y === ring[ring.length - 1]!.y
    ? ring.length - 1
    : ring.length;
  for (let i = 0; i < n; i++) {
    sumX += ring[i]!.x;
    sumY += ring[i]!.y;
  }
  return { x: sumX / n, y: sumY / n };
}

export function boundsOfRings(rings: MapRing[]): {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
} {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      minLng = Math.min(minLng, p.x);
      minLat = Math.min(minLat, p.y);
      maxLng = Math.max(maxLng, p.x);
      maxLat = Math.max(maxLat, p.y);
    }
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function parseLotLabel(raw: string | undefined): { label: string; lotNumber: number } | null {
  if (!raw) return null;
  const match = raw.match(/^Car Lot (\d+)$/i);
  if (!match) return null;
  const lotNumber = Number(match[1]);
  if (!Number.isFinite(lotNumber)) return null;
  return { label: `Car Lot ${lotNumber}`, lotNumber };
}

export function allRingsFromCollection(collection: MapGeoCollection): MapRing[] {
  return collection.features.flatMap((f) => ringsFromFeature(f));
}
