import type { MapPoint } from "@/lib/map/types";

export type GeoBounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type TileCoord = { z: number; x: number; y: number };

export type SvgTileRect = {
  key: string;
  href: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Mapbox public token — must be NEXT_PUBLIC_ so the client can load tile images. */
export function mapboxAccessToken(): string | undefined {
  return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim() || undefined;
}

export function mapboxSatelliteTileUrl({ z, x, y }: TileCoord, token: string): string {
  return `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.png?access_token=${token}`;
}

function clampTile(v: number, n: number): number {
  return Math.max(0, Math.min(n - 1, v));
}

export function lngLatToTile(lng: number, lat: number, z: number): TileCoord {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { z, x: clampTile(x, n), y: clampTile(y, n) };
}

export function tilesCoveringBounds(
  bounds: GeoBounds,
  maxZoom: number,
  minZoom: number,
  maxCount = 48,
): TileCoord[] {
  for (let z = maxZoom; z >= minZoom; z--) {
    const nw = lngLatToTile(bounds.minLng, bounds.maxLat, z);
    const se = lngLatToTile(bounds.maxLng, bounds.minLat, z);
    const tiles: TileCoord[] = [];
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        tiles.push({ z, x, y });
      }
    }
    if (tiles.length > 0 && tiles.length <= maxCount) return tiles;
  }
  const z = minZoom;
  const nw = lngLatToTile(bounds.minLng, bounds.maxLat, z);
  const se = lngLatToTile(bounds.maxLng, bounds.minLat, z);
  const tiles: TileCoord[] = [];
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

function tileBoundsWebMercator(coord: TileCoord) {
  const n = 2 ** coord.z;
  const west = (coord.x / n) * 360 - 180;
  const east = ((coord.x + 1) / n) * 360 - 180;
  const north = (Math.atan(Math.sinh(Math.PI * (1 - (2 * coord.y) / n))) * 180) / Math.PI;
  const south = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (coord.y + 1)) / n))) * 180) / Math.PI;
  return { west, east, north, south };
}

export function tileToSvgRect(
  coord: TileCoord,
  project: (p: MapPoint) => MapPoint,
  urlFn: (coord: TileCoord) => string,
  keyPrefix = "",
): SvgTileRect {
  const b = tileBoundsWebMercator(coord);
  const nw = project({ x: b.west, y: b.north });
  const se = project({ x: b.east, y: b.south });
  return {
    key: `${keyPrefix}${coord.z}/${coord.x}/${coord.y}`,
    href: urlFn(coord),
    x: nw.x,
    y: nw.y,
    width: se.x - nw.x,
    height: se.y - nw.y,
  };
}

/** Mapbox satellite tiles for the area around the floor plan (outside background.geojson). */
export function mapboxTilesForBounds(
  bounds: GeoBounds,
  project: (p: MapPoint) => MapPoint,
  token: string,
): SvgTileRect[] {
  const url = (coord: TileCoord) => mapboxSatelliteTileUrl(coord, token);
  return tilesCoveringBounds(bounds, 18, 15, 48).map((coord) =>
    tileToSvgRect(coord, project, url, "mb-"),
  );
}
