import { projectStatuses, type ProjectStatus } from '../lib/projects';

const legendStatuses: ProjectStatus[] = [
  'proposed',
  'approved',
  'under_construction',
  'recently_completed'
];

type MapLegendProps = {
  isMenuOpen: boolean;
  isLegendOpen: boolean;
  onMenuToggle: () => void;
  onLegendToggle: () => void;
};

export default function MapLegend({ isMenuOpen, isLegendOpen, onMenuToggle, onLegendToggle }: MapLegendProps) {
  const shouldShowLegend = isMenuOpen && isLegendOpen;

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
        <button type="button" className={`map-option-row ${isLegendOpen ? 'active' : ''}`} onClick={onLegendToggle}>
          <span>Legend</span>
          <span aria-hidden="true">{isLegendOpen ? 'Shown' : 'Hidden'}</span>
        </button>
      </div>
      <aside
        id="mapLegend"
        className={`map-legend ${shouldShowLegend ? 'is-open' : ''}`}
        aria-label="Map legend"
        hidden={!shouldShowLegend}
      >
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
