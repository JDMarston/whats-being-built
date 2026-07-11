import { useEffect, useMemo, useState } from 'react';
import type { ImageryOption } from './components/MapLegend';
import DataReviewDashboard from './components/DataReviewDashboard';
import FieldCapturePanel from './components/FieldCapturePanel';
import ImageryBadge from './components/ImageryBadge';
import MapLegend from './components/MapLegend';
import MapView from './components/MapView';
import ProjectBottomSheet from './components/ProjectBottomSheet';
import ProjectSearchPanel from './components/ProjectSearchPanel';
import type { ImageryMode } from './lib/imageryLayers';
import { projects, shouldShowProject, type Project, type ProjectStatus } from './lib/projects';

const fieldCaptureStorageKey = 'wbb-field-capture-projects';

function loadFieldCaptureProjects(): Project[] {
  try {
    const raw = window.localStorage.getItem(fieldCaptureStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed.filter((project) => project?.id && project.lat && project.lng) : [];
  } catch {
    return [];
  }
}

function saveFieldCaptureProjects(nextProjects: Project[]) {
  window.localStorage.setItem(fieldCaptureStorageKey, JSON.stringify(nextProjects));
}

export default function App() {
  const isReviewDashboardRoute = window.location.pathname === '/review';

  if (isReviewDashboardRoute) {
    return <DataReviewDashboard />;
  }

  const [selectedImageryMode, setSelectedImageryMode] = useState<ImageryMode>('satellite');
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isMapOptionsOpen, setIsMapOptionsOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ProjectStatus | 'all'>('all');
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [projectCountText, setProjectCountText] = useState('Loading projects');
  const [imageryNote, setImageryNote] = useState('Newest aerial imagery when available');
  const [imageryBadge, setImageryBadge] = useState({
    dateText: 'Imagery date loading',
    sourceText: 'Checking the current map view'
  });
  const [fieldCaptureProjects, setFieldCaptureProjects] = useState<Project[]>(() => loadFieldCaptureProjects());

  function handleFieldProjectCreate(project: Project) {
    setFieldCaptureProjects((currentProjects) => {
      const nextProjects = [project, ...currentProjects].slice(0, 30);
      saveFieldCaptureProjects(nextProjects);
      return nextProjects;
    });
    setSelectedProject(project);
  }

  const activeProjects = useMemo(
    () => [
      ...fieldCaptureProjects.filter(shouldShowProject).filter((project) => project.lat && project.lng),
      ...projects.filter(shouldShowProject).filter((project) => project.lat && project.lng)
    ],
    [fieldCaptureProjects]
  );

  const visibleProjects = useMemo(
    () => selectedStatus === 'all'
      ? activeProjects
      : activeProjects.filter((project) => project.status === selectedStatus),
    [activeProjects, selectedStatus]
  );

  const projectStats = useMemo(() => {
    const underConstruction = activeProjects.filter((project) => project.status === 'under_construction').length;
    const sourcedProjects = activeProjects.filter((project) => project.sources?.length).length;
    return {
      total: activeProjects.length,
      underConstruction,
      sourcedProjects
    };
  }, [activeProjects]);

  const imageryOptions = useMemo<ImageryOption[]>(() => [
    { value: 'satellite', label: 'Satellite' },
    { value: 'satellite-streets', label: 'Satellite + streets' },
    { value: 'street-map', label: 'Street map' }
  ], []);

  useEffect(() => {
    if (!selectedProject) return;
    if (visibleProjects.some((project) => project.id === selectedProject.id)) return;
    setSelectedProject(null);
  }, [selectedProject, visibleProjects]);

  return (
    <div className={`app-shell ${selectedProject ? 'has-selected-project' : ''}`}>
      <MapView
        key={visibleProjects.map((project) => project.id).join('|')}
        projects={visibleProjects}
        selectedProject={selectedProject}
        selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled}
        onProjectSelect={setSelectedProject}
        onProjectCountChange={setProjectCountText}
        onImageryNoteChange={setImageryNote}
        onImageryBadgeChange={setImageryBadge}
      />
      <section className={`site-intro-card ${isIntroOpen ? 'is-open' : ''}`} aria-label="About What's Being Built">
        <button
          type="button"
          className="intro-summary"
          aria-expanded={isIntroOpen}
          onClick={() => setIsIntroOpen((current) => !current)}
        >
          <span>What’s Being Built?</span>
          <small>{projectStats.total} nearby</small>
          <span className="intro-summary-chevron" aria-hidden="true">{isIntroOpen ? '⌃' : '⌄'}</span>
        </button>
        <div className="intro-content">
          <div className="intro-kicker">worldwide map · St. Pete starter data</div>
          <h1>What’s Being Built?</h1>
          <p>Find nearby construction, see the source, and keep thin data in review instead of cluttering the map.</p>
          <div className="intro-stat-grid" aria-label="Current map stats">
            <span><strong>{projectStats.total}</strong><small>mapped projects</small></span>
            <span><strong>{projectStats.underConstruction}</strong><small>under construction</small></span>
            <span><strong>{projectStats.sourcedProjects}</strong><small>with sources</small></span>
          </div>
          <p className="intro-note">The map should follow the place you’re in; St. Pete is just the first seeded area.</p>
          <a className="intro-review-link" href="/review">Review staged data</a>
        </div>
      </section>
      <ProjectSearchPanel
        projects={visibleProjects}
        allProjects={activeProjects}
        selectedProjectId={selectedProject?.id}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onProjectSelect={setSelectedProject}
      />
      <MapLegend
        imageryOptions={imageryOptions}
        selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled}
        isMenuOpen={isMapOptionsOpen}
        isLegendOpen={isLegendOpen}
        onImageryChange={setSelectedImageryMode}
        on3DToggle={() => setIs3DEnabled((current) => !current)}
        onMenuToggle={() => setIsMapOptionsOpen((current) => !current)}
        onLegendToggle={() => setIsLegendOpen((current) => !current)}
      />
      <ImageryBadge dateText={imageryBadge.dateText} sourceText={imageryBadge.sourceText} />
      <FieldCapturePanel onProjectCreate={handleFieldProjectCreate} />
      <ProjectBottomSheet project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
