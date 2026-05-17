import type { ImageryMode } from '../lib/imageryLayers';
import { projectStatuses, type ProjectStatus } from '../lib/projects';

export type ImageryOption = {
  value: ImageryMode;
  label: string;
};

const legendStatuses: ProjectStatus[] = [
  'proposed',
  'approved',
  'under_construction',
  'recently_completed'
];

type MapLegendProps = {
  imageryOptions: ImageryOption[];
  selectedImageryMode: ImageryMode;
  is3DEnabled: boolean;
  isMenuOpen: boolean;
  isLegendOpen: boolean;
  onImageryChange: (mode: ImageryMode) => void;
  on3DToggle: () => void;
  onMenuToggle: () => void;
  onLegendToggle: () => void;
};

export default function MapLegend({
  imageryOptions,
  selectedImageryMode,
  is3DEnabled,
  isMenuOpen,
  isLegendOpen,
  onImageryChange,
  on3DToggle,
  onMenuToggle,
  onLegendToggle
}: MapLegendProps) {
  return (
    <section className={`map-options ${isMenuOpen ? 'is-open' : ''}`} aria-label="Map options">
      <button
        type="button"
        className="map-options-toggle"
        aria-label="Map options"
        aria-expanded={isMenuOpen}
        aria-controls="mapOptionsPanel"
        onClick={onMenuToggle}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <div id="mapOptionsPanel" className="map-options-panel" hidden={!isMenuOpen}>
        <strong>Map options</strong>
        <label className="map-option-field">
          <span>Imagery mode</span>
          <select
            aria-label="Imagery mode"
            value={selectedImageryMode}
            onChange={(event) => onImageryChange(event.target.value as ImageryMode)}
          >
            {imageryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`map-option-row ${is3DEnabled ? 'active' : ''}`}
          aria-pressed={is3DEnabled}
          onClick={on3DToggle}
        >
          <span>3D buildings</span>
          <span aria-hidden="true">{is3DEnabled ? 'On' : 'Off'}</span>
        </button>
        <button type="button" className={`map-option-row ${isLegendOpen ? 'active' : ''}`} onClick={onLegendToggle}>
          <span>Legend</span>
          <span aria-hidden="true">{isLegendOpen ? 'Shown' : 'Hidden'}</span>
        </button>
      </div>
      <aside id="mapLegend" className={`map-legend ${isLegendOpen ? 'is-open' : ''}`} aria-label="Map legend">
        <strong>Map legend</strong>
        <ul>
          {legendStatuses.map((status) => (
            <li key={status}>
              <span className={`legend-dot status-${status.replaceAll('_', '-')}`} aria-hidden="true" />
              <span>{projectStatuses[status]}</span>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}
