import rawProjects from '../../projects.json';

export const projectStatuses = {
  proposed: 'Proposed',
  approved: 'Approved',
  under_construction: 'Under construction',
  recently_completed: 'Recently completed'
} as const;

export type ProjectStatus = keyof typeof projectStatuses;

export type ProjectSource = {
  label: string;
  url: string;
};

export type Project = {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: ProjectStatus;
  completed_at: string | null;
  built?: string | null;
  expected_open: string | null;
  last_verified: string | null;
  summary: string;
  sources: ProjectSource[];
};

const statusAliases: Record<string, ProjectStatus> = {
  completed: 'recently_completed',
  'recently completed': 'recently_completed',
  recently_completed: 'recently_completed',
  'under construction': 'under_construction',
  under_construction: 'under_construction',
  approved: 'approved',
  proposed: 'proposed'
};

export function normalizeProjectStatus(status: string): ProjectStatus {
  const normalized = status.trim().toLowerCase().replaceAll('-', ' ').replaceAll('_', ' ');
  const canonicalStatus = statusAliases[normalized];
  if (!canonicalStatus) {
    throw new Error(`Unsupported project status: ${status}`);
  }
  return canonicalStatus;
}

export function statusLabel(status: ProjectStatus): string {
  return projectStatuses[status];
}

export function projectStatusLabel(status: ProjectStatus): string {
  return statusLabel(status);
}

export function statusClass(status: ProjectStatus): string {
  return `status-${status.replaceAll('_', '-')}`;
}

export function projectStatusClass(status: ProjectStatus): string {
  return statusClass(status);
}

function completionDateForCutoff(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (/^\d{4}$/.test(value)) {
    return new Date(Number(value), 11, 31);
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function shouldShowProject(project: Project): boolean {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const completionDate = completionDateForCutoff(project.completed_at || project.built);
  if (!completionDate) return true;
  return completionDate >= twoYearsAgo;
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    status: normalizeProjectStatus(project.status)
  };
}

export const projects = (rawProjects as Project[]).map(normalizeProject);
