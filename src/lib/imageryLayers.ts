export type LocalAerialLayer = {
  id: string;
  optionLabel: string;
  note: string;
  autoNote: string;
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
    optionLabel: 'Pinellas 2025 detail',
    note: 'Pinellas 2025 detail over global imagery',
    autoNote: 'Pinellas 2025 local aerials',
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
    optionLabel: 'Hillsborough 2025 detail',
    note: 'Hillsborough 2025 detail over global imagery',
    autoNote: 'Hillsborough 2025 local aerials',
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
    optionLabel: 'Pinellas 2024 detail',
    note: 'Pinellas 2024 detail over global imagery',
    autoNote: 'Pinellas 2024 local aerials',
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

export const imageryNotes: Record<string, string> = {
  satellite: 'Newest aerial imagery when available',
  'satellite-streets': 'Newest aerial imagery with street map overlay',
  'street-map': 'Street map'
};

export function localAerialById(id: string): LocalAerialLayer | undefined {
  return localAerialImagery.find((layer) => layer.id === id);
}
