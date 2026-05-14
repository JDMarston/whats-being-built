import { useMemo, useState } from 'react';
import HeaderControls, { type ImageryOption } from './components/HeaderControls';
import ImageryBadge from './components/ImageryBadge';
import MapView from './components/MapView';
import type { ImageryMode } from './lib/imageryLayers';
import { projects } from './lib/projects';

export default function App() {
  const [selectedImageryMode, setSelectedImageryMode] = useState<ImageryMode>('satellite');
  const [is3DEnabled, setIs3DEnabled] = useState(true);
  const [projectCountText, setProjectCountText] = useState('Loading projects');
  const [imageryNote, setImageryNote] = useState('Newest aerial imagery when available');
  const [imageryBadge, setImageryBadge] = useState({
    dateText: 'Imagery date loading',
    sourceText: 'Checking the current map view'
  });

  const imageryOptions = useMemo<ImageryOption[]>(() => [
    { value: 'satellite', label: 'Satellite' },
    { value: 'satellite-streets', label: 'Satellite + street map' },
    { value: 'street-map', label: 'Street map' }
  ], []);

  return (
    <div className="app-shell">
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
        projects={projects}
        selectedImageryMode={selectedImageryMode}
        is3DEnabled={is3DEnabled}
        onProjectCountChange={setProjectCountText}
        onImageryNoteChange={setImageryNote}
        onImageryBadgeChange={setImageryBadge}
      />
      <ImageryBadge dateText={imageryBadge.dateText} sourceText={imageryBadge.sourceText} />
    </div>
  );
}
