import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildCarparkMapData } from "@/lib/map/load-map-data";
import type { MapGeoCollection } from "@/lib/map/types";

const MAP_DIR = path.join(process.cwd(), "public", "map");

async function readGeoJson(name: string): Promise<MapGeoCollection> {
  const raw = await readFile(path.join(MAP_DIR, name), "utf8");
  return JSON.parse(raw) as MapGeoCollection;
}

/** Server-side loader (reads GeoJSON from public/map on disk). */
export async function loadCarparkMapDataServer() {
  const [background, carLots, pillars, lobby] = await Promise.all([
    readGeoJson("grab_background.geojson"),
    readGeoJson("grab_car_lot.geojson"),
    readGeoJson("grab_pillar.geojson"),
    readGeoJson("grab_lobby.geojson"),
  ]);
  return buildCarparkMapData({ background, carLots, pillars, lobby });
}
