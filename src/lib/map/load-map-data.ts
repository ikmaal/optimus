import {
  allRingsFromCollection,
  boundsOfRings,
  centroidOfRing,
  parseLotLabel,
  ringsFromFeature,
} from "@/lib/map/geojson";
import type { CarLotInfo, CarparkMapData, MapGeoCollection, MapRing } from "@/lib/map/types";

function passengerLobbyRings(lobbyCollection: MapGeoCollection): MapRing[] {
  return lobbyCollection.features
    .filter((f) => f.properties.type === "Passenger Lobby")
    .flatMap((f) => ringsFromFeature(f));
}

export function buildCarparkMapData(collections: {
  background: MapGeoCollection;
  carLots: MapGeoCollection;
  pillars: MapGeoCollection;
  lobby: MapGeoCollection;
}): CarparkMapData {
  const { background, carLots, pillars, lobby } = collections;

  const carLotInfos: CarLotInfo[] = carLots.features
    .map((feature) => {
      const parsed = parseLotLabel(feature.properties.type);
      if (!parsed) return null;
      const rings = ringsFromFeature(feature);
      const centroid = centroidOfRing(rings[0]!);
      return { label: parsed.label, lotNumber: parsed.lotNumber, rings, centroid };
    })
    .filter((x): x is CarLotInfo => x !== null)
    .sort((a, b) => a.lotNumber - b.lotNumber);

  const allRings = [
    ...allRingsFromCollection(background),
    ...carLotInfos.flatMap((l) => l.rings),
    ...allRingsFromCollection(pillars),
    ...allRingsFromCollection(lobby),
  ];

  return {
    layers: {
      background: background.features.flatMap((f) => ringsFromFeature(f)),
      carLots: carLotInfos,
      pillars: pillars.features.flatMap((f) => ringsFromFeature(f)),
      lobby: lobby.features.flatMap((f) => ringsFromFeature(f)),
      passengerLobby: passengerLobbyRings(lobby),
    },
    bounds: boundsOfRings(allRings),
    lotLabels: carLotInfos.map((l) => l.label),
  };
}

export function findLotByLabel(data: CarparkMapData, label: string | null | undefined): CarLotInfo | null {
  if (!label) return null;
  const normalized = label.trim();
  return data.layers.carLots.find((l) => l.label.toLowerCase() === normalized.toLowerCase()) ?? null;
}

export function lobbyCentroid(data: CarparkMapData) {
  const rings = data.layers.passengerLobby;
  if (rings.length === 0) return null;
  return centroidOfRing(rings[0]!);
}

const MAP_FILES = {
  background: "/map/grab_background.geojson",
  carLots: "/map/grab_car_lot.geojson",
  pillars: "/map/grab_pillar.geojson",
  lobby: "/map/grab_lobby.geojson",
} as const;

async function fetchGeoJson(url: string): Promise<MapGeoCollection> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load map layer: ${url}`);
  return res.json() as Promise<MapGeoCollection>;
}

/** Client-side loader (browser fetch from /public/map). */
export async function loadCarparkMapData(): Promise<CarparkMapData> {
  const [background, carLots, pillars, lobby] = await Promise.all([
    fetchGeoJson(MAP_FILES.background),
    fetchGeoJson(MAP_FILES.carLots),
    fetchGeoJson(MAP_FILES.pillars),
    fetchGeoJson(MAP_FILES.lobby),
  ]);
  return buildCarparkMapData({ background, carLots, pillars, lobby });
}
