import { useMemo, useState } from 'react';
import { distanceMeters, distanceLabel, nearbyRadiusMeters, type UserLocation } from '../lib/nearby';
import { projectStatuses, statusClass, statusLabel, type Project, type ProjectStatus } from '../lib/projects';

type StatusFilter = ProjectStatus | 'all';

type ProjectSearchPanelProps = {
  projects: Project[];
  userLocation: UserLocation | null;
  allProjects: Project[];
  selectedProjectId?: string;
  selectedStatus: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  onProjectSelect: (project: Project) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All projects' },
  ...Object.entries(projectStatuses).map(([value, label]) => ({ value: value as ProjectStatus, label }))
];

export default function ProjectSearchPanel({
  projects,
  userLocation,
  allProjects,
  selectedProjectId,
  selectedStatus,
  onStatusChange,
  onProjectSelect,
  isOpen,
  onOpenChange: setIsOpen
}: ProjectSearchPanelProps) {
  const [query, setQuery] = useState('');

  const statusCounts = useMemo(() => {
    const counts = new Map<StatusFilter, number>([['all', allProjects.length]]);
    allProjects.forEach((project) => {
      counts.set(project.status, (counts.get(project.status) || 0) + 1);
    });
    return counts;
  }, [allProjects]);

  const orderedProjects = useMemo(() => {
    if (!userLocation) return projects;
    return [...projects].sort((a, b) => distanceMeters(userLocation, {lat: a.lat!, lng: a.lng!}) - distanceMeters(userLocation, {lat: b.lat!, lng: b.lng!}));
  }, [projects, userLocation]);
  const noNearbyCoverage = userLocation && !allProjects.some(p => distanceMeters(userLocation, {lat: p.lat!, lng: p.lng!}) <= nearbyRadiusMeters);
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return orderedProjects;

    return orderedProjects.filter((project) => [
      project.name,
      project.address,
      statusLabel(project.status),
      project.summary
    ].join(' ').toLowerCase().includes(normalizedQuery));
  }, [orderedProjects, query]);

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
            placeholder="Search projects or addresses"
            onFocus={() => setIsOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
          />
        </label>
        <button type="button" className="list-toggle" aria-expanded={isOpen} onClick={() => setIsOpen(!isOpen)}>
          List
        </button>
      </div>
      <div className="project-list" hidden={!isOpen}>
        <div className="project-list-meta">
          <strong>{userLocation ? "Nearest projects" : `${filteredProjects.length} projects`}</strong>
          <button type="button" onClick={() => setIsOpen(false)}>Done</button>
        </div>
        <div className="status-filter" aria-label="Filter projects by status">
          {statusFilterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={selectedStatus === option.value ? 'active' : undefined}
              aria-pressed={selectedStatus === option.value}
              onClick={() => {
                onStatusChange(option.value);
                setIsOpen(true);
              }}
            >
              <span>{option.label}</span>
              <span aria-hidden="true">{statusCounts.get(option.value) || 0}</span>
            </button>
          ))}
        </div>
        {noNearbyCoverage ? <p className="coverage-note">No mapped projects within 5 miles of this location yet. Current project coverage starts in St. Petersburg; the nearest known projects are listed below.</p> : null}
        {userLocation ? <p className="distance-note">Nearest first · straight-line distances{userLocation.accuracy > 200 ? ' · location is approximate' : ''}</p> : null}
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
                  <span className="view-details">{userLocation ? distanceLabel(distanceMeters(userLocation, {lat: project.lat!, lng: project.lng!})) : <span aria-hidden="true">↗</span>}</span>
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
