import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'data/source-registry.json',
  'data/staged-project-candidates.json',
  'scripts/ingest-sources.mjs'
];

const checks = [];

for (const file of requiredFiles) {
  checks.push([`${file} exists`, existsSync(file)]);
}

let registry = [];
if (existsSync('data/source-registry.json')) {
  registry = JSON.parse(readFileSync('data/source-registry.json', 'utf8'));
}

checks.push(['source registry has at least 3 source definitions', Array.isArray(registry) && registry.length >= 3]);
checks.push(['source registry prefers public/API/feed-friendly sources', registry.every((source) => (
  source.id &&
  source.name &&
  source.url &&
  ['open_data', 'public_page', 'rss', 'agenda'].includes(source.kind) &&
  source.scrapePolicy === 'respect_robots_and_terms'
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
checks.push(['staged candidates require manual review before publishing', candidates.every((candidate) => candidate.review_status === 'needs_review')]);
checks.push(['staged candidates include source links and confidence scores', candidates.every((candidate) => (
  requiredCandidateFields.every((field) => Object.hasOwn(candidate, field)) &&
  typeof candidate.source_url === 'string' &&
  candidate.source_url.startsWith('https://') &&
  typeof candidate.confidence === 'number' &&
  candidate.confidence >= 0 &&
  candidate.confidence <= 1
))]);
checks.push(['candidate IDs are unique', new Set(candidates.map((candidate) => candidate.id)).size === candidates.length]);

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
checks.push(['package.json exposes check:data script', packageJson.scripts?.['check:data'] === 'node scripts/check-data-ingestion.mjs']);
checks.push(['package.json exposes ingest:sources script', packageJson.scripts?.['ingest:sources'] === 'node scripts/ingest-sources.mjs']);

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`Data ingestion checks failed (${failed.length}/${checks.length}):`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`Data ingestion checks passed (${checks.length}/${checks.length})`);
