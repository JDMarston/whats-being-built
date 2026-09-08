import maplibregl from 'maplibre-gl';
import { createMapStyle, vectorBaseLayers, vectorLabelLayers } from './mapStyle';
import { globalImageryLayerId, localAerialLayerIds } from './imageryLayers';

export const mapCenter: [number, number] = [-82.6400, 27.7718];
export function createMapLibreMap(container: HTMLElement, isMobile: boolean) {
  return new maplibregl.Map({
    container, center: mapCenter, zoom: isMobile ? 14.4 : 15,
    pitch: 45, bearing: 0, maxZoom: 20, maxPitch: 65,
    pixelRatio: Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2),
    hash: true, attributionControl: false, style: createMapStyle(),
    fadeDuration: 150
  });
}

export function setImageryVisibility(map: maplibregl.Map, mode: string, labels: boolean) {
  const street = mode === 'street-map';
  const visible = (id: string, show: boolean) => {
    const value = show ? 'visible' : 'none';
    if (map.getLayoutProperty(id, 'visibility') !== value) map.setLayoutProperty(id, 'visibility', value);
  };
  vectorBaseLayers.forEach(id => visible(id, street));
  vectorLabelLayers.forEach(id => visible(id, street || labels));
  [globalImageryLayerId, ...localAerialLayerIds].forEach(id => visible(id, mode === id));
}

export function set3DMode(map: maplibregl.Map, enabled: boolean, animate = true) {
  map.setLayoutProperty('building-3d', 'visibility', enabled ? 'visible' : 'none');
  // Keep the user's bearing: changing depth should not unexpectedly spin north.
  map.easeTo({ pitch: enabled ? 45 : 0, duration: animate ? 400 : 0 });
}

export function centerOnProject(map: maplibregl.Map, lngLat: [number, number], mobile: boolean) {
  const short = window.innerHeight < 500;
  map.easeTo({ center: lngLat, zoom: Math.max(map.getZoom(), 16), duration: 500,
    offset: short ? [150, 25]
      : mobile ? [-19, (110 - Math.min(window.innerHeight * 0.46, 420) - 22) / 2]
      : [175, 40]
  });
}
