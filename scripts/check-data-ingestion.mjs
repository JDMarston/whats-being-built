import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'data/source-registry.json',
  'data/staged-project-candidates.json',
  'data/geocoding-provider-registry.json',
  'data/area-registry.json',
  'scripts/ingest-sources.mjs',
  'scripts/review-candidates.mjs',
  'scripts/geocode-candidates.mjs',
  'src/lib/stagedCandidates.ts',
  'src/components/DataReviewDashboard.tsx'
];

const checks = [];

for (const file of requiredFiles) {
  checks.push([`${file} exists`, existsSync(file)]);
}

let registry = [];
if (existsSync('data/source-registry.json')) {
  registry = JSON.parse(readFileSync('data/source-registry.json', 'utf8'));
}

let areas = [];
if (existsSync('data/area-registry.json')) {
  areas = JSON.parse(readFileSync('data/area-registry.json', 'utf8'));
}

checks.push(['source registry has at least 5 source definitions', Array.isArray(registry) && registry.length >= 5]);
checks.push(['area registry defines starter and worldwide scope', Array.isArray(areas) && areas.some((area) => area.id === 'st-pete-fl' && area.role === 'starter_area') && areas.some((area) => area.id === 'global' && area.role === 'product_scope')]);
checks.push(['source registry prefers public/API/feed-friendly sources', registry.every((source) => (
  source.id &&
  source.name &&
  source.url &&
  ['open_data', 'public_page', 'rss', 'agenda'].includes(source.kind) &&
  source.scrapePolicy === 'respect_robots_and_terms' &&
  source.area_id &&
  source.adapter &&
  source.promotionMode === 'manual_review'
))]);

let candidates = [];
if (existsSync('data/staged-project-candidates.json')) {
  candidates = JSON.parse(readFileSync('data/staged-project-candidates.json', 'utf8'));
}

const requiredCandidateFields = [
  'id',
  'source_id',
  'source_url',
  'name',
  'address',
  'status',
  'summary',
  'confidence',
  'review_status',
  'last_seen'
];

checks.push(['staged candidates has at least 5 entries', Array.isArray(candidates) && candidates.length >= 5]);
checks.push(['address-like project names are copied into candidate address for review', candidates.filter((candidate) => /\d+\s+/.test(candidate.name)).every((candidate) => candidate.address === `${candidate.name}, St. Petersburg, FL`)]);
const validReviewStatuses = new Set(['needs_review', 'promoted', 'rejected', 'duplicate']);
checks.push(['staged candidates use valid review statuses', candidates.every((candidate) => validReviewStatuses.has(candidate.review_status))]);
checks.push(['promoted staged candidates include map coordinates and promoted project id', candidates
  .filter((candidate) => candidate.review_status === 'promoted')
  .every((candidate) => (
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    typeof candidate.promoted_project_id === 'string' &&
    candidate.promoted_project_id.length > 0
  ))]);
checks.push(['duplicate staged candidates link to an existing project id', candidates
  .filter((candidate) => candidate.review_status === 'duplicate')
  .every((candidate) => typeof candidate.duplicate_of_project_id === 'string' && candidate.duplicate_of_project_id.length > 0)]);
checks.push(['staged candidates include source links, area ids, and confidence scores', candidates.every((candidate) => (
  requiredCandidateFields.every((field) => Object.hasOwn(candidate, field)) &&
  typeof candidate.source_url === 'string' &&
  typeof candidate.area_id === 'string' &&
  candidate.source_url.startsWith('https://') &&
  typeof candidate.confidence === 'number' &&
  candidate.confidence >= 0 &&
  candidate.confidence <= 1
))]);
checks.push(['candidate IDs are unique', new Set(candidates.map((candidate) => candidate.id)).size === candidates.length]);

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
checks.push(['package.json exposes check:data script', packageJson.scripts?.['check:data'] === 'node scripts/check-data-ingestion.mjs']);
checks.push(['package.json exposes ingest:sources script', packageJson.scripts?.['ingest:sources'] === 'node scripts/ingest-sources.mjs']);
checks.push(['package.json exposes review:candidates script', packageJson.scripts?.['review:candidates'] === 'node scripts/review-candidates.mjs']);
checks.push(['package.json exposes geocode:candidates script', packageJson.scripts?.['geocode:candidates'] === 'node scripts/geocode-candidates.mjs']);

let geocodingProviders = [];
if (existsSync('data/geocoding-provider-registry.json')) {
  geocodingProviders = JSON.parse(readFileSync('data/geocoding-provider-registry.json', 'utf8'));
}
checks.push(['geocoding registry has a free default provider and paid upgrade slots', Array.isArray(geocodingProviders) && geocodingProviders.some((provider) => provider.id === 'nominatim' && provider.tier === 'free') && geocodingProviders.some((provider) => provider.tier === 'paid_upgrade')]);
checks.push(['geocoding providers define confidence floors and St. Pete bounds', geocodingProviders.every((provider) => (
  provider.id &&
  provider.name &&
  provider.enabled !== undefined &&
  typeof provider.minimumConfidence === 'number' &&
  provider.minimumConfidence >= 0.7 &&
  provider.minimumConfidence <= 1 &&
  provider.bounds?.city === 'St. Petersburg' &&
  Array.isArray(provider.bounds?.bbox) &&
  provider.bounds.bbox.length === 4
))]);

if (existsSync('scripts/review-candidates.mjs')) {
  const reviewScript = readFileSync('scripts/review-candidates.mjs', 'utf8');
  checks.push(['review script supports list/show/promote/reject/duplicate actions', ['list', 'show', 'promote', 'reject', 'duplicate'].every((action) => reviewScript.includes(`case '${action}':`))]);
  checks.push(['review script reads staged candidates and live projects', reviewScript.includes('data/staged-project-candidates.json') && reviewScript.includes('projects.json')]);
  checks.push(['review script protects live map by requiring lat/lng before promote', reviewScript.includes('lat') && reviewScript.includes('lng') && reviewScript.includes('Cannot promote')]);
  checks.push(['review script can mark candidate duplicate of existing project', reviewScript.includes('duplicate_of_project_id') && reviewScript.includes("review_status: 'duplicate'")]);
}

if (existsSync('scripts/geocode-candidates.mjs')) {
  const geocodeScript = readFileSync('scripts/geocode-candidates.mjs', 'utf8');
  checks.push(['geocode script is dry-run by default and requires --apply to write', geocodeScript.includes('--apply') && geocodeScript.includes('dry run')]);
  checks.push(['geocode script reads staged candidates and provider registry', geocodeScript.includes('data/staged-project-candidates.json') && geocodeScript.includes('data/geocoding-provider-registry.json')]);
  checks.push(['geocode script stores confidence audit fields', ['geocode_status', 'geocode_confidence', 'geocode_provider', 'geocode_result_label'].every((field) => geocodeScript.includes(field))]);
  checks.push(['geocode script respects provider minimum confidence before assigning coordinates', geocodeScript.includes('minimumConfidence') && geocodeScript.includes('needs_manual_review')]);
  checks.push(['geocode script skips reviewed candidates unless explicitly requested', geocodeScript.includes("!includeReviewed && candidate.review_status !== 'needs_review'") && geocodeScript.includes('--include-reviewed')]);
}

if (existsSync('scripts/ingest-sources.mjs')) {
  const ingestScript = readFileSync('scripts/ingest-sources.mjs', 'utf8');
  checks.push(['ingest script fetches candidate detail pages for enrichment', ingestScript.includes('enrichCandidateFromDetailPage') && ingestScript.includes('fetchDetailPages')]);
  checks.push(['ingest script uses area registry and adapter keys for city expansion', ingestScript.includes('areaRegistryPath') && ingestScript.includes('source.adapter || source.id') && ingestScript.includes('area_id')]);
  checks.push(['ingest detail enrichment extracts address, developer, and article text', ['extracted_address', 'developer', 'detail_excerpt'].every((field) => ingestScript.includes(field))]);
  checks.push(['ingest detail enrichment preserves review state for existing candidates', ingestScript.includes('mergeExistingReviewState') && ingestScript.includes('review_status')]);
}

checks.push(['staged candidates include detail enrichment audit fields', candidates.every((candidate) => (
  Object.hasOwn(candidate, 'detail_fetched_at') &&
  Object.hasOwn(candidate, 'detail_excerpt') &&
  Object.hasOwn(candidate, 'extracted_address') &&
  Object.hasOwn(candidate, 'developer')
))]);
checks.push(['at least one staged candidate has address or developer extracted from a detail page', candidates.some((candidate) => candidate.extracted_address || candidate.developer)]);
checks.push(['staged queue keeps manual review work visible', candidates.some((candidate) => candidate.review_status === 'needs_review')]);

if (existsSync('src/lib/stagedCandidates.ts')) {
  const stagedCandidateLib = readFileSync('src/lib/stagedCandidates.ts', 'utf8');
  checks.push(['staged candidate library exposes dashboard stats and priority helpers', ['stagedCandidateStats', 'reviewPriority', 'getNeedsReviewCandidates'].every((symbol) => stagedCandidateLib.includes(symbol))]);
}

if (existsSync('src/components/DataReviewDashboard.tsx')) {
  const dashboard = readFileSync('src/components/DataReviewDashboard.tsx', 'utf8');
  checks.push(['data review dashboard surfaces source, confidence, geocode, and detail audit fields', ['source_url', 'confidence', 'geocode_status', 'detail_excerpt'].every((field) => dashboard.includes(field))]);
}

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`Data ingestion checks failed (${failed.length}/${checks.length}):`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Data ingestion checks passed (${checks.length}/${checks.length})`);
