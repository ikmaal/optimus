export type MapPoint = { x: number; y: number };

export type MapRing = MapPoint[];

export type MapFeatureProperties = {
  type?: string;
};

export type MapGeoFeature = {
  type: "Feature";
  properties: MapFeatureProperties;
  geometry: {
    type: "MultiPolygon" | "Polygon";
    coordinates: number[][][][] | number[][][];
  };
};

export type MapGeoCollection = {
  type: "FeatureCollection";
  features: MapGeoFeature[];
};

export type CarLotInfo = {
  label: string;
  lotNumber: number;
  rings: MapRing[];
  centroid: MapPoint;
};

export type CarparkMapLayers = {
  background: MapRing[];
  carLots: CarLotInfo[];
  pillars: MapRing[];
  lobby: MapRing[];
  passengerLobby: MapRing[];
};

export type CarparkMapData = {
  layers: CarparkMapLayers;
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number };
  lotLabels: string[];
};
