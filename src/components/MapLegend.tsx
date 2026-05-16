import { projectStatuses, type ProjectStatus } from '../lib/projects';

const legendStatuses: ProjectStatus[] = [
  'proposed',
  'approved',
  'under_construction',
  'recently_completed'
];

type MapLegendProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export default function MapLegend({ isOpen, onToggle }: MapLegendProps) {
  return (
    <section className={`map-options ${isOpen ? 'is-open' : ''}`} aria-label="Map options">
      <button
        type="button"
        className="map-options-toggle"
        aria-label="Map options"
        aria-expanded={isOpen}
        aria-controls="mapOptionsPanel"
        onClick={onToggle}
      >
        <span aria-hidden="true">☰</span>
      </button>
      <div id="mapOptionsPanel" className="map-options-panel" hidden={!isOpen}>
        <strong>Map options</strong>
        <button type="button" className="map-option-row active" onClick={onToggle}>
          <span>Legend</span>
          <span aria-hidden="true">Shown</span>
        </button>
      </div>
      <aside id="mapLegend" className={`map-legend ${isOpen ? 'is-open' : ''}`} aria-label="Map legend">
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
