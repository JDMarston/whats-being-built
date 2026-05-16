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
    <>
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={isOpen}
        aria-controls="mapLegend"
        onClick={onToggle}
      >
        {isOpen ? 'Hide legend' : 'Show legend'}
      </button>
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
    </>
  );
}
