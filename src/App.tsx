import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import ImageryBadge from './components/ImageryBadge';
import MapLegend from './components/MapLegend';
import ProjectBottomSheet from './components/ProjectBottomSheet';
import ProjectSearchPanel from './components/ProjectSearchPanel';
import { distanceMeters, nearbyRadiusMeters, type UserLocation } from './lib/nearby';
import type { ImageryMode } from './lib/imageryLayers';
import { hasCoordinates, projects, shouldShowProject, type Project, type ProjectStatus } from './lib/projects';

const MapView = lazy(() => import('./components/MapView'));
const DataReviewDashboard = lazy(() => import('./components/DataReviewDashboard'));
const imageryOptions = [
  { value: 'street-map' as const, label: 'Streets' },
  { value: 'satellite-streets' as const, label: 'Satellite + labels' },
  { value: 'satellite' as const, label: 'Satellite' }
];

export default function App() {
  return <Suspense fallback={<div className="app-loading" role="status">Opening What’s Being Built…</div>}>
    {window.location.pathname === '/review' ? <DataReviewDashboard /> : <MapApp />}
  </Suspense>;
}

function MapApp() {
  const [selectedImageryMode, setSelectedImageryMode] = useState<ImageryMode>('street-map');
  const [is3DEnabled, setIs3DEnabled] = useState(() => {
    const parts = window.location.hash.slice(1).split('/');
    const valid = parts.length >= 3 && parts.slice(0, 3).every(value => value !== '' && Number.isFinite(Number(value)));
    return valid ? Number(parts[4] || 0) > 0 : true;
  });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [panel, setPanel] = useState<'about' | 'search' | 'options' | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'all'>('all');
  const [overviewRequest, setOverviewRequest] = useState(0);
  const [imageryBadge, setImageryBadge] = useState({ dateText: 'Street map', sourceText: 'OpenStreetMap' });
  // The retired manual capture form's localStorage is deliberately untouched.
  // Unverified personal captures are not published or mixed with sourced pins.
  const activeProjects = useMemo(() => projects.filter(shouldShowProject).filter(hasCoordinates), []);
  const visibleProjects = useMemo(() => selectedStatus === 'all' ? activeProjects : activeProjects.filter(p => p.status === selectedStatus), [activeProjects, selectedStatus]);
  const nearbyCount = userLocation ? activeProjects.filter(p => distanceMeters(userLocation, {lat: p.lat!, lng: p.lng!}) <= nearbyRadiusMeters).length : null;
  const selectProject = (project: Project) => { setSelectedProject(project); setPanel(null); };
  useEffect(() => {
    if (selectedProject && !visibleProjects.some(p => p.id === selectedProject.id)) setSelectedProject(null);
  }, [selectedProject, visibleProjects]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPanel(null); setSelectedProject(null); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, []);

  return <div className={`app-shell ${selectedProject ? 'has-selected-project' : ''} ${panel ? `panel-${panel}` : ''}`}>
    <Suspense fallback={<div className="map-loading" role="status">Loading map…</div>}>
      <MapView projects={visibleProjects} selectedProject={selectedProject} selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled} overviewRequest={overviewRequest} onProjectSelect={selectProject} onUserLocationChange={setUserLocation}
        onImageryBadgeChange={next => setImageryBadge(current => current.dateText === next.dateText && current.sourceText === next.sourceText ? current : next)} />
    </Suspense>
    <section className={`site-intro-card ${panel === 'about' ? 'is-open' : ''}`} aria-label="About What's Being Built">
      <button type="button" className="intro-summary" aria-expanded={panel === 'about'} aria-controls="aboutContent"
        onClick={() => setPanel(panel === 'about' ? null : 'about')}>
        <span>What’s Being Built?</span><small>{nearbyCount === null ? `${activeProjects.length} mapped` : `${nearbyCount} within 5 mi`}</small><span className="intro-summary-chevron" aria-hidden="true">{panel === 'about' ? '−' : '+'}</span>
      </button>
      <div id="aboutContent" className="intro-content" hidden={panel !== 'about'}>
        <h1>Walk past it. Find out.</h1>
        <p>Tap a project for details and sources. Tap a numbered group to zoom in.</p>
        <p className="intro-note">Use the location button to find yourself. Drag to explore; tap it again to recenter. The compass resets north. On a phone, pinch to zoom and drag with two fingers to tilt.</p>
        <p className="intro-note">Project coverage starts in St. Petersburg. The basemap works worldwide; building detail depends on local OpenStreetMap coverage.</p>
        <p className="intro-note">Missing a site? Location-only investigation requests are planned. You do not need to research or fill in a project yourself.</p>
      </div>
    </section>
    <ProjectSearchPanel userLocation={userLocation} projects={visibleProjects} allProjects={activeProjects} selectedProjectId={selectedProject?.id}
      selectedStatus={selectedStatus} onStatusChange={setSelectedStatus} onProjectSelect={selectProject}
      isOpen={panel === 'search'} onOpenChange={open => { setPanel(open ? 'search' : null); if (open) setSelectedProject(null); }} />
    <MapLegend imageryOptions={imageryOptions} selectedImageryMode={selectedImageryMode} is3DEnabled={is3DEnabled}
      isMenuOpen={panel === 'options'} isLegendOpen={isLegendOpen} onImageryChange={setSelectedImageryMode}
      on3DToggle={() => setIs3DEnabled(current => !current)} onMenuToggle={() => { setPanel(panel === 'options' ? null : 'options'); setSelectedProject(null); }}
      onLegendToggle={() => setIsLegendOpen(current => !current)} onOverview={() => { setSelectedProject(null); setPanel(null); setOverviewRequest(n => n + 1); }} />
    <ImageryBadge dateText={imageryBadge.dateText} sourceText={imageryBadge.sourceText} />
    <ProjectBottomSheet userLocation={userLocation} project={selectedProject} onClose={() => setSelectedProject(null)} />
  </div>;
}
