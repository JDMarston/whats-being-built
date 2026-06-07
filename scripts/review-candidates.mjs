import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const candidatesPath = 'data/staged-project-candidates.json';
const projectsPath = 'projects.json';
const validStatuses = new Set(['proposed', 'approved', 'under_construction', 'recently_completed']);
const validReviewStatuses = new Set(['needs_review', 'promoted', 'rejected', 'duplicate']);

function readJson(path) {
  if (!existsSync(path)) throw new Error(`Missing ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '').toLowerCase();
}

function sourceUrlsForProject(project) {
  return new Set((project.sources || []).map((source) => normalizeUrl(source.url)).filter(Boolean));
}

function findCandidate(candidates, candidateId) {
  const candidate = candidates.find((item) => item.id === candidateId);
  if (!candidate) throw new Error(`Candidate not found: ${candidateId}`);
  return candidate;
}

function findProject(projects, projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error(`Project not found: ${projectId}`);
  return project;
}

function duplicateHints(candidate, projects) {
  const candidateSlug = slugify(candidate.name);
  const candidateUrl = normalizeUrl(candidate.source_url);
  return projects
    .map((project) => {
      const reasons = [];
      if (slugify(project.name) === candidateSlug || project.id === candidateSlug || project.id === candidate.id) {
        reasons.push('name/id slug');
      }
      if (candidateUrl && sourceUrlsForProject(project).has(candidateUrl)) {
        reasons.push('source URL');
      }
      return reasons.length ? { id: project.id, name: project.name, reasons } : null;
    })
    .filter(Boolean);
}

function assertCanPromote(candidate) {
  const missing = [];
  for (const field of ['id', 'name', 'address', 'status', 'summary', 'last_seen', 'source_url']) {
    if (!candidate[field]) missing.push(field);
  }
  if (typeof candidate.lat !== 'number') missing.push('lat');
  if (typeof candidate.lng !== 'number') missing.push('lng');
  if (!validStatuses.has(candidate.status)) missing.push('valid status');
  if (missing.length) {
    throw new Error(`Cannot promote ${candidate.id}; missing/invalid: ${missing.join(', ')}`);
  }
}

function toLiveProject(candidate) {
  return {
    id: slugify(candidate.name) || candidate.id,
    name: candidate.name,
    address: candidate.address,
    lat: candidate.lat,
    lng: candidate.lng,
    status: candidate.status,
    completed_at: null,
    expected_open: null,
    last_verified: candidate.last_seen,
    summary: candidate.summary,
    sources: [
      {
        label: candidate.source_name || candidate.source_id || 'Source',
        url: candidate.source_url
      }
    ]
  };
}

function touchReview(candidate, patch) {
  Object.assign(candidate, patch, { reviewed_at: new Date().toISOString().slice(0, 10) });
}

function printCandidateLine(candidate, projects) {
  const hints = duplicateHints(candidate, projects);
  const geo = typeof candidate.lat === 'number' && typeof candidate.lng === 'number' ? `${candidate.lat.toFixed(5)},${candidate.lng.toFixed(5)}` : 'needs coords';
  const dupe = hints.length ? ` | possible duplicate: ${hints.map((hint) => hint.id).join(', ')}` : '';
  console.log(`${candidate.id} | ${candidate.review_status} | ${geo} | ${candidate.name}${dupe}`);
}

function loadState() {
  const candidates = readJson(candidatesPath);
  const projects = readJson(projectsPath);
  if (!Array.isArray(candidates)) throw new Error(`${candidatesPath} must be an array`);
  if (!Array.isArray(projects)) throw new Error(`${projectsPath} must be an array`);
  for (const candidate of candidates) {
    if (!validReviewStatuses.has(candidate.review_status)) {
      throw new Error(`Invalid review_status for ${candidate.id}: ${candidate.review_status}`);
    }
  }
  return { candidates, projects };
}

function usage() {
  console.log(`Usage:
  node scripts/review-candidates.mjs list
  node scripts/review-candidates.mjs show <candidate-id>
  node scripts/review-candidates.mjs promote <candidate-id>
  node scripts/review-candidates.mjs reject <candidate-id> [reason]
  node scripts/review-candidates.mjs duplicate <candidate-id> <existing-project-id>

Notes:
  promote requires valid lat/lng and required live-map fields.
  list only shows candidates with review_status=needs_review.`);
}

const [action = 'list', candidateId, extra] = process.argv.slice(2);

try {
  const { candidates, projects } = loadState();

  switch (action) {
    case 'list': {
      const pending = candidates.filter((candidate) => candidate.review_status === 'needs_review');
      if (!pending.length) {
        console.log('No candidates need review.');
        break;
      }
      for (const candidate of pending) printCandidateLine(candidate, projects);
      break;
    }
    case 'show': {
      if (!candidateId) throw new Error('show requires <candidate-id>');
      const candidate = findCandidate(candidates, candidateId);
      console.log(JSON.stringify({ candidate, duplicate_hints: duplicateHints(candidate, projects) }, null, 2));
      break;
    }
    case 'promote': {
      if (!candidateId) throw new Error('promote requires <candidate-id>');
      const candidate = findCandidate(candidates, candidateId);
      assertCanPromote(candidate);
      const project = toLiveProject(candidate);
      if (projects.some((existing) => existing.id === project.id)) {
        throw new Error(`Cannot promote ${candidate.id}; live project id already exists: ${project.id}`);
      }
      projects.push(project);
      touchReview(candidate, { review_status: 'promoted', promoted_project_id: project.id });
      writeJson(projectsPath, projects);
      writeJson(candidatesPath, candidates);
      console.log(`Promoted ${candidate.id} -> ${project.id}`);
      break;
    }
    case 'reject': {
      if (!candidateId) throw new Error('reject requires <candidate-id>');
      const candidate = findCandidate(candidates, candidateId);
      touchReview(candidate, { review_status: 'rejected', review_note: extra || 'Rejected during manual review.' });
      writeJson(candidatesPath, candidates);
      console.log(`Rejected ${candidate.id}`);
      break;
    }
    case 'duplicate': {
      if (!candidateId || !extra) throw new Error('duplicate requires <candidate-id> <existing-project-id>');
      const candidate = findCandidate(candidates, candidateId);
      const project = findProject(projects, extra);
      touchReview(candidate, {
        review_status: 'duplicate',
        duplicate_of: project.id,
        duplicate_of_project_id: project.id
      });
      writeJson(candidatesPath, candidates);
      console.log(`Marked ${candidate.id} as duplicate of ${project.id}`);
      break;
    }
    case 'help':
    case '--help': {
      usage();
      break;
    }
    default:
      usage();
      throw new Error(`Unknown action: ${action}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
