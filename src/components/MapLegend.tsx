import { projectStatuses, type ProjectStatus } from '../lib/projects';

const legendStatuses: ProjectStatus[] = [
  'proposed',
  'approved',
  'under_construction',
  'recently_completed'
];

export default function MapLegend() {
  return (
    <aside className="map-legend" aria-label="Map legend">
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
  );
}
