import { existsSync, readFileSync } from 'node:fs';

const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(path) {
  if (!existsSync(path)) {
    fail(`Missing ${path}`);
    return [];
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error.message}`);
    return [];
  }
}

function unique(values) {
  return new Set(values).size === values.length;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function sameSourceHost(value, sourceUrl) {
  try {
    const hostname = new URL(value).hostname;
    const sourceHostname = new URL(sourceUrl).hostname;
    return hostname === sourceHostname
      || hostname === `www.${sourceHostname}`
      || sourceHostname === `www.${hostname}`;
  } catch {
    return false;
  }
}

const projects = readJson('projects.json');
const candidates = readJson('data/staged-project-candidates.json');
const sources = readJson('data/source-registry.json');
const areas = readJson('data/area-registry.json');
const providers = readJson('data/geocoding-provider-registry.json');

if (!Array.isArray(projects) || projects.length === 0) fail('projects.json must contain projects');
if (!Array.isArray(candidates) || candidates.length === 0) fail('staged candidates must not be empty');
if (!Array.isArray(sources) || sources.length === 0) fail('source registry must not be empty');
if (!Array.isArray(areas) || areas.length === 0) fail('area registry must not be empty');
if (!Array.isArray(providers) || providers.length === 0) fail('geocoding provider registry must not be empty');

const projectStatuses = new Set(['proposed', 'approved', 'under_construction', 'recently_completed']);
const projectFields = ['id', 'name', 'address', 'lat', 'lng', 'status', 'last_verified', 'summary', 'sources'];

for (const project of projects) {
  for (const field of projectFields) {
    if (!Object.hasOwn(project, field)) fail(`Project ${project.id || '(unknown)'} is missing ${field}`);
  }
  if (!projectStatuses.has(project.status)) fail(`Project ${project.id} has invalid status ${project.status}`);
  if (!validCoordinates(project.lat, project.lng)) fail(`Project ${project.id} needs valid coordinates`);
  if (!Array.isArray(project.sources) || project.sources.length === 0) fail(`Project ${project.id} needs at least one source`);
  for (const source of project.sources || []) {
    if (!source.label || !validUrl(source.url)) fail(`Project ${project.id} has an invalid source`);
  }
}
if (!unique(projects.map((project) => project.id))) fail('Project IDs must be unique');

const areaIds = new Set(areas.map((area) => area.id));
for (const area of areas) {
  if (!area.id || !area.name || !area.country) fail('Every area needs an id, name, and country');
  if (area.bbox !== null && (!Array.isArray(area.bbox) || area.bbox.length !== 4 || area.bbox.some((value) => typeof value !== 'number'))) {
    fail(`Area ${area.id} has an invalid bbox`);
  }
}

const sourceKinds = new Set(['open_data', 'public_page', 'rss', 'agenda']);
for (const source of sources) {
  if (!source.id || !source.name || !validUrl(source.url)) fail('Every source needs an id, name, and HTTPS URL');
  if (!areaIds.has(source.area_id)) fail(`Source ${source.id} refers to unknown area ${source.area_id}`);
  if (!sourceKinds.has(source.kind)) fail(`Source ${source.id} has invalid kind ${source.kind}`);
  if (source.scrapePolicy !== 'respect_robots_and_terms') fail(`Source ${source.id} needs the standard scrape policy`);
  if (!source.adapter) fail(`Source ${source.id} needs an adapter name`);
}
if (!unique(sources.map((source) => source.id))) fail('Source IDs must be unique');

const reviewStatuses = new Set(['needs_review', 'promoted', 'rejected', 'duplicate']);
const candidateFields = ['id', 'source_id', 'source_url', 'area_id', 'name', 'address', 'status', 'summary', 'confidence', 'review_status', 'last_seen'];
const sourceById = new Map(sources.map((source) => [source.id, source]));
const sourceIds = new Set(sourceById.keys());
const projectIds = new Set(projects.map((project) => project.id));

for (const candidate of candidates) {
  for (const field of candidateFields) {
    if (!Object.hasOwn(candidate, field)) fail(`Candidate ${candidate.id || '(unknown)'} is missing ${field}`);
  }
  if (!sourceIds.has(candidate.source_id)) fail(`Candidate ${candidate.id} refers to unknown source ${candidate.source_id}`);
  if (!areaIds.has(candidate.area_id)) fail(`Candidate ${candidate.id} refers to unknown area ${candidate.area_id}`);
  if (!validUrl(candidate.source_url)) {
    fail(`Candidate ${candidate.id} has an invalid source URL`);
  } else {
    const registeredSource = sourceById.get(candidate.source_id);
    if (registeredSource && !sameSourceHost(candidate.source_url, registeredSource.url)) {
      fail(`Candidate ${candidate.id} points outside its registered source host`);
    }
  }
  if (candidate.image_url !== null && candidate.image_url !== undefined && !validUrl(candidate.image_url)) {
    fail(`Candidate ${candidate.id} has an invalid image URL`);
  }
  if (!projectStatuses.has(candidate.status)) fail(`Candidate ${candidate.id} has invalid status ${candidate.status}`);
  if (typeof candidate.confidence !== 'number' || candidate.confidence < 0 || candidate.confidence > 1) fail(`Candidate ${candidate.id} has invalid confidence`);
  if (!reviewStatuses.has(candidate.review_status)) fail(`Candidate ${candidate.id} has invalid review status`);
  if (candidate.review_status === 'promoted') {
    if (!validCoordinates(candidate.lat, candidate.lng)) fail(`Promoted candidate ${candidate.id} needs valid coordinates`);
    if (!projectIds.has(candidate.promoted_project_id)) fail(`Promoted candidate ${candidate.id} does not point to a map project`);
  }
  if (candidate.review_status === 'duplicate' && !projectIds.has(candidate.duplicate_of_project_id)) {
    fail(`Duplicate candidate ${candidate.id} does not point to a map project`);
  }
}
if (!unique(candidates.map((candidate) => candidate.id))) fail('Candidate IDs must be unique');
if (!candidates.some((candidate) => candidate.review_status === 'needs_review')) fail('The review queue is unexpectedly empty');

for (const provider of providers) {
  if (!provider.id || !provider.name || typeof provider.enabled !== 'boolean') fail('Every geocoder needs an id, name, and enabled flag');
  if (!validUrl(provider.endpoint)) fail(`Geocoder ${provider.id || '(unknown)'} needs a credential-free HTTPS endpoint`);
  if (provider.id === 'nominatim' && validUrl(provider.endpoint) && new URL(provider.endpoint).hostname !== 'nominatim.openstreetmap.org') {
    fail('Nominatim endpoint must use nominatim.openstreetmap.org');
  }
  if (typeof provider.minimumConfidence !== 'number' || provider.minimumConfidence < 0 || provider.minimumConfidence > 1) {
    fail(`Geocoder ${provider.id} has an invalid confidence floor`);
  }
  if (!provider.bounds || !Array.isArray(provider.bounds.bbox) || provider.bounds.bbox.length !== 4) {
    fail(`Geocoder ${provider.id} needs a four-value bbox`);
  }
}
if (!providers.some((provider) => provider.id === 'nominatim' && provider.enabled)) fail('Nominatim should be the enabled fallback geocoder');

if (errors.length) {
  console.error(`Data check failed with ${errors.length} problem${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Data check passed: ${projects.length} map projects, ${candidates.length} staged candidates, ${sources.length} sources, ${areas.length} areas.`);
