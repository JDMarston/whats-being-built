import { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { projectPopupHtml } from './ProjectPopup';
import type { ImageryMode, LocalAerialLayer } from '../lib/imageryLayers';
import {
  globalImageryLayerId,
  imageryMetadataUrl,
  imageryNotes,
  localAerialById,
  localAerialImagery
} from '../lib/imageryLayers';
import { projectStatusClass, shouldShowProject, type Project } from '../lib/projects';
import { createMapLibreMap, createMapProvider, type MapViewProvider } from '../lib/mapProvider';

type ImageryBadgeState = {
  dateText: string;
  sourceText: string;
};

type MapViewProps = {
  projects: Project[];
  selectedImageryMode: ImageryMode;
  is3DEnabled: boolean;
  onProjectCountChange: (text: string) => void;
  onImageryNoteChange: (text: string) => void;
  onImageryBadgeChange: (badge: ImageryBadgeState) => void;
};

function formatResolution(meters: unknown): string {
  const value = Number(meters);
  if (!Number.isFinite(value) || value <= 0) return '';
  return value < 1 ? `${Math.round(value * 100)} cm` : `${value.toFixed(value < 10 ? 1 : 0)} m`;
}

function formatEsriDate(attributes: Record<string, unknown>): string {
  if (attributes.SRC_DATE2) {
    const date = new Date(attributes.SRC_DATE2 as string | number);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
  }

  const value = String(attributes.SRC_DATE || '');
  if (/^\d{8}$/.test(value)) {
    const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8))));
    return date.toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }
  return 'Date unavailable';
}

function describeEsriMetadata(attributes: Record<string, unknown>): string {
  const pieces = [
    attributes.SRC_DESC || attributes.NICE_NAME || 'Esri World Imagery',
    formatResolution(attributes.SRC_RES),
    attributes.ReleaseName
  ].filter(Boolean);
  return pieces.join(' - ');
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return 'unknown';
  if (meters >= 1609) return `${(meters / 1609).toFixed(1)} mi`;
  if (meters >= 305) return `${(meters / 1609).toFixed(2)} mi`;
  return `${Math.round(meters)} m`;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function screenOrientationAngle(): number {
  if (screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  return 0;
}

function headingFromDeviceEvent(event: DeviceOrientationEvent): number | null {
  if (typeof event.webkitCompassHeading === 'number') {
    return event.webkitCompassHeading;
  }
  if (typeof event.alpha !== 'number') {
    return null;
  }
  return 360 - event.alpha + screenOrientationAngle();
}

export default function MapView({
  projects,
  selectedImageryMode,
  is3DEnabled,
  onProjectCountChange,
  onImageryNoteChange,
  onImageryBadgeChange
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapViewRef = useRef<MapViewProvider | null>(null);
  const applyImageryModeRef = useRef<(() => void) | null>(null);
  const selectedImageryModeRef = useRef<ImageryMode>(selectedImageryMode);
  const activeImageryModeRef = useRef('global-satellite');
  const metadataAbortControllerRef = useRef<AbortController | null>(null);
  const metadataRequestIdRef = useRef(0);

  const visibleProjects = useMemo(
    () => projects.filter(shouldShowProject).filter((project) => project.lat && project.lng),
    [projects]
  );

  useEffect(() => {
    selectedImageryModeRef.current = selectedImageryMode;
    applyImageryModeRef.current?.();
  }, [selectedImageryMode]);

  useEffect(() => {
    onProjectCountChange(`${visibleProjects.length} current projects`);
  }, [onProjectCountChange, visibleProjects.length]);

  useEffect(() => {
    mapViewRef.current?.set3DMode(is3DEnabled);
  }, [is3DEnabled]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    const isMobile = window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;
    const map = createMapLibreMap(container, isMobile);
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const mapView = createMapProvider(map, isMobile);
    mapViewRef.current = mapView;

    let locationWatchId: number | null = null;
    let userPuckElement: HTMLDivElement | null = null;
    let latestUserHeading: number | null = null;
    let hasCenteredOnUser = false;
    let hasStartedHeading = false;
    let hasReceivedUserLocation = false;
    const locateButtons = new Set<HTMLButtonElement>();
    const locationPrompt = document.getElementById('locationPrompt') as HTMLDivElement | null;
    const locationPromptButton = document.getElementById('locationPromptButton') as HTMLButtonElement | null;
    const locationStatus = document.getElementById('locationStatus') as HTMLSpanElement | null;
    const headingListeners: Array<[string, EventListener]> = [];

    function setImageryBadge(dateText: string, sourceText: string) {
      onImageryBadgeChange({ dateText, sourceText });
    }

    function isLocalAerialVisible(layer: LocalAerialLayer): boolean {
      const center = mapView.getCenter();
      return mapView.getZoom() >= layer.minZoom &&
        center.lng >= layer.bounds.west &&
        center.lng <= layer.bounds.east &&
        center.lat >= layer.bounds.south &&
        center.lat <= layer.bounds.north;
    }

    function bestLocalAerialForView(): LocalAerialLayer | null {
      return localAerialImagery
        .filter(isLocalAerialVisible)
        .sort((a, b) => b.dateRank - a.dateRank || b.priority - a.priority)[0] || null;
    }

    function visibleAerialMode(): string {
      return bestLocalAerialForView()?.id || 'global-satellite';
    }

    async function updateGlobalImageryMetadata() {
      const requestId = ++metadataRequestIdRef.current;
      metadataAbortControllerRef.current?.abort();
      metadataAbortControllerRef.current = new AbortController();

      const center = mapView.getCenter();
      const zoomLevel = Math.max(0, Math.min(20, Math.round(mapView.getZoom())));
      const params = new URLSearchParams({
        f: 'json',
        geometry: `${center.lng},${center.lat}`,
        geometryType: 'esriGeometryPoint',
        inSR: '4326',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'SRC_DATE,SRC_DATE2,SRC_RES,SRC_DESC,NICE_NAME,NICE_DESC,MinMapLevel,MaxMapLevel,DrawOrder,ReleaseName',
        returnGeometry: 'false',
        where: `MinMapLevel <= ${zoomLevel} AND MaxMapLevel >= ${zoomLevel}`,
        orderByFields: 'DrawOrder DESC'
      });

      try {
        const response = await fetch(`${imageryMetadataUrl}?${params}`, {
          signal: metadataAbortControllerRef.current.signal
        });
        if (!response.ok) throw new Error(`Metadata request failed: ${response.status}`);
        const data = await response.json() as { features?: Array<{ attributes?: Record<string, unknown> }> };
        if (requestId !== metadataRequestIdRef.current || activeImageryModeRef.current !== 'global-satellite') return;

        const attributes = data.features?.[0]?.attributes;
        if (!attributes) {
          setImageryBadge('Imagery date unavailable', 'Esri World Imagery metadata was not returned here');
          return;
        }

        setImageryBadge(`Imagery: ${formatEsriDate(attributes)}`, describeEsriMetadata(attributes));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Could not load imagery metadata', error);
        if (requestId === metadataRequestIdRef.current && activeImageryModeRef.current === 'global-satellite') {
          setImageryBadge('Imagery date unavailable', 'Esri World Imagery metadata request failed');
        }
      }
    }

    function updateImageryBadge() {
      if (activeImageryModeRef.current === 'street-map') {
        setImageryBadge('Street map', 'Imagery date not applicable');
        return;
      }

      const localLayer = localAerialById(activeImageryModeRef.current);
      if (localLayer) {
        const details = [
          localLayer.sourceLabel,
          localLayer.resolutionLabel,
          localLayer.dateLabel.length === 4 ? 'collection month not published in this service' : ''
        ].filter(Boolean).join(' - ');
        setImageryBadge(`Imagery: ${localLayer.dateLabel}`, details);
        return;
      }

      setImageryBadge('Imagery date loading', 'Checking Esri World Imagery metadata');
      updateGlobalImageryMetadata();
    }

    function applyImageryMode() {
      if (!map.getLayer(globalImageryLayerId)) return;

      const nextMode = selectedImageryModeRef.current === 'street-map' ? 'street-map' : visibleAerialMode();
      const showStreetOverlay = selectedImageryModeRef.current === 'satellite-streets';

      mapView.setImageryVisibility(nextMode, showStreetOverlay);
      activeImageryModeRef.current = nextMode;

      if (selectedImageryModeRef.current === 'satellite' || selectedImageryModeRef.current === 'satellite-streets') {
        const aerialNote = localAerialById(nextMode)?.autoNote || 'Esri latest global imagery';
        onImageryNoteChange(showStreetOverlay ? `${aerialNote} + street overlay` : aerialNote);
      } else {
        onImageryNoteChange(imageryNotes[selectedImageryModeRef.current]);
      }

      updateImageryBadge();
    }

    function renderUserHeading() {
      if (!userPuckElement || latestUserHeading === null) return;
      userPuckElement.classList.add('has-heading');
      userPuckElement.style.setProperty('--heading', `${normalizeDegrees(latestUserHeading - mapView.getBearing())}deg`);
    }

    function ensureUserPuckElement(): HTMLDivElement {
      if (userPuckElement) return userPuckElement;
      userPuckElement = document.createElement('div');
      userPuckElement.className = 'user-puck';
      userPuckElement.setAttribute('aria-label', 'Your location');
      renderUserHeading();
      return userPuckElement;
    }

    function setUserHeading(degrees: number | null) {
      if (degrees === null || Number.isNaN(degrees)) return;
      latestUserHeading = normalizeDegrees(degrees);
      renderUserHeading();
    }

    function setLocationButtonsActive(isActive: boolean) {
      locateButtons.forEach((button) => button.classList.toggle('active', isActive));
      locationPromptButton?.classList.toggle('active', isActive);
    }

    function updateLocationStatus(message: string) {
      locationPrompt?.classList.remove('is-warning');
      if (locationStatus) locationStatus.textContent = message;
    }

    function showLocationWarning(message: string) {
      locationPrompt?.classList.add('is-visible', 'is-warning');
      if (locationStatus) locationStatus.textContent = message;
    }

    function needsSecureLocationOrigin(): boolean {
      return !window.isSecureContext;
    }

    function secureLocationMessage(): string {
      return 'Location needs HTTPS on phones. If you are using your PC IP address, the browser can still reject GPS after you tap Allow.';
    }

    function unavailableLocationMessage(): string {
      if (needsSecureLocationOrigin()) return secureLocationMessage();
      return 'Location is not available in this browser.';
    }

    function showLocationPrompt(force = false) {
      if (!isMobile || !locationPrompt || !locationPromptButton) return;
      if ((locationWatchId !== null || hasReceivedUserLocation) && !force) return;
      if (needsSecureLocationOrigin()) {
        locationPromptButton.disabled = true;
        updateLocationStatus(secureLocationMessage());
      } else if (!navigator.geolocation) {
        locationPromptButton.disabled = true;
        updateLocationStatus(unavailableLocationMessage());
      }
      locationPrompt.classList.add('is-visible');
    }

    function hideLocationPrompt() {
      locationPrompt?.classList.remove('is-visible', 'is-warning');
    }

    function updateLocationAccuracyStatus(accuracyMeters: number) {
      if (!Number.isFinite(accuracyMeters) || accuracyMeters <= 0) {
        showLocationWarning('Location found, but iPhone did not report accuracy.');
        return;
      }

      if (accuracyMeters > 800) {
        showLocationWarning(`iPhone reports accuracy about ${formatDistance(accuracyMeters)}. Turn on Precise Location for this browser, then tap again.`);
        return;
      }

      if (accuracyMeters > 200) {
        showLocationWarning(`Location is approximate, accuracy about ${formatDistance(accuracyMeters)}. Try tapping again near a window or outside.`);
        return;
      }

      hideLocationPrompt();
    }

    function updateUserLocation(position: GeolocationPosition) {
      hasReceivedUserLocation = true;
      const lngLat: [number, number] = [position.coords.longitude, position.coords.latitude];
      const accuracyMeters = Number(position.coords.accuracy);
      mapView.setUserLocationMarker(ensureUserPuckElement(), lngLat);
      updateLocationAccuracyStatus(accuracyMeters);
      setLocationButtonsActive(true);
      if (isMobile && typeof position.coords.heading === 'number') {
        setUserHeading(position.coords.heading);
      }
      if (!hasCenteredOnUser) {
        hasCenteredOnUser = true;
        mapView.centerOnLocation(lngLat, accuracyMeters);
      }
    }

    async function startMobileHeading() {
      if (!isMobile || hasStartedHeading || !window.DeviceOrientationEvent) return;
      hasStartedHeading = true;
      try {
        const orientationEvent = DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<'granted' | 'denied' | 'prompt'>;
        };
        if (typeof orientationEvent.requestPermission === 'function') {
          const permission = await orientationEvent.requestPermission();
          if (permission !== 'granted') return;
        }
        const updateHeading = ((event: DeviceOrientationEvent) => setUserHeading(headingFromDeviceEvent(event))) as EventListener;
        window.addEventListener('deviceorientationabsolute', updateHeading, true);
        window.addEventListener('deviceorientation', updateHeading, true);
        window.addEventListener('orientationchange', renderUserHeading);
        headingListeners.push(['deviceorientationabsolute', updateHeading], ['deviceorientation', updateHeading], ['orientationchange', renderUserHeading]);
      } catch (error) {
        console.warn('Device orientation unavailable', error);
      }
    }

    function locationErrorMessage(error: GeolocationPositionError): string {
      if (error.code === error.PERMISSION_DENIED) {
        if (needsSecureLocationOrigin()) return secureLocationMessage();
        return 'The browser denied location for this page. Try reloading and tapping Allow again.';
      }
      if (error.code === error.POSITION_UNAVAILABLE) {
        return 'Location is unavailable right now.';
      }
      return 'Location timed out. Try again when GPS has a clearer signal.';
    }

    function handleLocationError(error: GeolocationPositionError) {
      console.warn('Geolocation error', error);
      if (error.code === error.PERMISSION_DENIED && locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
      }
      if (hasReceivedUserLocation && error.code !== error.PERMISSION_DENIED) {
        return;
      }
      updateLocationStatus(locationErrorMessage(error));
      setLocationButtonsActive(false);
      showLocationPrompt(true);
    }

    function startLocationTracking(button: HTMLButtonElement) {
      if (needsSecureLocationOrigin()) {
        button.disabled = true;
        if (locationPromptButton) locationPromptButton.disabled = true;
        updateLocationStatus(secureLocationMessage());
        setLocationButtonsActive(false);
        showLocationPrompt(true);
        return;
      }
      if (!navigator.geolocation) {
        button.disabled = true;
        button.title = 'Location is unavailable';
        if (locationPromptButton) locationPromptButton.disabled = true;
        updateLocationStatus(unavailableLocationMessage());
        showLocationPrompt(true);
        return;
      }
      updateLocationStatus('Waiting for location permission...');
      setLocationButtonsActive(true);
      startMobileHeading();
      if (locationWatchId !== null) return;
      locationWatchId = navigator.geolocation.watchPosition(
        updateUserLocation,
        handleLocationError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000
        }
      );
    }

    applyImageryModeRef.current = applyImageryMode;
    mapView.addLocateControl(startLocationTracking, locateButtons);
    locationPromptButton?.addEventListener('click', () => startLocationTracking(locationPromptButton));
    mapView.onReady(() => {
      showLocationPrompt();
      applyImageryMode();
    });
    mapView.onViewChangeEnd(() => {
      renderUserHeading();
      applyImageryMode();
    });
    mapView.whenLayerReady(globalImageryLayerId, applyImageryMode);

    visibleProjects.forEach((project) => {
      const markerElement = document.createElement('button');
      markerElement.type = 'button';
      markerElement.className = `project-marker ${projectStatusClass(project.status)}`;
      markerElement.title = project.name;
      markerElement.setAttribute('aria-label', project.name);
      mapView.addProjectMarker(project, markerElement, projectPopupHtml(project));
    });

    return () => {
      metadataAbortControllerRef.current?.abort();
      if (locationWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(locationWatchId);
      }
      headingListeners.forEach(([eventName, listener]) => window.removeEventListener(eventName, listener));
      map.remove();
      mapRef.current = null;
      mapViewRef.current = null;
      applyImageryModeRef.current = null;
    };
  }, [onImageryBadgeChange, onImageryNoteChange, visibleProjects]);

  return (
    <>
      <div id="map" ref={mapContainerRef} />
      <div id="locationPrompt" className="location-prompt" aria-live="polite">
        <button id="locationPromptButton" type="button">Use my location</button>
        <span id="locationStatus" className="location-status">Enable location for nearby projects and heading.</span>
      </div>
    </>
  );
}
