import maplibregl, { type LngLat, type Map, type StyleSpecification } from 'maplibre-gl';
import type { Project } from './projects';
import { globalImageryLayerId, localAerialLayerIds, streetMapLayerId } from './imageryLayers';

export const mapProviderName = 'maplibre-public';
export const mapCenter: [number, number] = [-82.6400, 27.7718];

export type MapViewProvider = {
  name: typeof mapProviderName;
  getCenter: () => LngLat;
  getZoom: () => number;
  getBearing: () => number;
  onReady: (callback: () => void) => void;
  onViewChangeEnd: (callback: () => void) => void;
  whenLayerReady: (layerId: string, callback: () => void) => void;
  setImageryVisibility: (nextMode: string, showStreetOverlay: boolean) => void;
  set3DMode: (enabled: boolean) => void;
  addProjectMarker: (project: Project, markerElement: HTMLElement) => maplibregl.Marker;
  centerOnProject: (lngLat: [number, number]) => void;
  setUserLocationMarker: (markerElement: HTMLElement, lngLat: [number, number]) => void;
  centerOnLocation: (lngLat: [number, number], accuracyMeters?: number) => void;
  addLocateControl: (startTracking: (button: HTMLButtonElement) => void, locateButtons: Set<HTMLButtonElement>) => void;
};

const openMapTilesAttribution = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

export function createMapLibreMap(container: HTMLElement, isMobile: boolean): Map {
  return new maplibregl.Map({
    container,
    center: mapCenter,
    zoom: isMobile ? 13.4 : 14.2,
    pitch: isMobile ? 48 : 55,
    bearing: isMobile ? -12 : -18,
    maxZoom: 20,
    maxPitch: 85,
    hash: true,
    attributionControl: false,
    style: mapStyle(isMobile)
  });
}

function mapStyle(isMobile: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      'esri-world': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Imagery &copy; Esri'
      },
      'osm-streets': {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors'
      },
      'pinellas-2025': {
        type: 'raster',
        tiles: [
          'https://egis.pinellas.gov/gis/rest/services/Aerials2025/ImageServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Pinellas County Enterprise GIS'
      },
      'pinellas-2024': {
        type: 'raster',
        tiles: [
          'https://egis.pinellas.gov/gis/rest/services/Aerials/Aerials2024/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=jpgpng&transparent=false&f=image'
        ],
        tileSize: 256,
        attribution: 'Pinellas County Enterprise GIS'
      },
      'hillsborough-2025': {
        type: 'raster',
        tiles: [
          'https://maps.hillsboroughcounty.org/arcgis/rest/services/AerialsNew/Aerials_2025/ImageServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        attribution: 'Hillsborough County Geospatial Services'
      },
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
        attribution: openMapTilesAttribution
      },
      terrain: {
        type: 'raster-dem',
        url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
        tileSize: 256,
        attribution: '<a href="https://earth.jaxa.jp/en/data/policy/" target="_blank" rel="noopener">AW3D30 (JAXA)</a>'
      }
    },
    layers: [
      {
        id: 'esri-world',
        type: 'raster',
        source: 'esri-world'
      },
      {
        id: 'pinellas-2025',
        type: 'raster',
        source: 'pinellas-2025',
        layout: {
          visibility: 'none'
        }
      },
      {
        id: 'pinellas-2024',
        type: 'raster',
        source: 'pinellas-2024',
        layout: {
          visibility: 'none'
        }
      },
      {
        id: 'hillsborough-2025',
        type: 'raster',
        source: 'hillsborough-2025',
        layout: {
          visibility: 'none'
        }
      },
      {
        id: 'osm-streets',
        type: 'raster',
        source: 'osm-streets',
        layout: {
          visibility: 'none'
        },
        paint: {
          'raster-opacity': 1
        }
      },
      {
        id: 'terrain-shade',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-shadow-color': '#1a2429',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#5b6d72',
          'hillshade-exaggeration': 0.25
        }
      },
      {
        id: 'building-3d',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 14,
        filter: [
          'all',
          ['!=', ['get', 'hide_3d'], true]
        ],
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'colour'],
            ['get', 'colour'],
            '#d7d1c5'
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.8,
            ['coalesce', ['get', 'render_height'], 8]
          ],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.72,
          'fill-extrusion-vertical-gradient': true
        }
      }
    ],
    terrain: {
      source: 'terrain',
      exaggeration: isMobile ? 1.35 : 1.5
    },
    sky: {}
  };
}

export function createMapProvider(mapInstance: Map, isMobile: boolean): MapViewProvider {
  let userLocationMarker: maplibregl.Marker | null = null;

  return {
    name: mapProviderName,
    getCenter() {
      return mapInstance.getCenter();
    },
    getZoom() {
      return mapInstance.getZoom();
    },
    getBearing() {
      return mapInstance.getBearing();
    },
    onReady(callback) {
      if (mapInstance.loaded()) {
        callback();
        return;
      }
      mapInstance.once('load', callback);
    },
    onViewChangeEnd(callback) {
      mapInstance.on('moveend', callback);
      mapInstance.on('zoomend', callback);
    },
    whenLayerReady(layerId, callback) {
      window.setTimeout(() => {
        try {
          if (mapInstance.getLayer(layerId)) callback();
        } catch {
          // React StrictMode can remove the first dev map instance before this delayed check runs.
        }
      }, 1200);
    },
    setImageryVisibility(nextMode, showStreetOverlay) {
      const showStreetMap = nextMode === 'street-map';
      mapInstance.setLayoutProperty(globalImageryLayerId, 'visibility', showStreetMap ? 'none' : 'visible');
      mapInstance.setLayoutProperty(streetMapLayerId, 'visibility', showStreetMap || showStreetOverlay ? 'visible' : 'none');
      mapInstance.setPaintProperty(streetMapLayerId, 'raster-opacity', showStreetOverlay && !showStreetMap ? 0.38 : 1);
      localAerialLayerIds.forEach((layerId) => {
        mapInstance.setLayoutProperty(layerId, 'visibility', nextMode === layerId ? 'visible' : 'none');
      });
    },
    set3DMode(enabled) {
      mapInstance.easeTo({
        pitch: enabled ? (isMobile ? 48 : 55) : 0,
        bearing: enabled ? (isMobile ? -12 : -18) : 0,
        duration: 650
      });
      mapInstance.setLayoutProperty('building-3d', 'visibility', enabled ? 'visible' : 'none');
      mapInstance.setLayoutProperty('terrain-shade', 'visibility', enabled ? 'visible' : 'none');
      mapInstance.setTerrain(enabled ? {
        source: 'terrain',
        exaggeration: isMobile ? 1.35 : 1.5
      } : null);
    },
    addProjectMarker(project, markerElement) {
      return new maplibregl.Marker({
        element: markerElement,
        anchor: 'bottom'
      })
        .setLngLat([project.lng as number, project.lat as number])
        .addTo(mapInstance);
    },
    centerOnProject(lngLat) {
      mapInstance.easeTo({
        center: lngLat,
        zoom: Math.max(mapInstance.getZoom(), isMobile ? 15.2 : 15.5),
        duration: 650,
        padding: isMobile ? { top: 150, bottom: 260, left: 24, right: 24 } : { top: 110, bottom: 180, left: 320, right: 24 }
      });
    },
    setUserLocationMarker(markerElement, lngLat) {
      if (!userLocationMarker) {
        userLocationMarker = new maplibregl.Marker({
          element: markerElement,
          anchor: 'center'
        });
      }
      userLocationMarker.setLngLat(lngLat).addTo(mapInstance);
    },
    centerOnLocation(lngLat, accuracyMeters = 0) {
      const targetZoom = accuracyMeters > 800 ? 13.8 : accuracyMeters > 250 ? 14.8 : 16;
      mapInstance.easeTo({
        center: lngLat,
        zoom: Math.max(mapInstance.getZoom(), targetZoom),
        duration: 700
      });
    },
    addLocateControl(startTracking, locateButtons) {
      mapInstance.addControl(new LocateControl(startTracking, locateButtons, isMobile), 'top-right');
    }
  };
}

class LocateControl implements maplibregl.IControl {
  private button: HTMLButtonElement | null = null;

  constructor(
    private readonly startTracking: (button: HTMLButtonElement) => void,
    private readonly locateButtons: Set<HTMLButtonElement>,
    private readonly isMobile: boolean
  ) {}

  onAdd(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = this.isMobile ? 'Show my location and heading' : 'Show my location';
    button.setAttribute('aria-label', button.title);
    button.innerHTML = '<span class="locate-icon" aria-hidden="true"></span>';
    button.addEventListener('click', () => this.startTracking(button));
    this.button = button;
    this.locateButtons.add(button);

    container.appendChild(button);
    return container;
  }

  onRemove(): void {
    if (this.button) this.locateButtons.delete(this.button);
  }
}
