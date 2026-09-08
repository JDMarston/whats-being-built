import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { imageryMetadataUrl, localAerialImagery, type ImageryMode } from '../lib/imageryLayers';
import { hasCoordinates, type Project } from '../lib/projects';
import { centerOnProject, createMapLibreMap, set3DMode, setImageryVisibility } from '../lib/mapProvider';
import type { UserLocation } from '../lib/nearby';
import { headingFromReading, normalizeDegrees, smoothHeading } from '../lib/orientation';

type Badge = { dateText: string; sourceText: string };
type Props = {
  projects: Project[]; selectedProject: Project | null; selectedImageryMode: ImageryMode;
  is3DEnabled: boolean; overviewRequest: number;
  onProjectSelect: (project: Project) => void;
  onUserLocationChange: (location: UserLocation | null) => void;
  onImageryBadgeChange: (badge: Badge) => void;
};

function projectData(projects: Project[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: 'FeatureCollection', features: projects.filter(hasCoordinates).map(project => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [project.lng!, project.lat!] },
    properties: { id: project.id, status: project.status, name: project.name }
  })) };
}

export default function MapView(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const latest = useRef(props); latest.current = props;
  const [ready, setReady] = useState(false);
  const last3D = useRef(props.is3DEnabled);
  const [mapError, setMapError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [locationWarning, setLocationWarning] = useState(false);
  const applyImagery = useRef<() => void>(() => {});

  useEffect(() => {
    if (!container.current) return;
    const element = container.current;
    const mobile = window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
    let map: maplibregl.Map;
    try { map = createMapLibreMap(element, mobile); }
    catch { setMapError('The map could not start. Try reloading with WebGL enabled.'); return; }
    mapRef.current = map;
    let disposed = false;
    const startedAt = performance.now();
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: !mobile }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 90, unit: 'imperial' }), 'bottom-left');
    const locate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
      trackUserLocation: true, showUserLocation: true, showAccuracyCircle: true,
      fitBoundsOptions: { maxZoom: 17, duration: 500, padding: 65 }
    });
    map.addControl(locate, 'top-right');
    let heading: number | null = null;
    let compassStarted = false;
    let lastAccuracy: number | null = null;
    let headingTimer: ReturnType<typeof setTimeout> | undefined;
    const renderHeading = () => {
      const dot = element.querySelector<HTMLElement>('.maplibregl-user-location-dot');
      if (!dot) return;
      dot.classList.toggle('has-heading', heading !== null);
      if (heading !== null) dot.style.setProperty('--heading', `${normalizeDegrees(heading - map.getBearing())}deg`);
    };
    const updateHeading = (next: number) => {
      heading = smoothHeading(heading, next); renderHeading();
      clearTimeout(headingTimer);
      headingTimer = setTimeout(() => { heading = null; renderHeading(); }, 5000);
    };
    const orientation = (event: DeviceOrientationEvent) => {
      const angle = screen.orientation?.angle ?? (typeof window.orientation === 'number' ? window.orientation : 0);
      const next = headingFromReading(event, angle);
      if (next !== null) updateHeading(next);
    };
    const beginCompass = async () => {
      if (compassStarted || !window.DeviceOrientationEvent) return;
      compassStarted = true;
      try {
        const api = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
        if (api.requestPermission && await api.requestPermission() !== 'granted') { compassStarted = false; return; }
        if (disposed) return;
        window.addEventListener('deviceorientationabsolute', orientation);
        window.addEventListener('deviceorientation', orientation);
      } catch { compassStarted = false; }
    };
    // iOS requires the compass request in the actual button gesture, not in a
    // later geolocation callback. Only north-referenced readings are accepted.
    const locateClick = (event: Event) => {
      if (!(event.target instanceof Element) || !event.target.closest('.maplibregl-ctrl-geolocate')) return;
      if (event.target.closest('.maplibregl-ctrl-geolocate-active')) {
        latest.current.onUserLocationChange(null);
        setLocationStatus(''); heading = null; renderHeading(); clearTimeout(headingTimer);
        window.removeEventListener('deviceorientationabsolute', orientation);
        window.removeEventListener('deviceorientation', orientation);
        compassStarted = false;
      } else {
        setLocationStatus(lastAccuracy === null ? 'Finding your location…' : `Your location · ±${Math.round(lastAccuracy)} m`);
        setLocationWarning(lastAccuracy !== null && lastAccuracy > 200);
        void beginCompass();
      }
    };
    element.addEventListener('click', locateClick, true);
    locate.on('geolocate', event => {
      const coords = (event as unknown as { coords: GeolocationCoordinates }).coords;
      const accuracy = Number(coords.accuracy);
      lastAccuracy = Number.isFinite(accuracy) ? accuracy : null;
      latest.current.onUserLocationChange({ lat: coords.latitude, lng: coords.longitude, accuracy });
      setLocationStatus(Number.isFinite(accuracy) ? `Your location · ±${Math.round(accuracy)} m` : 'Your location · accuracy unknown');
      setLocationWarning(!Number.isFinite(accuracy) || accuracy > 200);
      if (typeof coords.heading === 'number' && Number.isFinite(coords.heading) && (coords.speed ?? 0) > 1) updateHeading(coords.heading);
      renderHeading();
    });
    locate.on('error', event => {
      const code = (event as unknown as { code: number }).code;
      if (code === 1) latest.current.onUserLocationChange(null);
      setLocationWarning(true);
      setLocationStatus(code === 1 ? 'Location blocked. Allow location in your browser settings.' : code === 3 ? 'Location timed out. Tap locate to retry.' : 'Location unavailable. Tap locate to retry.');
      heading = null; renderHeading();
    });
    map.on('rotate', renderHeading);

    let activeMode = '';
    let metadataKey = '';
    let controller: AbortController | null = null;
    const cache = new Map<string, Badge>();
    const badge = (dateText: string, sourceText: string) => latest.current.onImageryBadgeChange({ dateText, sourceText });
    const updateImagery = () => {
      if (!map.getLayer('esri-world')) return;
      const choice = latest.current.selectedImageryMode;
      const bounds = map.getBounds();
      const local = localAerialImagery.find(layer => map.getZoom() >= layer.minZoom &&
        bounds.getWest() >= layer.bounds.west && bounds.getEast() <= layer.bounds.east &&
        bounds.getSouth() >= layer.bounds.south && bounds.getNorth() <= layer.bounds.north);
      const mode = choice === 'street-map' ? 'street-map' : local?.id || 'esri-world';
      const modeKey = `${mode}/${choice}`;
      if (modeKey !== activeMode) {
        setImageryVisibility(map, mode, choice === 'satellite-streets'); activeMode = modeKey;
      }
      if (mode !== 'esri-world') {
        controller?.abort(); metadataKey = '';
        if (mode === 'street-map') badge('Street map', 'OpenStreetMap · building heights vary by coverage');
        else badge(`Imagery: ${local!.dateLabel}`, `${local!.sourceLabel} · ${local!.resolutionLabel || 'resolution not published'}`);
        return;
      }
      const center = map.getCenter();
      const zoom = Math.round(map.getZoom());
      const key = `${center.lng.toFixed(3)}/${center.lat.toFixed(3)}/${zoom}`;
      if (key === metadataKey) return;
      metadataKey = key; controller?.abort(); controller = new AbortController();
      const cached = cache.get(key);
      if (cached) { badge(cached.dateText, cached.sourceText); return; }
      badge('Satellite', 'Checking imagery date…');
      const params = new URLSearchParams({ f: 'json', geometry: `${center.lng},${center.lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'SRC_DATE,SRC_DATE2,SRC_DESC', returnGeometry: 'false', where: `MinMapLevel <= ${zoom} AND MaxMapLevel >= ${zoom}`, orderByFields: 'DrawOrder DESC' });
      fetch(`${imageryMetadataUrl}?${params}`, { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error('metadata unavailable');
        const data = await response.json();
        if (disposed || metadataKey !== key) return;
        const a = data.features?.[0]?.attributes;
        const raw = String(a?.SRC_DATE || '');
        const date = a?.SRC_DATE2 ? new Date(a.SRC_DATE2) : /^\d{8}$/.test(raw) ? new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6)}T00:00:00Z`) : null;
        const value = { dateText: date && Number.isFinite(date.getTime()) ? `Imagery: ${date.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })}` : 'Imagery date unavailable', sourceText: a?.SRC_DESC || 'Esri World Imagery' };
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, value); badge(value.dateText, value.sourceText);
      }).catch(error => {
        if (error.name !== 'AbortError' && !disposed && metadataKey === key) { metadataKey = ''; badge('Imagery date unavailable', 'Esri World Imagery'); }
      });
    };
    applyImagery.current = updateImagery;
    map.on('moveend', updateImagery); // zoomend also fires moveend: do not request twice.
    map.once('load', () => {
      map.addSource('projects', { type: 'geojson', data: projectData(latest.current.projects), cluster: true, clusterRadius: 42, clusterMaxZoom: 14 });
      map.addLayer({ id: 'clusters', type: 'circle', source: 'projects', filter: ['has', 'point_count'], paint: { 'circle-radius': 19, 'circle-color': '#172d36', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'projects', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-allow-overlap': true }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({ id: 'project-points', type: 'circle', source: 'projects', filter: ['!', ['has', 'point_count']], paint: {
        'circle-radius': 8, 'circle-color': ['match', ['get', 'status'], 'proposed', '#4fb4ff', 'approved', '#b879ff', 'recently_completed', '#42c47c', '#ff9b28'], 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff'
      } });
      map.addLayer({ id: 'project-selected', type: 'circle', source: 'projects', filter: ['==', ['get', 'id'], latest.current.selectedProject?.id || ''], paint: { 'circle-radius': 13, 'circle-opacity': 0, 'circle-stroke-width': 3, 'circle-stroke-color': '#172d36' } });
      map.addLayer({ id: 'project-hit', type: 'circle', source: 'projects', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 22, 'circle-opacity': 0 } });
      map.on('click', async event => {
        const hits = map.queryRenderedFeatures(event.point, { layers: ['clusters', 'project-hit'] });
        if (!hits.length) return;
        // Choose the nearest center where expanded touch targets overlap.
        hits.sort((a, b) => {
          const distance = (f: typeof a) => map.project((f.geometry as GeoJSON.Point).coordinates as [number, number]).dist(event.point);
          return distance(a) - distance(b);
        });
        const hit = hits[0];
        if (hit.properties.cluster_id !== undefined) {
          try {
            const source = map.getSource('projects') as maplibregl.GeoJSONSource;
            const zoom = await source.getClusterExpansionZoom(hit.properties.cluster_id);
            if (!disposed) map.easeTo({ center: (hit.geometry as GeoJSON.Point).coordinates as [number, number], zoom, duration: 400 });
          } catch { /* A filter can replace cluster IDs during the worker request. */ }
        } else {
          const project = latest.current.projects.find(p => p.id === hit.properties.id);
          if (project) latest.current.onProjectSelect(project);
        }
      });
      for (const layer of ['clusters', 'project-hit']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }
      map.setLayoutProperty('building-3d', 'visibility', latest.current.is3DEnabled ? 'visible' : 'none');
      updateImagery(); setReady(true);
      performance.measure('wbb-map-ready', { start: startedAt, end: performance.now() });
    });
    map.on('error', event => {
      console.warn('Map resource unavailable', event.error?.message);
      if (!map.getSource('projects')) setMapError('Map tiles are taking longer than expected. You can still browse the project list.');
    });
    map.on('idle', () => setMapError(''));
    return () => {
      disposed = true; controller?.abort(); clearTimeout(headingTimer);
      element.removeEventListener('click', locateClick, true);
      window.removeEventListener('deviceorientationabsolute', orientation);
      window.removeEventListener('deviceorientation', orientation);
      map.remove(); mapRef.current = null; applyImagery.current = () => {};
    };
  }, []);

  useEffect(() => { if (ready) applyImagery.current(); }, [props.selectedImageryMode, ready]);
  useEffect(() => {
    if (ready && mapRef.current && last3D.current !== props.is3DEnabled) {
      set3DMode(mapRef.current, props.is3DEnabled); last3D.current = props.is3DEnabled;
    }
  }, [props.is3DEnabled, ready]);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    (mapRef.current.getSource('projects') as maplibregl.GeoJSONSource).setData(projectData(props.projects));
  }, [props.projects, ready]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setFilter('project-selected', ['==', ['get', 'id'], props.selectedProject?.id || '']);
    if (props.selectedProject && hasCoordinates(props.selectedProject)) centerOnProject(map, [props.selectedProject.lng!, props.selectedProject.lat!], window.innerWidth <= 720);
  }, [props.selectedProject, ready]);
  useEffect(() => {
    const map = mapRef.current;
    const points = latest.current.projects.filter(hasCoordinates);
    if (!ready || !map || !props.overviewRequest || !points.length) return;
    const bounds = new maplibregl.LngLatBounds(); points.forEach(p => bounds.extend([p.lng!, p.lat!]));
    const camera = map.cameraForBounds(bounds, { padding: { top: 125, bottom: 70, left: 35, right: 75 }, maxZoom: 15 });
    if (camera) map.easeTo({ ...camera, duration: 500 });
  }, [props.overviewRequest, ready]);

  return <>
    <div id="map" ref={container} data-ready={ready} aria-label="Construction project map" />
    {mapError ? <p className="map-message" role="status">{mapError}</p> : null}
    {locationStatus ? <div className={`location-readout ${locationWarning ? 'is-warning' : ''}`} role="status">
      <span>{locationStatus}</span><button type="button" aria-label="Dismiss location message" onClick={() => setLocationStatus('')}>×</button>
    </div> : null}
  </>;
}
