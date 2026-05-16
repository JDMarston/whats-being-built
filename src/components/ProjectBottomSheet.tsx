import { statusClass, statusLabel, type Project } from '../lib/projects';

type ProjectBottomSheetProps = {
  project: Project | null;
  onClose: () => void;
};

export default function ProjectBottomSheet({ project, onClose }: ProjectBottomSheetProps) {
  if (!project) return null;

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
      </div>
      <p>{project.summary}</p>
      {project.sources?.length ? (
        <div className="sheet-actions">
          {project.sources.slice(0, 2).map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}
