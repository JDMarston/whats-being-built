import { distanceMeters, distanceLabel, type UserLocation } from '../lib/nearby';
import { statusClass, statusLabel, type Project } from '../lib/projects';
type Props = { userLocation: UserLocation | null; project: Project | null; onClose: () => void };
export default function ProjectBottomSheet({ project, onClose, userLocation }: Props) {
  if (!project) return null;
  const sources = project.sources || [];
  return <section className="project-bottom-sheet" aria-label="Selected project details">
    <div className="sheet-handle" aria-hidden="true" />
    <div className="sheet-heading">
      <div><span className={`status-pill ${statusClass(project.status)}`}>{statusLabel(project.status)}</span><h2>{project.name}</h2></div>
      <button type="button" className="sheet-close" aria-label="Close project details" onClick={onClose}>×</button>
    </div>
    <p className="sheet-address">{project.address}{userLocation && project.lat !== null && project.lng !== null ? <span className="sheet-distance">{distanceLabel(distanceMeters(userLocation, {lat: project.lat, lng: project.lng}))} away · straight line</span> : null}</p>
    <p className="sheet-summary">{project.summary}</p>
    <div className="sheet-facts">
      {project.last_verified ? <span>Checked <strong>{project.last_verified}</strong></span> : <span>Check date unavailable</span>}
      {project.completed_at ? <span>Completed <strong>{project.completed_at}</strong></span> : project.expected_open ? <span>Expected <strong>{project.expected_open}</strong></span> : null}
    </div>
    {sources.length ? <div className="sheet-sources">
      <a className="sheet-primary-source" href={sources[0].url} target="_blank" rel="noopener noreferrer">Read source ↗ <span>{sources[0].label}</span></a>
      {sources.length > 1 ? <details className="sheet-more-sources"><summary>More sources ({sources.length - 1})</summary><ul className="sheet-source-list">
        {sources.slice(1).map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}
      </ul></details> : null}
    </div> : <p className="sheet-address">No published source yet.</p>}
  </section>;
}
