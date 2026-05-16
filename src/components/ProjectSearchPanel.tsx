import { useMemo, useState } from 'react';
import { statusClass, statusLabel, type Project } from '../lib/projects';

type ProjectSearchPanelProps = {
  projects: Project[];
  selectedProjectId?: string;
  onProjectSelect: (project: Project) => void;
};

export default function ProjectSearchPanel({ projects, selectedProjectId, onProjectSelect }: ProjectSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return projects;

    return projects.filter((project) => [
      project.name,
      project.address,
      statusLabel(project.status),
      project.summary
    ].join(' ').toLowerCase().includes(normalizedQuery));
  }, [projects, query]);

  function selectProject(project: Project) {
    onProjectSelect(project);
    setIsOpen(false);
  }

  return (
    <section className={`project-search-panel ${isOpen ? 'is-open' : ''}`} aria-label="Search projects">
      <div className="search-row">
        <label className="search-input-wrap">
          <span className="visually-hidden">Search projects</span>
          <input
            type="search"
            value={query}
            placeholder="Search projects"
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
          />
        </label>
        <button type="button" className="list-toggle" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)}>
          List
        </button>
      </div>
      <div className="project-list" hidden={!isOpen}>
        <div className="project-list-meta">
          <strong>{filteredProjects.length} projects</strong>
          <button type="button" onClick={() => setIsOpen(false)}>Done</button>
        </div>
        {filteredProjects.length ? (
          <ul>
            {filteredProjects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  className={project.id === selectedProjectId ? 'selected' : undefined}
                  onClick={() => selectProject(project)}
                >
                  <span className={`legend-dot ${statusClass(project.status)}`} aria-hidden="true" />
                  <span className="project-list-copy">
                    <strong>{project.name}</strong>
                    <span>{statusLabel(project.status)} · {project.address}</span>
                  </span>
                  <span className="view-details">View details</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-list">No projects match that search yet.</p>
        )}
      </div>
    </section>
  );
}
