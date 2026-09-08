export type LocalAerialLayer = {
  id: string;
  dateLabel: string;
  sourceLabel: string;
  resolutionLabel?: string;
  dateRank: number;
  priority: number;
  minZoom: number;
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
};

export type ImageryMode = 'satellite' | 'satellite-streets' | 'street-map';

export const globalImageryLayerId = 'esri-world';
export const streetMapLayerId = 'osm-streets';
export const imageryMetadataUrl = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/4/query';

export const localAerialImagery: LocalAerialLayer[] = [
  {
    id: 'pinellas-2025',
    dateLabel: '2025',
    sourceLabel: 'Pinellas County Enterprise GIS',
    resolutionLabel: '0.08 m',
    dateRank: 2025,
    priority: 100,
    minZoom: 10.5,
    bounds: {
      west: -82.94,
      south: 27.55,
      east: -82.50,
      north: 28.20
    }
  },
  {
    id: 'hillsborough-2025',
    dateLabel: 'Jan 2025',
    sourceLabel: 'Hillsborough County Geospatial Services',
    resolutionLabel: '0.15 m',
    dateRank: 2025,
    priority: 90,
    minZoom: 10.5,
    bounds: {
      west: -82.78,
      south: 27.56,
      east: -82.05,
      north: 28.19
    }
  },
  {
    id: 'pinellas-2024',
    dateLabel: '2024',
    sourceLabel: 'Pinellas County Enterprise GIS',
    dateRank: 2024,
    priority: 80,
    minZoom: 10.5,
    bounds: {
      west: -82.94,
      south: 27.55,
      east: -82.50,
      north: 28.20
    }
  }
];

export const localAerialLayerIds = localAerialImagery.map((layer) => layer.id);

export function localAerialById(id: string): LocalAerialLayer | undefined {
  return localAerialImagery.find((layer) => layer.id === id);
}
