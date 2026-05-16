import { useMemo, useState } from 'react';
import HeaderControls, { type ImageryOption } from './components/HeaderControls';
import ImageryBadge from './components/ImageryBadge';
import MapLegend from './components/MapLegend';
import MapView from './components/MapView';
import ProjectBottomSheet from './components/ProjectBottomSheet';
import ProjectSearchPanel from './components/ProjectSearchPanel';
import type { ImageryMode } from './lib/imageryLayers';
import { projects, shouldShowProject, type Project } from './lib/projects';

export default function App() {
  const [selectedImageryMode, setSelectedImageryMode] = useState<ImageryMode>('satellite');
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isMapOptionsOpen, setIsMapOptionsOpen] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [projectCountText, setProjectCountText] = useState('Loading projects');
  const [imageryNote, setImageryNote] = useState('Newest aerial imagery when available');
  const [imageryBadge, setImageryBadge] = useState({
    dateText: 'Imagery date loading',
    sourceText: 'Checking the current map view'
  });

  const visibleProjects = useMemo(
    () => projects.filter(shouldShowProject).filter((project) => project.lat && project.lng),
    []
  );

  const imageryOptions = useMemo<ImageryOption[]>(() => [
    { value: 'satellite', label: 'Satellite' },
    { value: 'satellite-streets', label: 'Satellite + street map' },
    { value: 'street-map', label: 'Street map' }
  ], []);

  return (
    <div className={`app-shell ${selectedProject ? 'has-selected-project' : ''}`}>
      <HeaderControls
        projectCountText={projectCountText}
        imageryNote={imageryNote}
        imageryOptions={imageryOptions}
        selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled}
        onImageryChange={setSelectedImageryMode}
        on3DToggle={() => setIs3DEnabled((current) => !current)}
      />
      <MapView
        projects={visibleProjects}
        selectedProject={selectedProject}
        selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled}
        onProjectSelect={setSelectedProject}
        onProjectCountChange={setProjectCountText}
        onImageryNoteChange={setImageryNote}
        onImageryBadgeChange={setImageryBadge}
      />
      <ProjectSearchPanel
        projects={visibleProjects}
        selectedProjectId={selectedProject?.id}
        onProjectSelect={setSelectedProject}
      />
      <MapLegend
        isMenuOpen={isMapOptionsOpen}
        isLegendOpen={isLegendOpen}
        onMenuToggle={() => setIsMapOptionsOpen((current) => !current)}
        onLegendToggle={() => setIsLegendOpen((current) => !current)}
      />
      <ImageryBadge dateText={imageryBadge.dateText} sourceText={imageryBadge.sourceText} />
      <ProjectBottomSheet project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
