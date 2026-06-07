import { statusClass, statusLabel, type Project } from '../lib/projects';

type ProjectBottomSheetProps = {
  project: Project | null;
  onClose: () => void;
};

export default function ProjectBottomSheet({ project, onClose }: ProjectBottomSheetProps) {
  if (!project) return null;

  const sourceCountText = `${project.sources?.length || 0} source${project.sources?.length === 1 ? '' : 's'}`;

  return (
    <section className="project-bottom-sheet" aria-label="Selected project details">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-heading">
        <div>
          <span className={`status-pill ${statusClass(project.status)}`}>{statusLabel(project.status)}</span>
          <h2>{project.name}</h2>
        </div>
        <button type="button" className="sheet-close" aria-label="Close project details" onClick={onClose}>×</button>
      </div>
      <div className="sheet-details">
        <span><strong>Address:</strong> {project.address}</span>
        {project.expected_open ? <span><strong>Expected:</strong> {project.expected_open}</span> : null}
        {project.completed_at ? <span><strong>Completed:</strong> {project.completed_at}</span> : null}
        {project.last_verified ? <span><strong>Verified:</strong> {project.last_verified}</span> : null}
        <span><strong>Sources:</strong> {sourceCountText}</span>
        {project.locationAccuracyMeters ? <span><strong>GPS accuracy:</strong> ±{Math.round(project.locationAccuracyMeters)}m</span> : null}
      </div>
      {project.photoDataUrl ? <img className="sheet-photo" src={project.photoDataUrl} alt={`${project.name} field capture`} /> : null}
      <p className="sheet-summary">{project.summary}</p>
      {project.sources?.length ? (
        <div className="sheet-sources">
          <div className="sheet-section-heading">
            <strong>Sources</strong>
            <span>{sourceCountText}</span>
          </div>
          <ul className="sheet-source-list">
            {project.sources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
